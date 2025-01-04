import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { DB } from "./src/db.ts";
import * as router from "./src/router.ts";
import getRoutes from "./src/routes.ts";
import * as env from "@std/dotenv";
import { registerContent, } from "./src/templates.ts";

if (!import.meta.main) {
  throw new Error("cannot be used as library");
}

Deno.serve(async (req) => {

  registerContent();
  await getRoutes()
  return router.serve(req);
});
