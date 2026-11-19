import pg from "pg";

const { Pool } = pg;

const globalForPool = globalThis;

const authPool =
  globalForPool.__authPool ||
  new Pool({
  host: process.env.AUTH_DB_HOST,
  port: Number(process.env.AUTH_DB_PORT || 5432),
  database: process.env.AUTH_DB_NAME,
  user: process.env.AUTH_DB_USER,
  password: process.env.AUTH_DB_PASSWORD,

  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000,
});

globalForPool.__authPool = authPool;

export default authPool;