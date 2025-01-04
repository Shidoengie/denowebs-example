import { Client, ClientOptions, } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import {
    hash as hashPromise,
    hashSync,
    compare as comparePromise,
    compareSync,
    genSaltSync,
} from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { QueryObjectResult } from "https://deno.land/x/postgres@v0.17.0/query/query.ts";
import { QueryArguments } from "https://deno.land/x/postgres@v0.17.0/query/query.ts";
function escapeSQL(value:string|number|boolean, isIdentifier = false) {
    if (isIdentifier) {
        // Escaping for identifiers (e.g., column names, table names)
        if (typeof value !== "string") {
            throw new Error("SQL identifiers must be strings.");
        }
        // Wrap in double quotes and escape internal double quotes
        return '"' + value.replace(/"/g, '""') + '"';
    } else {
        // Escaping for values (e.g., strings, numbers, null, etc.)
        if (value === null || value === undefined) {
            return "NULL";
        }
        if (typeof value === "number") {
            return value.toString(); // Numbers don't need escaping
        }
        if (typeof value === "boolean") {
            return value ? "TRUE" : "FALSE"; // Boolean values
        }
        if (typeof value === "string") {
            // Escape single quotes by doubling them
            return "'" + value.replace(/'/g, "''") + "'";
        }
        throw new Error("Unsupported SQL value type.");
    }
}


class QueryBuilder<TableSchema>{
    
    constructor(private client:Client,private table: keyof TableSchema){}
    private buildValues(values:Record<string,unknown>[]):string{
        const buffer:string[] = []
        values.forEach(value=>{

            if (typeof value !== "number" && typeof value !== "boolean" && typeof value !== "string") {
                return new TypeError("Invalid type as values");
            }
            
            buffer.push(`(${
                Object.values(value)
                .map(value => escapeSQL(value as string|number|boolean))
                .join(", ")
            })`)
        })
        return buffer.join(",");
    }
    insert(value: TableSchema, ...values: TableSchema[]) {

        const fields = Object.keys(value);
        let query = `
        INSERT INTO ${this.table as string} ( ${fields.map(field=>escapeSQL(field,true)).join(", ")} ) VALUES
            ${this.buildValues([value,...values])}
        `;
        console.log(query);

    }
}
export class DisconnectedError extends Error{
    constructor(){
        super("Database client not connected")
    }
}
export class DB<Schema> {
    private readonly client:Client;
    connected:boolean = false;
    constructor(props:ClientOptions & {password:string,database:string,user:string,hostname:string}
    ) {
        this.client = new Client(props);
    }
    connect(){
        this.connected = true;
        return this.client.connect();
    }
    private checkConnection(){
        if(!this.connected){
            throw new DisconnectedError()
        }
    }
    async rawQuery<T>(query:string,args?:QueryArguments):Promise<T[]>{
        this.checkConnection();
        const result = await this.client.queryObject<T>(query,args);
        return result.rows
    }
    from<TableName extends keyof Schema["tables"]>(
        table: TableName
    ): QueryBuilder<Schema["tables"][TableName]> {
        return new QueryBuilder<Schema["tables"][TableName]>(this.client, table);
    }
    
}