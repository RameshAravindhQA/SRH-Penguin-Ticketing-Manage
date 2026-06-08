import pg from "pg";
import { loadLocalEnv } from "./env-local.mjs";

const { Client } = pg;
const env = loadLocalEnv();
const databaseUrl = new URL(env.DATABASE_URL);
const databaseName = databaseUrl.pathname.replace(/^\//, "");

if (!databaseName) {
  throw new Error("DATABASE_URL must include a database name.");
}

const admin = new Client({ connectionString: env.POSTGRES_ADMIN_URL });

await admin.connect();

const existsResult = await admin.query(
  "select 1 from pg_database where datname = $1",
  [databaseName],
);

if (existsResult.rowCount === 0) {
  await admin.query(`create database "${databaseName.replaceAll('"', '""')}"`);
  console.log(`Created database "${databaseName}".`);
} else {
  console.log(`Database "${databaseName}" already exists.`);
}

await admin.end();
