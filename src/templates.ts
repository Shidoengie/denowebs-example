import Handlebars from "npm:handlebars";
import config from "../config/paths.json" with { type: "json" };
const views = config?.views ?? "./app/views";
const partials = config?.partials ?? "./app/partials";
export async function registerPartials(folderPath:string){
    for await (const file of Deno.readDir(folderPath)) {
        const partialName = file.name.replace(".hbs","");
        if (!folderPath.endsWith("/")){
            folderPath += "/";
        }
        const partialPath = folderPath + file.name;
        console.log(partialPath);
        console.log(partialName);
        const opened = await Deno.readTextFile(partialPath);
        Handlebars.registerPartial(partialName,opened);
    }
}

export function registerContent() {
    registerPartials(partials);
}

/**
 * Gets a view from a root filepath
 */
export async function viewFrom(path:string) {
    const opened = await Deno.readTextFile(path);
    return Handlebars.compile(opened);
}
export async function compiledView(path:`/${string}`, context = {}):Promise<string> {
    return (await viewFrom(views+path))(context);
}
export async function view(path:`/${string}`):Promise<HandlebarsTemplateDelegate<unknown>> {
    return (await viewFrom(views+path));
}