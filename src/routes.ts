import {view} from "./templates.ts";
import * as router from "./router.ts";
import {MimeType} from "./mimetypes.ts";

export default async function getRoutes() {
    const [error,home] = await Promise.all([view("/error.hbs"),view("/view.hbs")])
    router.setErrorPage(error)

    router.obj("/",{
        GET() {
            return new Response(home({}), {
                headers: {
                    "content-type": MimeType.Html,
                },
            });
        },

    });
    router.post("/",async (request) => {
        const formData = await request.formData();
        return new Response(JSON.stringify(Object.fromEntries(formData)), {headers:{"content-type": MimeType.Json}});
    })
    router.any("/test/",(req,groups) => {
        const params = new URL(req.url).searchParams;
        let buffer = JSON.stringify(Array.from(params.entries()))
        return new Response(buffer, {
            headers: {
                "content-type": MimeType.Json,

            }
        })
    })
}