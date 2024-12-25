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
  accepts: RouteBody["accepts"] | Array<keyof RouteBody["accepts"]> = {
    GET: true,
  },
) {
  const template = content instanceof Function
    ? content
    : Handlebars.compile(content);
  return pattern(accepts, uri, (req, groups) => {
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
  return;
}
export function post(
  content: RouteHandler,
  uri: `/${string}`,
) {
  pattern({ POST: true }, uri, content);
}
export function del(
  content: RouteHandler,
  uri: `/${string}`,
) {
  pattern({ DELETE: true }, uri, content);
}
export function put(
  content: RouteHandler,
  uri: `/${string}`,
) {
  pattern({ PUT: true }, uri, content);
}
export function patch(
  content: RouteHandler,
  uri: `/${string}`,
) {
  pattern({ PATCH: true }, uri, content);
}
export function any(
  uri: `/${string}`,
  content: RouteHandler,
) {
  routes.set(uri, {
    accepts: {
      POST: true,
      GET: true,
      PUT: true,
      DELETE: true,
      PATCH: true,
    },
    handler: content,
  });
}
export function obj(
  uri: `/${string}`,
  content: {
    POST?: RouteHandler;
    GET?: RouteHandler;
    PATCH?: RouteHandler;
    DELETE?: RouteHandler;
    PUT?: RouteHandler;
  },
) {
  routes.set(uri, {
    accepts: {
      POST: content.POST !== undefined,
      GET: content.GET !== undefined,
      PUT: content.PUT !== undefined,
      DELETE: content.DELETE !== undefined,
      PATCH: content.PATCH !== undefined,
    },
    handler: (request, groups) => {
      switch (request.method) {
        case "POST":
          return content.POST!(request, groups);
        case "DELETE":
          return content.DELETE!(request, groups);
        case "PATCH":
          return content.PATCH!(request, groups);
        case "GET":
          return content.GET!(request, groups);
        case "PUT":
          return content.PUT!(request, groups);
        default:
          return new Response(null, {
            status: 405,
            statusText: "Method not allowed",
          });
      }
    },
  });
}
export function pattern(
  accepts: RouteBody["accepts"] | Array<keyof RouteBody["accepts"]>,
  uri: `/${string}`,
  content: RouteHandler,
) {
  if (accepts instanceof Array) {
    if (accepts.length === 0) {
      throw new TypeError("The method array must not be empty");
    }
    routes.set(uri, {
      accepts: {
        POST: accepts.includes("POST"),
        GET: accepts.includes("GET"),
        PUT: accepts.includes("PUT"),
        DELETE: accepts.includes("DELETE"),
        PATCH: accepts.includes("PATCH"),
      },
      handler: content,
    });
    return;
  }
  routes.set(uri, {
    accepts,
    handler: content,
  });
}

const error404 = (sendHtml: boolean = true) =>
  sendError({ statusText: "Not Found", status: 404 }, sendHtml);
const error500 = (sendHtml: boolean = true) =>
  sendError({ statusText: "Internal Error", status: 500 }, sendHtml);
const error405 = (sendHtml: boolean = true) =>
  sendError({ statusText: "Method not allowed", status: 405 }, sendHtml);

function methodIsInvalid(request: Request, handler: RouteBody): boolean {
  return (request.method == "GET" && !handler.accepts.GET) ||
    (request.method == "POST" && !handler.accepts.POST) ||
    (request.method == "DELETE" && !handler.accepts.DELETE) ||
    (request.method == "PATCH" && !handler.accepts.PATCH);
}

function searchValidRoutes(
  url: string,
): { handler: RouteBody; routePattern: URLPatternResult } | null {
  for (const [route, handler] of routes.entries()) {
    const pattern = new URLPattern({ pathname: route });
    const valid = pattern.test(url);
    if (valid) {
      return { handler, routePattern: pattern.exec(url)! };
    }
  }
  return null;
}

export async function serve(
  request: Request,
): Promise<Response> {
  const route = new URL(request.url).pathname;

  const type = mime.contentType(path.extname(route));

  const sendHtmlError = request.headers.get("Accept")?.includes(MimeType.Html);

  /**
   * Checks if its not a file request if it isnt it will call the handler
   * This is done so to allow handling of routes while also allowing resources to be acessed
   */
  if (type === undefined) {
    const query = searchValidRoutes(request.url);
    if (query === null) {
      return error404(sendHtmlError);
    }
    const { handler, routePattern } = query;
    if (methodIsInvalid(request, handler)) {
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
