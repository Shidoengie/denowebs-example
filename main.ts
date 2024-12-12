import * as router from "./src/router.ts";
import Handlebars from "npm:handlebars";
import { registerContent, registerPartials, view } from "./src/templates.ts";
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

Deno.serve((req) => {
  return router.serve(req);
});
