import mssql from "mssql";
import * as schema from "./schema/index.js";

if (!process.env.DB_SERVER || !process.env.DB_DATABASE || !process.env.DB_USER) {
  throw new Error("DB_SERVER, DB_DATABASE, DB_USER and DB_PASSWORD env vars must be set");
}

const config: any = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  port: Number(process.env.DB_PORT ?? 1433),
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

let _pool: any = null;

export async function getPool(): Promise<any> {
  if (!_pool || !_pool.connected) {
    _pool = await new mssql.ConnectionPool(config).connect();
  }
  return _pool;
}

// Convert snake_case keys to camelCase
function toCamel(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.replace(/_([a-zA-Z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

// Tagged-template parameterized query – returns camelCase rows
export async function q<T = Record<string, any>>(
  strings: TemplateStringsArray,
  ...vals: any[]
): Promise<T[]> {
  const pool = await getPool();
  const req = pool.request();
  let sql = "";
  strings.forEach((s, i) => {
    sql += s;
    if (i < vals.length) {
      req.input(`p${i}`, vals[i] ?? null);
      sql += `@p${i}`;
    }
  });
  const result = await req.query(sql);
  return (result.recordset ?? []).map(toCamel) as T[];
}

// Raw string + named params (for dynamic IN clauses, etc.)
export async function qRaw<T = Record<string, any>>(
  sql: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const pool = await getPool();
  const req = pool.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v ?? null);
  const result = await req.query(sql);
  return (result.recordset ?? []).map(toCamel) as T[];
}

// Helper: safe numeric IN list (never parameterized to avoid MSSQL multi-value limitation)
export function inList(ids: number[]): string {
  if (!ids.length) return "(SELECT NULL WHERE 1=0)";
  return `(${ids.map((id) => String(Math.trunc(Number(id)))).join(",")})`;
}

export * from "./schema/index.js";
