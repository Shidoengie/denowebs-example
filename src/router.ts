import * as mime from "@std/media-types";
import * as path from "jsr:@std/path";
import { MimeType } from "./mimetypes.ts";
import Handlebars from "npm:handlebars";
export type HttpMethod =
    "POST" | "GET" | "PATCH" | "PUT" | "DELETE"
export type RouteHandler = (
    request: Request,
    groups: Record<string, string | undefined>,
) => Response | Promise<Response>;

export interface Route  {
  uri:string;
  accepts: Partial<Record<HttpMethod,boolean>>
  handler: RouteHandler;
}



export type RouteErrorHandlerProps = { status: number; statusText: string };

export type RouteErrorHandler = (data: RouteErrorHandlerProps) => Response;

const routes: Route[] = [];

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
function searchValidRoutes(
    uri: string,
    method:HttpMethod,
): { handler: RouteHandler; routePattern: URLPatternResult} | null {
  for (const route of routes) {
    const pattern = new URLPattern({ pathname: route.uri });
    const valid = pattern.test(uri);
    if (!valid) {
      continue;
    }
    if(methodIsInvalid(method,route)){
      continue
    }
    return { handler:route.handler, routePattern: pattern.exec(uri)! };
  }
  return null;
}
function setSingleRoute(
    accepts: HttpMethod,
    uri: `/${string}`,
    content: RouteHandler,
) {
  const existentRoute = searchValidRoutes(uri,accepts);
  const newRoute:Route = {
    uri,
    accepts:{},
    handler:content
  };
  newRoute.accepts[accepts] = true;
  routes.push(newRoute);
  return

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

  const template = (()=>{
    if (content instanceof Function){
      return content;
    }
    return Handlebars.compile(content);
  })();


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
    const handler = () => {
      return new Response(content, {
        headers: {
          "content-type": type,
        },
        status: 200,
      });
    }
    setSingleRoute("GET", uri, handler);
    return;
  }
  setSingleRoute("GET", uri, content);
  return;
}
export function post(
    uri: `/${string}`,
    content: RouteHandler,

) {
  setSingleRoute("POST", uri, content);
}
export function del(
    uri: `/${string}`,
    content: RouteHandler,

) {
  setSingleRoute("DELETE", uri, content);
}
export function put(
    uri: `/${string}`,
    content: RouteHandler,

) {
  setSingleRoute("PUT", uri, content);
}
export function patch(
    uri: `/${string}`,
    content: RouteHandler,

) {
  setSingleRoute("PATCH", uri, content);
}
export function any(
    uri: `/${string}`,
    content: RouteHandler,
) {
  routes.push({
    uri: uri,
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
    content: Partial<Record<HttpMethod, RouteHandler>>,
) {
  for (const [method,handler] of Object.entries(content)) {
    routes.push({uri,accepts:{[method]:true},handler})
  }
}
export function pattern(
    accepts: Route["accepts"] | Array<keyof Route["accepts"]>,
    uri: `/${string}`,
    content: RouteHandler,
) {
  if (accepts instanceof Array) {
    if (accepts.length === 0) {
      throw new TypeError("The method array must not be empty");
    }
    routes.push( {
      uri,
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
  routes.push({
    uri,
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

function methodIsInvalid(method: HttpMethod, handler: Route): boolean {

  return (method == "GET" && !handler.accepts.GET) ||
      (method == "POST" && !handler.accepts.POST) ||
      (method == "DELETE" && !handler.accepts.DELETE) ||
      (method == "PATCH" && !handler.accepts.PATCH)||
      (method == "PUT" && !handler.accepts.PUT);
}



export async function serve(
    request: Request,
): Promise<Response> {

  const route = new URL(request.url).pathname;

  const type = mime.contentType(path.extname(route));

  const sendHtmlError = request.headers.get("Accept")?.includes(MimeType.Html);

  /**
   * Checks if its not a file request if it isn't it will call the handler
   * This is done so to allow handling of routes while also allowing resources to be acessed
   */
  if (type === undefined) {
    const query = searchValidRoutes(request.url,request.method as HttpMethod);
    if (query === null) {
      return error404(sendHtmlError);
    }
    const { handler, routePattern} = query;

    return handler(request, routePattern.pathname.groups);
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
