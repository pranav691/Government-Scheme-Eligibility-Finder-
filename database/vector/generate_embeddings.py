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

print("Connected to PostgreSQL successfully.")


# ============================================================
# LOAD ALL SCHEMES + CATEGORIES
# ============================================================

query = """
SELECT
    s.scheme_id,
    s.scheme_code,
    s.scheme_name,
    s.department,
    s.scheme_type,
    s.description,
    s.benefit_summary,
    s.government_level,
    s.state_name,
    COALESCE(
        STRING_AGG(
            DISTINCT c.category_name,
            ', ' ORDER BY c.category_name
        ),
        ''
    ) AS categories
FROM schemes s
LEFT JOIN scheme_categories sc
    ON s.scheme_id = sc.scheme_id
LEFT JOIN categories c
    ON sc.category_id = c.category_id
WHERE s.is_active = TRUE
GROUP BY
    s.scheme_id,
    s.scheme_code,
    s.scheme_name,
    s.department,
    s.scheme_type,
    s.description,
    s.benefit_summary,
    s.government_level,
    s.state_name
ORDER BY s.scheme_code;
"""


with conn.cursor() as cur:
    cur.execute(query)
    schemes = cur.fetchall()


print(f"Loaded {len(schemes)} active schemes.")


if len(schemes) == 0:
    conn.close()
    raise SystemExit("No active schemes found.")


# ============================================================
# BUILD SEARCHABLE TEXT
# ============================================================

scheme_records = []

for row in schemes:

    (
        scheme_id,
        scheme_code,
        scheme_name,
        department,
        scheme_type,
        description,
        benefit_summary,
        government_level,
        state_name,
        categories
    ) = row

    searchable_text = f"""
Scheme: {scheme_name}
Scheme Code: {scheme_code}
Government Level: {government_level}
State: {state_name or 'All India'}
Department: {department or ''}
Scheme Type: {scheme_type or ''}
Categories: {categories or ''}
Description: {description or ''}
Benefits: {benefit_summary or ''}
""".strip()

    scheme_records.append(
        {
            "scheme_id": scheme_id,
            "scheme_code": scheme_code,
            "searchable_text": searchable_text
        }
    )


# Show one example before generating vectors.

print("\nExample searchable text:\n")
print("=" * 70)
print(scheme_records[0]["searchable_text"])
print("=" * 70)


# ============================================================
# LOAD SENTENCE TRANSFORMER MODEL
# ============================================================

print("\nLoading embedding model...")

model = SentenceTransformer(MODEL_NAME)

print("Model loaded successfully.")


# ============================================================
# GENERATE 384-D EMBEDDINGS
# ============================================================

texts = [
    record["searchable_text"]
    for record in scheme_records
]

print("\nGenerating embeddings...")

embeddings = model.encode(
    texts,
    normalize_embeddings=True,
    show_progress_bar=True
)


print(f"Generated {len(embeddings)} embeddings.")
print(f"Embedding dimensions: {embeddings.shape[1]}")


# Safety check

if embeddings.shape[1] != 384:
    conn.close()
    raise ValueError(
        f"Expected 384 dimensions but received {embeddings.shape[1]}"
    )


# ============================================================
# INSERT / UPDATE EMBEDDINGS
# ============================================================

upsert_query = """
INSERT INTO scheme_embeddings (
    scheme_id,
    searchable_text,
    model_name,
    model_version,
    embedding,
    created_at,
    updated_at
)
VALUES (
    %s,
    %s,
    %s,
    %s,
    %s,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (scheme_id)
DO UPDATE SET
    searchable_text = EXCLUDED.searchable_text,
    model_name = EXCLUDED.model_name,
    model_version = EXCLUDED.model_version,
    embedding = EXCLUDED.embedding,
    updated_at = CURRENT_TIMESTAMP;
"""


with conn.cursor() as cur:

    for record, embedding in zip(
        scheme_records,
        embeddings
    ):

        cur.execute(
            upsert_query,
            (
                record["scheme_id"],
                record["searchable_text"],
                MODEL_NAME,
                "MiniLM-L6-v2-384d",
                embedding
            )
        )

        print(
            f"Stored embedding: "
            f"{record['scheme_code']}"
        )


conn.commit()

print("\nAll embeddings committed successfully.")


# ============================================================
# FINAL VERIFICATION
# ============================================================

with conn.cursor() as cur:

    cur.execute("""
        SELECT COUNT(*)
        FROM scheme_embeddings;
    """)

    embedding_count = cur.fetchone()[0]


print(
    f"Total rows currently in scheme_embeddings: "
    f"{embedding_count}"
)

conn.close()

print("Database connection closed.")