import sys
from getpass import getpass

import psycopg
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer


DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "scheme_finder"
DB_USER = "scheme_user"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Default: every change is rolled back at the end (safe demo).
# With --commit the UPDATE and DELETE are made PERMANENT on the real
# database, so they show up in Admin > Vector Embeddings and in Smart
# Search. Use the Generate button there (or generate_embeddings.py) to
# bring the deleted K01 vector back afterwards.
COMMIT = "--commit" in sys.argv

password = getpass("Enter PostgreSQL password: ")

conn = psycopg.connect(
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=password
)

register_vector(conn)

model = SentenceTransformer(MODEL_NAME)

print("\nConnected successfully.")


# ============================================================
# VECTOR READ
# ============================================================

with conn.cursor() as cur:
    cur.execute("""
        SELECT
            s.scheme_code,
            s.scheme_name,
            se.searchable_text,
            vector_dims(se.embedding)
        FROM scheme_embeddings se
        JOIN schemes s
            ON se.scheme_id = s.scheme_id
        WHERE s.scheme_code = 'K01';
    """)

    row = cur.fetchone()

    print("\n========== READ ==========")
    print("Scheme Code :", row[0])
    print("Scheme Name :", row[1])
    print("Dimensions  :", row[3])
    print("\nSearchable Text:")
    print(row[2])


# ============================================================
# VECTOR UPDATE
# ============================================================
# We temporarily modify K01 searchable text and generate
# a NEW embedding from the changed text.
# The final ROLLBACK restores everything.
# ============================================================

updated_text = row[2] + """
Additional semantic search terms:
minority student education scholarship financial assistance Karnataka.
"""

new_embedding = model.encode(
    updated_text,
    normalize_embeddings=True
)

with conn.cursor() as cur:
    cur.execute("""
        UPDATE scheme_embeddings se
        SET
            searchable_text = %s,
            embedding = %s,
            updated_at = CURRENT_TIMESTAMP
        FROM schemes s
        WHERE se.scheme_id = s.scheme_id
          AND s.scheme_code = 'K01';
    """, (updated_text, new_embedding))


print("\n========== UPDATE ==========")
print("K01 searchable text updated.")
print("A new 384-dimensional embedding was generated and stored.")


# Verify update

with conn.cursor() as cur:
    cur.execute("""
        SELECT
            s.scheme_code,
            vector_dims(se.embedding),
            se.updated_at
        FROM scheme_embeddings se
        JOIN schemes s
            ON se.scheme_id = s.scheme_id
        WHERE s.scheme_code = 'K01';
    """)

    updated_row = cur.fetchone()

    print("Scheme      :", updated_row[0])
    print("Dimensions  :", updated_row[1])
    print("Updated At  :", updated_row[2])


# ============================================================
# VECTOR DELETE
# ============================================================

with conn.cursor() as cur:
    cur.execute("""
        DELETE FROM scheme_embeddings se
        USING schemes s
        WHERE se.scheme_id = s.scheme_id
          AND s.scheme_code = 'K01';
    """)

print("\n========== DELETE ==========")
print("K01 embedding deleted temporarily.")


# Verify deletion

with conn.cursor() as cur:
    cur.execute("""
        SELECT COUNT(*)
        FROM scheme_embeddings se
        JOIN schemes s
            ON se.scheme_id = s.scheme_id
        WHERE s.scheme_code = 'K01';
    """)

    remaining = cur.fetchone()[0]

print("K01 embedding rows remaining:", remaining)


# Show temporary total count

with conn.cursor() as cur:
    cur.execute("""
        SELECT COUNT(*)
        FROM scheme_embeddings;
    """)

    count_after_delete = cur.fetchone()[0]

print("Temporary total embeddings:", count_after_delete)


# ============================================================
# ROLLBACK (default) or COMMIT (--commit)
# ============================================================

if COMMIT:
    conn.commit()

    print("\n========== COMMIT ==========")
    print("UPDATE and DELETE are now PERMANENT in the database.")
    print("K01 has no embedding until you regenerate it")
    print("(Admin > Vector Embeddings > Generate).")
else:
    conn.rollback()

    print("\n========== ROLLBACK ==========")
    print("UPDATE and DELETE rolled back.")
    print("Original database restored.")


# Final verification

with conn.cursor() as cur:
    cur.execute("""
        SELECT COUNT(*)
        FROM scheme_embeddings;
    """)

    final_count = cur.fetchone()[0]

print("Final embedding count:", final_count)


conn.close()

print("\nDatabase connection closed.")