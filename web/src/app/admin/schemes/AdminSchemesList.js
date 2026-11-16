"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminSchemesList() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSchemes() {
      try {
        const response = await fetch("/api/admin/schemes", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load schemes.");
          return;
        }

        setSchemes(data.schemes || []);
      } catch (error) {
        console.error(error);
        setError("Unable to load schemes.");
      } finally {
        setLoading(false);
      }
    }

    loadSchemes();
  }, []);

  async function toggleActive(scheme) {
    setError("");

    const response = await fetch(
      `/api/admin/schemes/${encodeURIComponent(scheme.scheme_code)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !scheme.is_active }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to update scheme.");
      return;
    }

    setSchemes((current) =>
      current.map((item) =>
        item.scheme_id === scheme.scheme_id
          ? { ...item, is_active: !scheme.is_active }
          : item
      )
    );
  }

  async function deleteScheme(scheme) {
    if (
      !confirm(
        `Delete ${scheme.scheme_code} - ${scheme.scheme_name}?\n\nIts eligibility rules and documents will also be deleted. This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");

    const response = await fetch(
      `/api/admin/schemes/${encodeURIComponent(scheme.scheme_code)}`,
      { method: "DELETE" }
    );

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Unable to delete scheme.");
      return;
    }

    setSchemes((current) =>
      current.filter((item) => item.scheme_id !== scheme.scheme_id)
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading schemes...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Admin
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Scheme Management
            </h1>

            <p className="mt-2 text-slate-400">
              View and manage stored government schemes.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/schemes/new"
              className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-300"
            >
              + Add Scheme
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950">
              <tr>
                <th className="px-4 py-4">Code</th>
                <th className="px-4 py-4">Scheme</th>
                <th className="px-4 py-4">Level</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Rules</th>
                <th className="px-4 py-4">Active</th>
                <th className="px-4 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {schemes.map((scheme) => (
                <tr
                  key={scheme.scheme_id}
                  className="border-b border-slate-800 last:border-b-0"
                >
                  <td className="px-4 py-4 font-semibold text-teal-400">
                    {scheme.scheme_code}
                  </td>

                  <td className="max-w-md px-4 py-4">
                    {scheme.scheme_name}
                  </td>

                  <td className="px-4 py-4 capitalize">
                    {scheme.government_level}
                  </td>

                  <td className="px-4 py-4">
                    {scheme.scheme_type}
                  </td>

                  <td className="px-4 py-4 capitalize">
                    {scheme.scheme_status}
                  </td>

                  <td className="px-4 py-4">
                    {scheme.eligibility_rules_complete
                      ? "Complete"
                      : "Needs Review"}
                  </td>

                  <td className="px-4 py-4">
                    {scheme.is_active ? "Yes" : "No"}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/schemes/${scheme.scheme_code}`}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:border-teal-400"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleActive(scheme)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:border-amber-400"
                      >
                        {scheme.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteScheme(scheme)}
                        className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}