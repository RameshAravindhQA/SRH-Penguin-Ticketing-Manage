import { getPool } from "./index.js";

const dropSql = `
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql += N'ALTER TABLE '
  + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id))
  + N' DROP CONSTRAINT ' + QUOTENAME(name) + N';' + CHAR(13)
FROM sys.foreign_keys;

EXEC sp_executesql @sql;

SET @sql = N'';

SELECT @sql += N'DROP TABLE '
  + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name)
  + N';' + CHAR(13)
FROM sys.tables
WHERE is_ms_shipped = 0;

EXEC sp_executesql @sql;
`;

async function reset() {
  const pool = await getPool();
  await pool.request().query(dropSql);
  console.log("Database reset complete. All user tables were dropped.");
  await pool.close();
}

reset().catch((error) => {
  console.error("Database reset failed:", error);
  process.exit(1);
});
