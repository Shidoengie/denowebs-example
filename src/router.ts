import * as mime from "@std/media-types"
import * as path from "jsr:@std/path";
export type RouteHandler = (
    request: Request,
    groups: Record<string, string | undefined>,
) => Response | Promise<Response>;
export type RouteErrorHandler = (
    data: { status: number; msg: string },
) => Response;

const routes: Map<string, RouteHandler> = new Map();
const errorPage: RouteErrorHandler = (data) => {
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
    <title>Document</title>
    <link rel="stylesheet" href="/css/app.css">
</head>
<body>
    <div class="flex w-screen h-screen dark:bg-neutral-900 items-center justify-center">
        <p class="dark:text-white text-lg" id="error-msg">
            Error: ${data.status} ${data.msg}
        </p>
    </div>
</body>
</html>
        `;
    return new Response(content, {
        headers: {
            "content-type": "text/html",
        },
        status: data.status,
        statusText: data.msg,
    });
};
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

async function serve(request: Request,options:{sendHtml?:boolean} = {}): Promise<Response> {
    const route = new URL(request.url).pathname;
    const type = mime.contentType(path.extname(route));
    if(type === undefined){
        return new Response(
            "Error 404 Not Found",
            { status: 404, statusText: "Not Found" }
        );
    }

    if (type == "text/html") {
        const handler = routes.get(route);
        if (handler === undefined) {
            return errorPage({ msg: "Not Found", status: 404 });
        }
        const routePattern = new URLPattern({ pathname: route }).exec(
            request.url,
        );
        if (routePattern === null) {
            return errorPage({ msg: "Not Found", status: 404 });
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

            return errorPage({ status: 404, msg: "Not Found" });
        }
        return errorPage({
            status: 500,
            msg: `Internal Server Error: ${err.message}`,
        });
    }
}
