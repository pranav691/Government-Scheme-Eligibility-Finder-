"""
embedding_service.py
--------------------
Tiny local HTTP service that converts a search query into a
384-dimensional embedding using the SAME model that produced the
vectors stored in scheme_embeddings (all-MiniLM-L6-v2).

It does NOT connect to PostgreSQL. The Next.js API sends the query
text here, receives the vector, and then runs the pgvector similarity
SQL itself through a read-only database role.

Uses only the Python standard library + sentence-transformers
(already installed in this .venv), so no extra packages are needed.

Run (from database/vector):
    .venv\\Scripts\\python.exe embedding_service.py

Endpoints:
    GET /health          -> {"status": "ok", "model": ..., "dimensions": 384}
    GET /embed?q=<text>  -> {"embedding": [384 floats]}
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from sentence_transformers import SentenceTransformer

HOST = "127.0.0.1"   # local only - never exposed to the network
PORT = 8001
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DIMENSIONS = 384
MAX_QUERY_LENGTH = 300

print("Loading embedding model (first run may take a minute)...")
model = SentenceTransformer(MODEL_NAME)
model_lock = threading.Lock()
print("Model loaded.")


class EmbeddingHandler(BaseHTTPRequestHandler):

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)

        if url.path == "/health":
            self._send_json(
                200,
                {"status": "ok", "model": MODEL_NAME, "dimensions": DIMENSIONS},
            )
            return

        if url.path != "/embed":
            self._send_json(404, {"error": "Not found."})
            return

        query = parse_qs(url.query).get("q", [""])[0].strip()

        if not query:
            self._send_json(400, {"error": "Query text is required."})
            return

        if len(query) > MAX_QUERY_LENGTH:
            self._send_json(400, {"error": "Query text is too long."})
            return

        try:
            with model_lock:
                vector = model.encode(query, normalize_embeddings=True)
        except Exception as exc:  # noqa: BLE001 - report any model failure
            print("Embedding error:", exc)
            self._send_json(500, {"error": "Unable to create embedding."})
            return

        if len(vector) != DIMENSIONS:
            self._send_json(500, {"error": "Unexpected embedding size."})
            return

        self._send_json(200, {"embedding": [float(x) for x in vector]})

    def log_message(self, format, *args):
        # Keep the console readable: one short line per request.
        print(f"[embedding-service] {self.command} {urlparse(self.path).path}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), EmbeddingHandler)
    print(f"Embedding service running on http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping embedding service.")
    finally:
        server.server_close()
