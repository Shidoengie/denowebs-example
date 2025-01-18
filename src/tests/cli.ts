import yargs from "npm:yargs";
import { snapshotTest } from "./insta.ts";

const argv = yargs(Deno.args)
  .scriptName("snaptest")
  .usage("$0 <cmd> [args]")
  .command(
    "test [file]",
    "Run snapshot tests",
    (yargs: any) => {
      yargs
        .positional("file", {
          type: "string",
          describe: "Test file to run",
          default: "test.ts",
        })
        .option("update", {
          alias: "u",
          type: "boolean",
          describe: "Update snapshots",
          default: false,
        })
        .option("allowFailures", {
          alias: "a",
          type: "boolean",
          describe: "Allow saving provisional snapshots for failing tests",
          default: false,
        });
    },
    (args: any) => {
      console.log(`Running tests in: ${args.file}`);
      new Deno.Command("deno", {
        args: [
          "test",
          args.file,
          `--allow-read`,
          `--allow-write`,
          args.update ? "--update" : "",
          args.allowFailures ? "--allow-failures" : "",
        ].filter(Boolean),
        stdin: "piped",
        stdout: "piped",
      }).spawn();
    }
  )
  .help().argv;
