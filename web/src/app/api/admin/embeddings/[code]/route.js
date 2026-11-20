import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";
import { embedText, refreshSchemeEmbedding } from "@/lib/embeddings";

async function requireAdmin() {
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

  return null;
}

function cleanCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9_-]{1,30}$/.test(code) ? code : null;
}

// VECTOR UPDATE: change the searchable text and store a NEW 384-number
// embedding made from it (committed, not rolled back).
export async function PUT(request, { params }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const code = cleanCode((await params).code);

    if (!code) {
      return Response.json(
        { success: false, error: "Invalid scheme code." },
        { status: 400 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const text =
      typeof body.searchableText === "string"
        ? body.searchableText.trim()
        : "";

    if (!text || text.length > 5000) {
      return Response.json(
        {
          success: false,
          error: "Searchable text is required (up to 5000 characters).",
        },
        { status: 400 }
      );
    }

    const vector = await embedText(text);

    if (!vector) {
      return Response.json(
        {
          success: false,
          error:
            "The embedding service is not running. Start database/vector/embedding_service.py and try again.",
        },
        { status: 503 }
      );
    }

    const updated = await adminPool.query(
      `
        UPDATE scheme_embeddings se
        SET
          searchable_text = $2,
          embedding = $3::vector,
          updated_at = CURRENT_TIMESTAMP
        FROM schemes s
        WHERE se.scheme_id = s.scheme_id
          AND s.scheme_code = $1
        RETURNING s.scheme_code, vector_dims(se.embedding) AS dimensions, se.updated_at
      `,
      [code, text, `[${vector.join(",")}]`]
    );

    if (updated.rowCount === 0) {
      return Response.json(
        {
          success: false,
          error: "This scheme has no embedding to update. Generate it first.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Embedding updated.",
      embedding: updated.rows[0],
    });
  } catch (error) {
    console.error("Admin embedding PUT error:", error);

    return Response.json(
      { success: false, error: "Unable to update embedding." },
      { status: 500 }
    );
  }
}

// VECTOR DELETE: remove the embedding row. The scheme itself stays, but
// Smart Search can no longer find it until it is regenerated.
export async function DELETE(request, { params }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const code = cleanCode((await params).code);

    if (!code) {
      return Response.json(
        { success: false, error: "Invalid scheme code." },
        { status: 400 }
      );
    }

    const deleted = await adminPool.query(
      `
        DELETE FROM scheme_embeddings se
        USING schemes s
        WHERE se.scheme_id = s.scheme_id
          AND s.scheme_code = $1
        RETURNING s.scheme_code
      `,
      [code]
    );

    if (deleted.rowCount === 0) {
      return Response.json(
        { success: false, error: "This scheme has no embedding." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, message: "Embedding deleted." });
  } catch (error) {
    console.error("Admin embedding DELETE error:", error);

    return Response.json(
      { success: false, error: "Unable to delete embedding." },
      { status: 500 }
    );
  }
}

// Generate / restore: rebuild the embedding from the scheme's own data.
export async function POST(request, { params }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const code = cleanCode((await params).code);

    if (!code) {
      return Response.json(
        { success: false, error: "Invalid scheme code." },
        { status: 400 }
      );
    }

    const ok = await refreshSchemeEmbedding(code);

    if (!ok) {
      return Response.json(
        {
          success: false,
          error:
            "Could not generate the embedding. Check that the scheme exists and the embedding service is running.",
        },
        { status: 503 }
      );
    }

    return Response.json({ success: true, message: "Embedding generated." });
  } catch (error) {
    console.error("Admin embedding POST error:", error);

    return Response.json(
      { success: false, error: "Unable to generate embedding." },
      { status: 500 }
    );
  }
}
