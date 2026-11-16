"use client";

import { useEffect, useState } from "react";

export default function OfficerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  async function loadApplications() {
    try {
      setError("");

      const response = await fetch("/api/officer/applications", {
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

  async function changeStatus(applicationId, status) {
    setUpdatingId(applicationId);
    setError("");

    try {
      const response = await fetch(
        `/api/officer/applications/${applicationId}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update application.");
        return;
      }

      await loadApplications();
    } catch (error) {
      console.error(error);
      setError("Unable to update application.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <p className="mt-6 text-slate-400">
        Loading applications...
      </p>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold">
        Applications Awaiting Review
      </h2>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-5">
        {applications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 p-6 text-slate-400">
            No applications currently require review.
          </div>
        ) : (
          applications.map((application) => (
            <div
              key={application.application_id}
              className="rounded-2xl border border-slate-800 bg-slate-950 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-400">
                    {application.scheme_code}
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    {application.scheme_name}
                  </h3>

                  <p className="mt-3 text-sm text-slate-400">
                    Applicant
                  </p>

                  <p className="font-medium">
                    {application.full_name}
                  </p>

                  <p className="text-sm text-slate-400">
                    {application.email}
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
                      : "Not available"}
                  </p>
                </div>
              </div>

              {application.eligibility_reason && (
                <div className="mt-5 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                  {application.eligibility_reason}
                </div>
              )}

              {application.status_history?.length > 0 && (
                <div className="mt-5 rounded-xl border border-slate-800 p-4">
                  <p className="font-semibold">
                    Status History
                  </p>

                  <div className="mt-3 space-y-3">
                    {application.status_history.map((history) => (
                      <div
                        key={history.log_id}
                        className="border-l-2 border-teal-400 pl-4"
                      >
                        <p className="text-sm capitalize">
                          {history.old_status
                            ? `${history.old_status.replaceAll("_", " ")} → `
                            : ""}
                          {history.new_status.replaceAll("_", " ")}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(history.changed_at).toLocaleString()}
                        </p>

                        {history.changed_by && (
                          <p className="mt-1 text-xs text-slate-400">
                            Changed by user ID: {history.changed_by}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">

                {application.current_status === "submitted" && (
                  <button
                    onClick={() =>
                      changeStatus(
                        application.application_id,
                        "under_review"
                      )
                    }
                    disabled={
                      updatingId === application.application_id
                    }
                    className="rounded-xl bg-teal-400 px-5 py-2 font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
                  >
                    Start Review
                  </button>
                )}

                {application.current_status === "under_review" && (
                  <>
                    <button
                      onClick={() =>
                        changeStatus(
                          application.application_id,
                          "approved"
                        )
                      }
                      disabled={
                        updatingId === application.application_id
                      }
                      className="rounded-xl bg-emerald-400 px-5 py-2 font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        changeStatus(
                          application.application_id,
                          "rejected"
                        )
                      }
                      disabled={
                        updatingId === application.application_id
                      }
                      className="rounded-xl bg-red-400 px-5 py-2 font-semibold text-slate-950 hover:bg-red-300 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </>
                )}

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}