import { todo } from "../utilities.ts";
import { escapeSQL, sqlTemplateStr } from "./db.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

export class WhereQueryBuilder<
  Tables,
  TableSchema extends Record<string, unknown>,
> {
  private buffer: string[] = []; // Store query fragments

  constructor(
    private readonly client: Client,
    private readonly table: keyof Tables,
    private previousQuery: string = "",
  ) {}

  // Raw SQL query
  whereRaw(op: string, values: Array<string | number | boolean>) {
    op = op.toLowerCase();
    const query = sqlTemplateStr(op, values);
    this.buffer.push(query);
  }

  // Column comparison
  where(col: string, operator: string, value: string | number | boolean) {
    this.buffer.push(`${escapeSQL(col)} ${operator} ${escapeSQL(value)}`);
  }

  // Logical OR
  or(subQuery: (qb: WhereQueryBuilder<Tables, TableSchema>) => void) {
    const subBuilder = new WhereQueryBuilder<Tables, TableSchema>(
      this.client,
      this.table,
    );
    subQuery(subBuilder); // Let the callback define the subquery
    const subQueryStr = subBuilder.toString();
    this.buffer.push(`OR (${subQueryStr})`);
  }

  // Convert buffer to SQL string
  private toString(): string {
    return this.buffer.join(" AND "); // Use AND for top-level joining
  }

  // Execute the query
  async exec() {
    const query = `SELECT * FROM ${escapeSQL(
      String(this.table),
    )} WHERE ${this.toString()}`;
    console.log(query);
  }
}
