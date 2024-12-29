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
export type Route = SimpleRoute | ObjectRoute

export type ObjectRoute = Partial<Record<HttpMethod,RouteHandler>>
export interface SimpleRoute {
  accepts: Partial<Record<HttpMethod,boolean>>
  handler: RouteHandler;
}


// deno-lint-ignore no-explicit-any
export const isSimpleRoute = (x:any): x is SimpleRoute => "accepts" in x && "handler" in x;

export type RouteErrorHandlerProps = { status: number; statusText: string };

export type RouteErrorHandler = (data: RouteErrorHandlerProps) => Response;

const routes: Map<string, Route> = new Map();

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

function setSingleRoute(
    accepts: HttpMethod,
    uri: `/${string}`,
    content: RouteHandler,
) {
  const existentRoute = routes.get(uri);
  function getAcceptArr(route:SimpleRoute) {
    const arr:HttpMethod[] = [];
    for (const routeKey in route.accepts) {
      if(route.accepts[routeKey as HttpMethod]){
        arr.push(routeKey as HttpMethod);
      }
    }
    return arr;
  }
  if(!existentRoute) {
    const newRoute:SimpleRoute = {accepts:{},handler:content};
    newRoute.accepts[accepts] = true;
    routes.set(uri, newRoute);
    return
  }
  if(isSimpleRoute(existentRoute)) {
    const arr = getAcceptArr(existentRoute);
    if(arr.length > 2){
      console.warn("Tried overriding a simple route")
      const newRoute:SimpleRoute = {accepts:{},handler:content};
      newRoute.accepts[accepts] = true;
      routes.set(uri, newRoute);
      return
    }
    const newRoute:ObjectRoute = {}
    newRoute[arr[0]] = existentRoute.handler;
    newRoute[accepts] = content
    routes.set(uri, newRoute);
    return;
  }
  existentRoute[accepts] = content;
  routes.set(uri, existentRoute);
  return;

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
    accepts: SimpleRoute["accepts"] | Array<keyof SimpleRoute["accepts"]> = {
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
    content: ObjectRoute,
) {
  routes.set(uri, content);
}
export function pattern(
    accepts: SimpleRoute["accepts"] | Array<keyof SimpleRoute["accepts"]>,
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

function methodIsInvalid(request: Request, handler: SimpleRoute): boolean {

  return (request.method == "GET" && !handler.accepts.GET) ||
      (request.method == "POST" && !handler.accepts.POST) ||
      (request.method == "DELETE" && !handler.accepts.DELETE) ||
      (request.method == "PATCH" && !handler.accepts.PATCH)||
      (request.method == "PUT" && !handler.accepts.PUT);
}

function searchValidRoutes(
    url: string,
): { handler: Route; routePattern: URLPatternResult, simpleRoute:boolean } | null {
  for (const [route, handler] of routes.entries()) {
    const pattern = new URLPattern({ pathname: route });
    const valid = pattern.test(url);
    if (valid) {
      const simpleRoute = isSimpleRoute(handler);
      return { handler, routePattern: pattern.exec(url)!,simpleRoute };
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
  function handleSimpleRoute(route:SimpleRoute ,routePattern: URLPatternResult) {
    if (methodIsInvalid(request, route)) {
      return error405(sendHtmlError);
    }
    return route.handler(request, routePattern.pathname.groups);
  }
  function handleObjectRoute(route:ObjectRoute ,routePattern: URLPatternResult) {
    if(request.method == "GET" && route.GET){
      return route.GET(request, routePattern.pathname.groups);
    }
    if(request.method == "POST" && route.POST){
      return route.POST(request, routePattern.pathname.groups);
    }
    if(request.method == "DELETE" && route.DELETE){
      return route.DELETE(request, routePattern.pathname.groups);
    }
    if(request.method == "PATCH" && route.PATCH){
      return route.PATCH(request, routePattern.pathname.groups);
    }
    if(request.method == "PUT" && route.PUT){
      return route.PUT(request, routePattern.pathname.groups);
    }
    return error405(sendHtmlError);
  }
  /**
   * Checks if its not a file request if it isn't it will call the handler
   * This is done so to allow handling of routes while also allowing resources to be acessed
   */
  if (type === undefined) {
    const query = searchValidRoutes(request.url);
    if (query === null) {
      return error404(sendHtmlError);
    }
    const { handler, routePattern,simpleRoute } = query;
    if(simpleRoute) {
      return handleSimpleRoute(handler as SimpleRoute, routePattern)
    }
    return handleObjectRoute(handler as ObjectRoute,routePattern)
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
