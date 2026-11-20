import adminPool from "@/lib/admin-db";

const EMBEDDING_SERVICE_URL =
  process.env.EMBEDDING_SERVICE_URL || "http://127.0.0.1:8001";

// Same text layout as database/vector/generate_embeddings.py, so vectors
// created here match the ones created by the batch script.
function buildSearchableText(s) {
  return `
Scheme: ${s.scheme_name}
Scheme Code: ${s.scheme_code}
Government Level: ${s.government_level}
State: ${s.state_name || "All India"}
Department: ${s.department || ""}
Scheme Type: ${s.scheme_type || ""}
Categories: ${s.categories || ""}
Description: ${s.description || ""}
Benefits: ${s.benefit_summary || ""}
`.trim();
}

/**
 * Ask the Python embedding service for the 384-number vector of a text.
 * Returns null if the service is not running or answers badly.
 */
export async function embedText(text) {
  try {
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!Array.isArray(data.embedding) || data.embedding.length !== 384) {
      return null;
    }

    return data.embedding;
  } catch (error) {
    console.error("Embedding request failed:", error.message);
    return null;
  }
}

/**
 * Re-create the semantic-search vector for one scheme after an admin
 * creates or edits it. Best effort: if the Python embedding service is not
 * running, the scheme is still saved and `false` is returned (run
 * database/vector/generate_embeddings.py later to catch up).
 */
export async function refreshSchemeEmbedding(schemeCode) {
  try {
    const result = await adminPool.query(
      `
        SELECT
          s.scheme_id, s.scheme_code, s.scheme_name, s.government_level,
          s.state_name, s.department, s.scheme_type, s.description,
          s.benefit_summary, s.is_active,
          COALESCE(
            (
              SELECT STRING_AGG(c.category_name, ', ' ORDER BY c.category_name)
              FROM scheme_categories sc
              JOIN categories c ON c.category_id = sc.category_id
              WHERE sc.scheme_id = s.scheme_id
            ),
            ''
          ) AS categories
        FROM schemes s
        WHERE UPPER(s.scheme_code) = UPPER($1)
      `,
      [schemeCode]
    );

    const scheme = result.rows[0];
    if (!scheme) return false;

    const text = buildSearchableText(scheme);

    const vector = await embedText(text);

    if (!vector) return false;

    await adminPool.query(
      `
        INSERT INTO scheme_embeddings
          (scheme_id, searchable_text, model_name, embedding)
        VALUES ($1, $2, 'all-MiniLM-L6-v2', $3::vector)
        ON CONFLICT (scheme_id) DO UPDATE
        SET searchable_text = EXCLUDED.searchable_text,
            embedding = EXCLUDED.embedding,
            updated_at = CURRENT_TIMESTAMP
      `,
      [scheme.scheme_id, text, `[${vector.join(",")}]`]
    );

    return true;
  } catch (error) {
    console.error("Embedding refresh failed:", error.message);
    return false;
  }
}
