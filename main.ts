import * as router from "./src/router.ts"
import Handlebars from "npm:handlebars"
import { registerPartials } from "./src/templates.ts";
if (!import.meta.main) {
  throw new Error("cannot be used as library");
}
registerPartials("./partials");
router.templ("/",
  /*html*/`
    <p> 
      {{>test}}
    </p>
  `
);
Deno.serve((req) => {
  return router.serve(req,{sendHtml:true});
});