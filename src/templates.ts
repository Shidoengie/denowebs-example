import Handlebars from "npm:handlebars";

export async function registerPartials(folderPath:string){
    
    const partials:Record<string,string> = {};
    for await (const file of Deno.readDir(folderPath)) {
        const partialName = file.name.replace(".hbs","");
        if (!folderPath.endsWith("/")){
            folderPath += "/";
        }
        const partialPath = folderPath + file.name;
        console.log(partialPath);
        console.log(partialName);
        const opened = await Deno.readTextFile(partialPath);
        partials[name] = opened;
    }
    Handlebars.registerPartial(partials)
}