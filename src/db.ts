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
export interface DBOptions extends ClientOptions {
    password:string,
    database:string,
    user:string,
    hostname:string,
}

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
class SelectQueryBuilder<TableSchema extends Record<string, unknown>> {
    constructor(private client:Client,private columns: Array<keyof TableSchema>,private table:string){}
    all():Promise<TableSchema[]>{
        return "not implemented" as any
    }
}
class QueryBuilder<Tables,TableSchema extends Record<string, unknown>>{
    
    constructor(private client:Client,private table: keyof Tables){}
    private buildValues(values:TableSchema[]):string{
        const buffer:string[] = []

        for (const row of values) {
            buffer.push(`(${
                Object.values(row)
                    .map(value => escapeSQL(value as string|number|boolean))
                    .join(", ")
            })`)
        }
        return buffer.join(",");
    }
    select(columns:(keyof TableSchema)[] = []){
        return new SelectQueryBuilder<TableSchema>(this.client,columns,this.table as string);
    }
    async insert(value: TableSchema, ...values: TableSchema[]): Promise<void> {
        const fields = Object.keys(value);
        const query = `
        INSERT INTO ${this.table as string} ( ${fields.map(field=>escapeSQL(field,true)).join(", ")} ) VALUES
            ${this.buildValues([value,...values])}
        `;
        try{
            await this.client.queryObject<TableSchema>(query)
        } catch(err){
            if (err instanceof Error){
                throw new Error(`Invalid query!\nmsg: ${err.message}\nquery: ${query.trim()}\ntrace: ${err.stack}`);
            }
        }
    }

}
export class DisconnectedError extends Error{
    constructor(){
        super("Database client not connected")
    }
}
export class DB<Schema extends {tables:any}> {
    private readonly client:Client;
    connected:boolean = false;
    constructor(props:DBOptions) {
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
    ) {
        
        return new QueryBuilder<Schema["tables"],Schema["tables"][TableName]>(this.client, table);
    }

}