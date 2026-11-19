import pg from "pg";

const { Pool } = pg;

const globalForPool = globalThis;

const adminPool =
  globalForPool.__adminPool ||
  new Pool({
  host: process.env.ADMIN_DB_HOST,
  port: Number(process.env.ADMIN_DB_PORT || 5432),
  database: process.env.ADMIN_DB_NAME,
  user: process.env.ADMIN_DB_USER,
  password: process.env.ADMIN_DB_PASSWORD,

  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000,
});

globalForPool.__adminPool = adminPool;

export default adminPool;