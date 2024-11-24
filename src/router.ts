import * as mime from "@std/media-types"
import * as path from "jsr:@std/path";
import { MimeType } from "./mimetypes.ts";
import Handlebars from "npm:handlebars"
export type RouteHandler = (
    request: Request,
    groups: Record<string, string | undefined>,
) => Response | Promise<Response>;

export type RouteErrorHandlerProps = { status: number; statusText: string };

export type RouteErrorHandler = (
    data: RouteErrorHandlerProps
) => Response;

const routes: Map<string, RouteHandler> = new Map();
export const errorPage: RouteErrorHandler = (data) => {
    const content = /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error: ${data.status}</title>
    <link rel="stylesheet" href="/css/app.css">
</head>
<body>
    <div class="flex w-screen h-screen dark:bg-neutral-900 items-center justify-center">
        <p class="dark:text-white text-lg" id="error-msg">
            Error: ${data.status} ${data.statusText}
        </p>
    </div>
</body>
</html>
        `;
    return new Response(content, {
        headers: {
            "content-type": MimeType.Html,
        },
        status: data.status,
        statusText: data.statusText,
    });
};

function sendError(data:RouteErrorHandlerProps, sendHtml = true){
    if(sendHtml) {
        return errorPage(data);
    }
    return new Response(data.statusText, {
        status: data.status,
        statusText: data.statusText,
    })
}
export type TemplateContext = Record<string,unknown>;
export function templ(uri: `/${string}`,content:string|Handlebars.TemplateDelegate, data:TemplateContext|(() => TemplateContext) = {}) {
    const template = content instanceof Function ? content :Handlebars.compile(content);
    return get(uri, 
        (req,groups) => {
            const context = typeof data == "function" ? data() : data;
            const compiled = template({request:req,groups:groups,...context});
            return new Response(
                compiled,
                {
                    headers:{
                        "content-type":MimeType.Html
                    }
                }
            )
        }
    )
}
export function get(uri: `/${string}`, content: string | RouteHandler) {
    if (typeof content == "string") {
        routes.set(uri, () => {
            return new Response(
                content,
                {
                    headers: {
                        "content-type": "text/html",
                    },
                    status: 200,

                }
            )
        });
        return;
    }
    routes.set(uri, content);
}
const error404 = (sendHtml:boolean = true) => sendError({ statusText: "Not Found", status: 404 },sendHtml);
const error500 = (sendHtml:boolean = true) => sendError({ statusText: "Not Found", status: 404 },sendHtml);

export async function serve(request: Request,options:{sendHtml?:boolean} = {}): Promise<Response> {
    const route = new URL(request.url).pathname;

    const type = mime.contentType(path.extname(route)) ?? MimeType.Html;
    if (type == MimeType.Html) {
        const handler = routes.get(route);
        if (handler === undefined) {
            return error404(options.sendHtml);
        }
        const routePattern = new URLPattern({ pathname: route }).exec(
            request.url,
        );
        if (routePattern === null) {
            return error404();
        }
        return handler(request, routePattern.pathname.groups);
    }
    try {
        const routePath = "./pub" + route;
        const file = await Deno.open(routePath);

        return new Response(file.readable, {
            headers: {
                "content-type":type,
            },
        });
    } catch (ex) {

        if (ex instanceof Deno.errors.NotFound) {

            return error404(options.sendHtml);
        }
        if(ex instanceof Error)
        {
            return error500(options.sendHtml)
        }
        return error500(options.sendHtml)
    }
}
