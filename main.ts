import * as router from "./src/router.ts"
import Handlebars from "npm:handlebars"
import { registerPartials, view } from "./src/templates.ts";
if (!import.meta.main) {
  throw new Error("cannot be used as library");
}
registerPartials("./partials");
view("/view.hbs").then(view => router.templ("/",
  view,
  () => ({
    test:Math.random() * 10000
  })
))

Deno.serve((req) => {
  return router.serve(req,{sendHtml:true});
});