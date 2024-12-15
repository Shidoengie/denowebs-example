import * as router from "./src/router.ts";

import { registerContent, registerPartials, view } from "./src/templates.ts";
import { MimeType } from "./src/mimetypes.ts"
if (!import.meta.main) {
  throw new Error("cannot be used as library");
}
registerContent();

view("/error.hbs").then((view) => router.setErrorPage(view));

view("/view.hbs").then((view) =>
  router.templ("/", view, () => ({
    test: Math.random() * 10000,
  }))
);
router.any("/test",()=>{
  return new Response("this is a test", {
    headers: {
      "content-type": MimeType.Text,
      
    }
  })
})
Deno.serve((req) => {
  return router.serve(req);
});
