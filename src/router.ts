import * as mime from "@std/media-types";
import * as path from "jsr:@std/path";
import { MimeType } from "./mimetypes.ts";
import Handlebars from "npm:handlebars";

export type RouteHandler = (
  request: Request,
  groups: Record<string, string | undefined>,
) => Response | Promise<Response>;

export interface RouteBody {
  accepts: {
    POST?: boolean;
    GET?: boolean;
    PATCH?: boolean;
    PUT?: boolean;
    DELETE?: boolean;
  };
  handler: RouteHandler;
}

export type RouteErrorHandlerProps = { status: number; statusText: string };

export type RouteErrorHandler = (data: RouteErrorHandlerProps) => Response;

const routes: Map<string, RouteBody> = new Map();

let errorPage: RouteErrorHandler | null = null;

export function setErrorPage(template: HandlebarsTemplateDelegate) {
  errorPage = (props) => {
    const content = template(props);
    return new Response(content, {
      headers: {
        "content-type": "text/html",
      },
      status: props.status,
      statusText: props.statusText,
    });
  };
}

function sendError(data: RouteErrorHandlerProps, sendHtml = true) {
  if (sendHtml && errorPage) {
    return errorPage(data);
  }
  return new Response(JSON.stringify(data), {
    status: data.status,
    statusText: data.statusText,
  });
}
export type TemplateContext = Record<string, unknown>;
export function templ(
  uri: `/${string}`,
  content: string | Handlebars.TemplateDelegate,
  data: TemplateContext | (() => TemplateContext) = {},
) {
  const template = content instanceof Function
    ? content
    : Handlebars.compile(content);
  return get(uri, (req, groups) => {
    const context = typeof data == "function" ? data() : data;
    const compiled = template({ request: req, groups: groups, ...context });
    return new Response(compiled, {
      headers: {
        "content-type": MimeType.Html,
      },
    });
  });
}
export function get(
  uri: `/${string}`,
  content: string | RouteHandler,
  type = "text/html",
) {
  if (typeof content == "string") {
    routes.set(uri, {
      accepts: {
        GET: true,
      },
      handler() {
        return new Response(content, {
          headers: {
            "content-type": type,
          },
          status: 200,
        });
      },
    });
    return;
  }
  routes.set(uri, {
    accepts: {
      GET: true,
    },
    handler: content,
  });
}

export function post(
  uri: `/${string}`,
  content: RouteHandler,
) {
  routes.set(uri, {
    accepts: {
      GET: true,
    },
    handler: content,
  });
}

const error404 = (sendHtml: boolean = true) =>
  sendError({ statusText: "Not Found", status: 404 }, sendHtml);
const error500 = (sendHtml: boolean = true) =>
  sendError({ statusText: "Internal Error", status: 500 }, sendHtml);
const error405 = (sendHtml: boolean = true) =>
  sendError({ statusText: "Method not allowed", status: 405 }, sendHtml);

export async function serve(
  request: Request,
): Promise<Response> {
  const route = new URL(request.url).pathname;

  const type = mime.contentType(path.extname(route));

  const sendHtmlError = request.headers.get("Accept")?.includes(MimeType.Html);

  /**
   * Checks if its not a file request if it isnt it will call the handler
   * This is done so to allow handling of routes while also allowing resources to be
   */
  if (type === undefined) {
    const handler = routes.get(route);
    if (handler === undefined) {
      return error404(sendHtmlError);
    }
    const routePattern = new URLPattern({ pathname: route }).exec(request.url);
    if (routePattern === null) {
      return error404(sendHtmlError);
    }
    if (request.method == "GET" && !handler.accepts.GET) {
      return error405(sendHtmlError);
    }
    if (request.method == "POST" && !handler.accepts.POST) {
      return error405(sendHtmlError);
    }
    if (request.method == "DELETE" && !handler.accepts.DELETE) {
      return error405(sendHtmlError);
    }
    if (request.method == "PUT" && !handler.accepts.PUT) {
      return error405(sendHtmlError);
    }
    if (request.method == "PATCH" && !handler.accepts.PATCH) {
      return error405(sendHtmlError);
    }
    return handler.handler(request, routePattern.pathname.groups);
  }
  try {
    const routePath = "./pub" + route;
    const file = await Deno.open(routePath);

    return new Response(file.readable, {
      headers: {
        "content-type": type,
      },
    });
  } catch (ex) {
    if (ex instanceof Deno.errors.NotFound) {
      return error404(sendHtmlError);
    }
    if (ex instanceof Error) {
      return error500(sendHtmlError);
    }
    return error500(sendHtmlError);
  }
}
