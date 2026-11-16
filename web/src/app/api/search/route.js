import pool from "@/lib/db";
import { withStudent } from "@/lib/student-db";
import { getSession } from "@/lib/session";

// Local Python service (database/vector/embedding_service.py) that turns
// the query text into a 384-dimensional vector with all-MiniLM-L6-v2.
const EMBEDDING_SERVICE_URL =
  process.env.EMBEDDING_SERVICE_URL || "http://127.0.0.1:8001";

const TOP_K = 5;
const MAX_QUERY_LENGTH = 300;

async function embedQuery(query) {
  const response = await fetch(
    `${EMBEDDING_SERVICE_URL}/embed?q=${encodeURIComponent(query)}`,
    { cache: "no-store", signal: AbortSignal.timeout(15000) }
  );

  if (!response.ok) {
    throw new Error(`Embedding service returned ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.embedding) || data.embedding.length !== 384) {
    throw new Error("Embedding service returned an invalid vector.");
  }

  return data.embedding;
}

export async function GET(request) {
  const query = (new URL(request.url).searchParams.get("q") || "").trim();

  if (!query) {
    return Response.json(
      { success: false, error: "Enter what kind of scheme you are looking for." },
      { status: 400 }
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return Response.json(
      { success: false, error: "Search text is too long." },
      { status: 400 }
    );
  }

  // 1. Text -> vector (Python + sentence-transformers).
  let embedding;

  try {
    embedding = await embedQuery(query);
  } catch (error) {
    console.error("Embedding service error:", error);

    return Response.json(
      {
        success: false,
        error:
          "Semantic search is unavailable. Start the embedding service (database/vector/embedding_service.py).",
      },
      { status: 503 }
    );
  }

  try {
    // 2. Vector similarity search in PostgreSQL (pgvector).
    //    <=> is cosine distance; similarity = 1 - distance.
    const vectorLiteral = `[${embedding.join(",")}]`;

    const searchResult = await pool.query(
      `
        SELECT
          s.scheme_id,
          s.scheme_code,
          s.scheme_name,
          s.government_level,
          s.state_name,
          s.scheme_type,
          s.benefit_summary,
          1 - (se.embedding <=> $1::vector) AS similarity
        FROM scheme_embeddings se
        JOIN schemes s
          ON s.scheme_id = se.scheme_id
        WHERE s.is_active = TRUE
        ORDER BY se.embedding <=> $1::vector
        LIMIT $2
      `,
      [vectorLiteral, TOP_K]
    );

    const results = searchResult.rows.map((row) => ({
      schemeCode: row.scheme_code,
      schemeName: row.scheme_name,
      governmentLevel: row.government_level,
      stateName: row.state_name,
      schemeType: row.scheme_type,
      benefitSummary: row.benefit_summary,
      similarity: Number(Number(row.similarity).toFixed(4)),
      eligibility: null,
    }));

    // 3. For a signed-in student, run the SQL eligibility function on
    //    each semantic match. Similarity finds RELEVANT schemes; the
    //    function decides whether the student QUALIFIES.
    const session = await getSession();
    let eligibilityChecked = false;

    if (session?.role === "student" && results.length > 0) {
      const eligibilityResult = await withStudent(session.userId, (db) =>
      db.query(
        `
          SELECT
            s.scheme_code,
            e.eligibility_status,
            e.explanation
          FROM schemes s
          CROSS JOIN LATERAL evaluate_eligibility($1, s.scheme_id) e
          WHERE s.scheme_code = ANY($2::text[])
        `,
        [Number(session.userId), results.map((r) => r.schemeCode)]
      )
    );

      const byCode = new Map(
        eligibilityResult.rows.map((row) => [
          row.scheme_code,
          { status: row.eligibility_status, reason: row.explanation },
        ])
      );

      for (const result of results) {
        result.eligibility = byCode.get(result.schemeCode) || null;
      }

      eligibilityChecked = true;
    }

    return Response.json({
      success: true,
      query,
      eligibilityChecked,
      results,
    });
  } catch (error) {
    console.error("Semantic search error:", error);

    return Response.json(
      { success: false, error: "Unable to search schemes." },
      { status: 500 }
    );
  }
}
