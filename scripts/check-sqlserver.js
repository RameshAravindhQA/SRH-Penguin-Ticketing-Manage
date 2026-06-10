import mssql from "mssql";

const config = {
  server: "192.168.9.75",
  database: "SRH",
  user: "sa",
  password: "srh@2013",
  port: 1433,
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

(async () => {
  try {
    const pool = await mssql.connect(config);
    console.log("Connected to SQL Server:", config.server, config.database);
    const result = await pool.request().query(
      "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME",
    );
    console.log("Tables:");
    for (const row of result.recordset) {
      console.log(`${row.TABLE_SCHEMA}.${row.TABLE_NAME}`);
    }
    await pool.close();
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  }
})();
