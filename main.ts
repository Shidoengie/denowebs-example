import { db } from "./src/db.ts";
import * as router from "./src/router.ts";
import getRoutes from "./src/routes.ts";

import { registerContent, } from "./src/templates.ts";

if (!import.meta.main) {
  throw new Error("cannot be used as library");
}
await db.connect();
Deno.serve(async (req) => {
  registerContent();
  await getRoutes()
  return router.serve(req);
});
