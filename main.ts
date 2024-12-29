import * as router from "./src/router.ts";
import getRoutes from "./src/routes.ts";

import { registerContent, } from "./src/templates.ts";

if (!import.meta.main) {
  throw new Error("cannot be used as library");
}

Deno.serve(async (req) => {
  registerContent();
  await getRoutes()
  return router.serve(req);
});
