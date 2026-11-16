"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function AdminApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/admin/applications", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load applications.");
          return;
        }

        setApplications(data.applications || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load applications.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading applications...
      </main>
    );
  }

  const visible = applications.filter(
    (a) => statusFilter === "all" || a.current_status === statusFilter
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Admin
            </p>

            <h1 className="mt-2 text-3xl font-bold">Applications</h1>

            <p className="mt-2 text-slate-400">
              Read-only overview of every application and its status history.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950">
              <tr>
                <th className="px-4 py-4">ID</th>
                <th className="px-4 py-4">Student</th>
                <th className="px-4 py-4">Scheme</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Eligibility</th>
                <th className="px-4 py-4">Updated</th>
                <th className="px-4 py-4">History</th>
              </tr>
            </thead>

            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-slate-400">
                    No applications found.
                  </td>
                </tr>
              )}

              {visible.map((a) => (
                <ApplicationRow
                  key={a.application_id}
                  a={a}
                  open={openId === a.application_id}
                  onToggle={() =>
                    setOpenId(
                      openId === a.application_id ? null : a.application_id
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function ApplicationRow({ a, open, onToggle }) {
  return (
    <>
      <tr className="border-b border-slate-800">
        <td className="px-4 py-4">{a.application_id}</td>

        <td className="px-4 py-4">
          <div className="font-semibold">{a.full_name}</div>
          <div className="text-xs text-slate-400">{a.email}</div>
        </td>

        <td className="px-4 py-4">
          <span className="font-semibold text-teal-400">{a.scheme_code}</span>{" "}
          {a.scheme_name}
        </td>

        <td className="px-4 py-4 capitalize">{a.application_kind}</td>

        <td className="px-4 py-4 capitalize">
          {a.current_status.replace("_", " ")}
        </td>

        <td className="px-4 py-4 capitalize">
          {a.eligibility_result?.replace("_", " ") || "-"}
        </td>

        <td className="px-4 py-4">{formatDate(a.updated_at)}</td>

        <td className="px-4 py-4">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:border-teal-400"
          >
            {open ? "Hide" : `View (${a.status_history.length})`}
          </button>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-slate-800 bg-slate-950">
          <td colSpan={8} className="px-6 py-4">
            {a.eligibility_reason && (
              <p className="mb-3 text-xs text-slate-400">
                Eligibility reason: {a.eligibility_reason}
              </p>
            )}

            {a.status_history.length === 0 ? (
              <p className="text-sm text-slate-400">
                No status changes recorded yet.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {a.status_history.map((h) => (
                  <li key={h.log_id}>
                    <span className="text-slate-400">
                      {formatDate(h.changed_at)}
                    </span>{" "}
                    {h.old_status || "-"} → {h.new_status}{" "}
                    <span className="text-slate-500">
                      by {h.changed_by_name || "system"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
