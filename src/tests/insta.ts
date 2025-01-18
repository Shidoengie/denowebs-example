import config from "../../config/paths.ts";
import { diff, DiffText } from "https://deno.land/x/diff_kit@v2.0.5/mod.ts";

console.log(diff("hey", "you"));
