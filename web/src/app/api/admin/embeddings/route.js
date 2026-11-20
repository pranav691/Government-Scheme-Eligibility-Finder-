import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";

// VECTOR READ: every scheme with the state of its search vector.
// A scheme whose embedding row was deleted shows has_embedding = false
// (and cannot be found by Smart Search until it is regenerated).
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (session.role !== "admin") {
      return Response.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    const result = await adminPool.query(
      `
        SELECT
          s.scheme_code,
          s.scheme_name,
          s.is_active,
          se.embedding_id IS NOT NULL AS has_embedding,
          se.model_name,
          vector_dims(se.embedding) AS dimensions,
          (se.embedding::real[])[1:6] AS preview,
          se.searchable_text,
          se.created_at,
          se.updated_at
        FROM schemes s
        LEFT JOIN scheme_embeddings se
          ON se.scheme_id = s.scheme_id
        ORDER BY s.scheme_code
      `
    );

    return Response.json({
      success: true,
      embeddings: result.rows,
    });
  } catch (error) {
    console.error("Admin embeddings GET error:", error);

    return Response.json(
      { success: false, error: "Unable to load embeddings." },
      { status: 500 }
    );
  }
}
