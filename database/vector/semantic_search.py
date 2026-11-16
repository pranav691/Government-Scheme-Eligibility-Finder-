from getpass import getpass

import psycopg
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "scheme_finder"
DB_USER = "scheme_user"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


# ============================================================
# CONNECT TO POSTGRESQL
# ============================================================

password = getpass("Enter PostgreSQL password: ")

conn = psycopg.connect(
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=password
)

register_vector(conn)

print("\nConnected to PostgreSQL successfully.")


# ============================================================
# LOAD THE SAME MODEL USED FOR SCHEME EMBEDDINGS
# ============================================================

print("Loading embedding model...")

model = SentenceTransformer(MODEL_NAME)

print("Model loaded successfully.")


# ============================================================
# USER SEARCH QUERY
# ============================================================

query_text = input(
    "\nEnter what kind of government scheme you are looking for:\n> "
).strip()


if not query_text:
    conn.close()
    raise SystemExit("Search query cannot be empty.")


# ============================================================
# GENERATE QUERY EMBEDDING
# ============================================================

query_embedding = model.encode(
    query_text,
    normalize_embeddings=True
)


if len(query_embedding) != 384:
    conn.close()
    raise ValueError(
        f"Expected 384 dimensions, got {len(query_embedding)}"
    )


print("\nQuery converted into a 384-dimensional embedding.")


# ============================================================
# SEMANTIC SEARCH USING PGVECTOR
# ============================================================
#
# <=> = cosine distance
#
# smaller distance = more similar
#
# similarity = 1 - cosine distance
# ============================================================

search_sql = """
SELECT
    s.scheme_code,
    s.scheme_name,
    s.government_level,
    s.state_name,
    s.scheme_type,
    s.benefit_summary,

    se.embedding <=> %s AS cosine_distance,

    1 - (se.embedding <=> %s) AS similarity_score

FROM scheme_embeddings se

JOIN schemes s
    ON se.scheme_id = s.scheme_id

WHERE s.is_active = TRUE

ORDER BY se.embedding <=> %s

LIMIT %s;
"""


TOP_K = 5


with conn.cursor() as cur:

    cur.execute(
        search_sql,
        (
            query_embedding,
            query_embedding,
            query_embedding,
            TOP_K
        )
    )

    results = cur.fetchall()


# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\n" + "=" * 75)
print("TOP SEMANTICALLY RELEVANT SCHEMES")
print("=" * 75)

print(f"\nSearch query: {query_text}\n")


if not results:

    print("No matching schemes found.")

else:

    for rank, row in enumerate(results, start=1):

        (
            scheme_code,
            scheme_name,
            government_level,
            state_name,
            scheme_type,
            benefit_summary,
            cosine_distance,
            similarity_score
        ) = row

        print(f"{rank}. {scheme_code} - {scheme_name}")

        print(
            f"   Government Level : "
            f"{government_level}"
        )

        print(
            f"   State            : "
            f"{state_name or 'All India'}"
        )

        print(
            f"   Scheme Type      : "
            f"{scheme_type or 'Not specified'}"
        )

        print(
            f"   Similarity Score : "
            f"{float(similarity_score):.4f}"
        )

        print(
            f"   Cosine Distance  : "
            f"{float(cosine_distance):.4f}"
        )

        print(
            f"   Benefit          : "
            f"{benefit_summary or 'Not specified'}"
        )

        print("-" * 75)


# ============================================================
# CLOSE DATABASE CONNECTION
# ============================================================

conn.close()

print("\nDatabase connection closed.")