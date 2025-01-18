import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { DB, DBOptions } from "./src/db/db.ts";
import * as router from "./src/router.ts";
import getRoutes from "./src/routes.ts";
import * as env from "@std/dotenv";
import { registerContent } from "./src/templates.ts";

if (!import.meta.main) {
  throw new Error("cannot be used as library");
}

async function main() {
  env.loadSync({ export: true });
  const clientInfo: DBOptions = {
    password: Deno.env.get("DB_PASSWORD")!,
    database: Deno.env.get("DB_NAME")!,
    port: Deno.env.get("DB_PORT")!,
    user: Deno.env.get("DB_USER")!,
    hostname: Deno.env.get("DB_HOST")!,
  };
  type Schema = {
    tables: {
      test_2: {
        foo: string;
      };
    };
  };
  const db = new DB<Schema>(clientInfo);
  await db.connect();
  try {
    db.from("test_2").select("*").where("1", ">", 10);
  } catch (err) {
    console.error(err);
    return;
  }

  Deno.serve(async (req) => {
    registerContent();
    await getRoutes();
    return router.serve(req);
  });
}
main();
