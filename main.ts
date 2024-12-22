import * as router from "./src/router.ts";

import { registerContent, registerPartials, view } from "./src/templates.ts";
import { MimeType } from "./src/mimetypes.ts"
if (!import.meta.main) {
  throw new Error("cannot be used as library");
}


view("/error.hbs").then((view) => router.setErrorPage(view));

view("/view.hbs").then((view) =>
  router.templ("/", view, () => ({
    test: Math.random() * 10000,
  }))
);
router.any("/test/",(req,groups)=>{
  const params = new URL(req.url).searchParams;
  let buffer = JSON.stringify(Array.from(params.entries()))
  return new Response(buffer, {
    headers: {
      "content-type": MimeType.Json,
      
    }
  })
})
Deno.serve((req) => {
  registerContent();
  return router.serve(req);
});
