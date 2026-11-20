"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

export default function AdminEmbeddingsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [openCode, setOpenCode] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [busyCode, setBusyCode] = useState(null);

  useEffect(() => {
    async function loadEmbeddings() {
      try {
        const response = await fetch("/api/admin/embeddings", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load embeddings.");
          return;
        }

        setRows(data.embeddings || []);
      } catch (error) {
        console.error(error);
        setError("Unable to load embeddings.");
      } finally {
        setLoading(false);
      }
    }

    loadEmbeddings();
  }, [refreshKey]);

  async function call(code, method, body) {
    setBusyCode(code);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/embeddings/${encodeURIComponent(code)}`,
        {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Request failed.");
        return false;
      }

      setMessage(`${code}: ${data.message}`);
      setRefreshKey((key) => key + 1);
      return true;
    } catch (error) {
      console.error(error);
      setError("Request failed.");
      return false;
    } finally {
      setBusyCode(null);
    }
  }

  function toggle(row) {
    if (openCode === row.scheme_code) {
      setOpenCode(null);
      return;
    }

    setOpenCode(row.scheme_code);
    setDraftText(row.searchable_text || "");
  }

  async function save(code) {
    const ok = await call(code, "PUT", { searchableText: draftText });
    if (ok) setOpenCode(null);
  }

  async function remove(row) {
    const confirmed = window.confirm(
      `Delete the search vector for ${row.scheme_code}? The scheme stays, but Smart Search will not find it until you generate the embedding again.`
    );

    if (!confirmed) return;

    await call(row.scheme_code, "DELETE");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading embeddings...
      </main>
    );
  }

  const missing = rows.filter((row) => !row.has_embedding).length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Admin
            </p>

            <h1 className="mt-2 text-3xl font-bold">Vector Embeddings</h1>

            <p className="mt-2 max-w-2xl text-slate-400">
              Read, update and delete the pgvector rows in{" "}
              <code>scheme_embeddings</code>. Changes are saved to the
              database immediately and change what Smart Search returns.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/schemes"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Try Smart Search
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-400">
          {rows.length - missing} of {rows.length} schemes have a vector.
          {missing > 0 && (
            <span className="text-amber-300">
              {" "}
              {missing} missing (not searchable).
            </span>
          )}
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
            {message}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950">
              <tr>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Scheme</th>
                <th className="px-5 py-4">Vector</th>
                <th className="px-5 py-4">Updated</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const busy = busyCode === row.scheme_code;
                const isOpen = openCode === row.scheme_code;

                return (
                  <Fragment key={row.scheme_code}>
                    <tr className="border-b border-slate-800 align-top">
                      <td className="px-5 py-4 font-semibold text-teal-400">
                        {row.scheme_code}
                      </td>

                      <td className="px-5 py-4">{row.scheme_name}</td>

                      <td className="px-5 py-4">
                        {row.has_embedding ? (
                          <>
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                              {row.dimensions} dims
                            </span>
                            <p className="mt-2 max-w-xs break-all font-mono text-xs text-slate-500">
                              [
                              {(row.preview || [])
                                .map((n) => Number(n).toFixed(4))
                                .join(", ")}
                              , ...]
                            </p>
                          </>
                        ) : (
                          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                            Missing
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {row.updated_at
                          ? new Date(row.updated_at).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {row.has_embedding ? (
                            <>
                              <button
                                onClick={() => toggle(row)}
                                disabled={busy}
                                className="rounded-xl border border-slate-700 px-3 py-1 text-xs font-semibold hover:bg-slate-800 disabled:opacity-60"
                              >
                                {isOpen ? "Close" : "View / Edit"}
                              </button>

                              <button
                                onClick={() => remove(row)}
                                disabled={busy}
                                className="rounded-xl border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                              >
                                {busy ? "Working..." : "Delete"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => call(row.scheme_code, "POST")}
                              disabled={busy}
                              className="rounded-xl bg-teal-400 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
                            >
                              {busy ? "Generating..." : "Generate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="border-b border-slate-800 bg-slate-950">
                        <td colSpan={5} className="px-5 py-4">
                          <label
                            htmlFor={`text-${row.scheme_code}`}
                            className="mb-2 block text-xs font-semibold uppercase text-slate-500"
                          >
                            Searchable text ({row.model_name})
                          </label>

                          <textarea
                            id={`text-${row.scheme_code}`}
                            value={draftText}
                            onChange={(event) =>
                              setDraftText(event.target.value)
                            }
                            rows={9}
                            maxLength={5000}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-teal-400"
                          />

                          <div className="mt-3 flex gap-3">
                            <button
                              onClick={() => save(row.scheme_code)}
                              disabled={busy || !draftText.trim()}
                              className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
                            >
                              {busy ? "Saving..." : "Save & re-embed"}
                            </button>

                            <button
                              onClick={() => setOpenCode(null)}
                              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
