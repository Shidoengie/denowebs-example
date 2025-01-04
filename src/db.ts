import { Client, ClientOptions } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { crypto } from "@std/crypto";
const clientInfo:ClientOptions = {
    password:Deno.env.get("DB_PASSWORD"),
    database:Deno.env.get("DB_NAME"),
    port:Deno.env.get("DB_PORT"),
    user:Deno.env.get("DB_USER"),
    hostname:Deno.env.get("DB_HOST"),
}

export const db = new Client(clientInfo)

function registerUser(email:string, password:string) {
    const key = crypto.subtle.generateKey()
    crypto.subtle.encrypt()
    db.queryObject(`INSERT INTO users (email,hash) VALUES ($1, $2);`,[email,password]);
}