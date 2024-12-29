import config from "../config/paths.json" with { type: "json" };
async function main():Promise<void> {
    const date = new Date()
    const fileName = `${config.migrations}/${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}__${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.sql`
    await Deno.create(fileName);
}
if (import.meta.main){
    main()
}