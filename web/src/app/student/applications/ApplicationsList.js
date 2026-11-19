"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function loadApplications() {
    try {
      setError("");

      const response = await fetch("/api/student/applications", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load applications.");
        return;
      }

      setApplications(data.applications || []);
    } catch (error) {
      console.error(error);
      setError("Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function submitApplication(applicationId) {
    setSubmittingId(applicationId);
    setError("");

    try {
      const response = await fetch(
        `/api/student/applications/${applicationId}/submit`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to submit application.");
        return;
      }

      await loadApplications();
    } catch (error) {
      console.error(error);
      setError("Unable to submit application.");
    } finally {
      setSubmittingId(null);
    }
  }

  async function deleteDraft(applicationId, schemeCode) {
    const confirmed = window.confirm(
      `Delete your draft application for ${schemeCode}? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(applicationId);
    setError("");

    try {
      const response = await fetch(
        `/api/student/applications/${applicationId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to delete draft.");
        return;
      }

      await loadApplications();
    } catch (error) {
      console.error(error);
      setError("Unable to delete draft.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading applications...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Student
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              My Applications
            </h1>
          </div>

          <Link
            href="/student"
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

        <div className="space-y-5">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
              No applications yet.
            </div>
          ) : (
            applications.map((application) => (
              <div
                key={application.application_id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-teal-400">
                      {application.scheme_code}
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      {application.scheme_name}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {application.department}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold capitalize">
                    {application.current_status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-slate-500">
                      Application Type
                    </p>

                    <p className="mt-1 capitalize">
                      {application.application_kind || "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-500">
                      Eligibility
                    </p>

                    <p className="mt-1 capitalize">
                      {application.eligibility_result
                        ? application.eligibility_result.replaceAll("_", " ")
                        : "Not checked"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-500">
                      Applied
                    </p>

                    <p className="mt-1">
                      {application.applied_at
                        ? new Date(application.applied_at).toLocaleString()
                        : "Not submitted yet"}
                    </p>
                  </div>
                </div>

                {application.eligibility_reason && (
                  <p className="mt-5 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
                    {application.eligibility_reason}
                  </p>
                )}

                {application.status_history?.length > 0 && (
                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="mb-3 text-sm font-semibold text-white">
                      Status History
                    </p>

                    <div className="space-y-3">
                      {application.status_history.map((history) => (
                        <div
                          key={history.log_id}
                          className="border-l-2 border-teal-400 pl-4"
                        >
                          <p className="text-sm font-medium capitalize text-white">
                            {history.old_status
                              ? `${history.old_status.replaceAll("_", " ")} → `
                              : ""}
                            {history.new_status.replaceAll("_", " ")}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(history.changed_at).toLocaleString()}
                          </p>

                          {history.remarks && (
                            <p className="mt-1 text-xs text-slate-400">
                              {history.remarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}  

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/schemes/${application.scheme_code}`}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                  >
                    View Scheme
                  </Link>

                  {application.current_status === "draft" && (
                    <button
                      onClick={() =>
                        submitApplication(application.application_id)
                      }
                      disabled={
                        submittingId === application.application_id
                      }
                      className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
                    >
                      {submittingId === application.application_id
                        ? "Submitting..."
                        : "Submit Application"}
                    </button>
                  )}

                  {application.current_status === "draft" && (
                    <button
                      onClick={() =>
                        deleteDraft(
                          application.application_id,
                          application.scheme_code
                        )
                      }
                      disabled={
                        deletingId === application.application_id
                      }
                      className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      {deletingId === application.application_id
                        ? "Deleting..."
                        : "Delete Draft"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}