import pg from "pg";

const { Pool } = pg;

const studentPool = new Pool({
  host: process.env.STUDENT_DB_HOST,
  port: Number(process.env.STUDENT_DB_PORT || 5432),
  database: process.env.STUDENT_DB_NAME,
  user: process.env.STUDENT_DB_USER,
  password: process.env.STUDENT_DB_PASSWORD,

  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000,
});

/**
 * Run database work as one specific student.
 *
 * Row-Level Security policies (database/sql/19_row_level_security.sql)
 * only show the student rows whose user_id equals the setting
 * app.current_user_id. This helper:
 *   1. takes one connection from the pool,
 *   2. starts a transaction,
 *   3. sets app.current_user_id LOCALLY (it disappears at COMMIT/ROLLBACK,
 *      so it can never leak to the next request using this connection),
 *   4. runs `work(client)` and commits, or rolls back on any error.
 *
 * Every query made with the student role must go through this helper;
 * without it, RLS returns no rows (fail closed).
 */
export async function withStudent(userId, work) {
  const id = Number(userId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("withStudent requires a valid user id.");
  }

  const client = await studentPool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.current_user_id', $1, true)",
      [String(id)]
    );

    const result = await work(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Connection already broken; nothing more to undo.
    }
    throw error;
  } finally {
    client.release();
  }
}

export default studentPool;
