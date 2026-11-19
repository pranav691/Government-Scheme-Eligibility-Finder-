import pg from "pg";

const { Pool } = pg;

const globalForPool = globalThis;

const officerPool =
  globalForPool.__officerPool ||
  new Pool({
  host: process.env.OFFICER_DB_HOST,
  port: Number(process.env.OFFICER_DB_PORT || 5432),
  database: process.env.OFFICER_DB_NAME,
  user: process.env.OFFICER_DB_USER,
  password: process.env.OFFICER_DB_PASSWORD,

  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000,
});

globalForPool.__officerPool = officerPool;

export default officerPool;