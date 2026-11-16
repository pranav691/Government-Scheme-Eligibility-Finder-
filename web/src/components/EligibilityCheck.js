"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EligibilityCheck({ schemeCode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function checkEligibility() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `/api/student/eligibility/${encodeURIComponent(schemeCode)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setError(data.error || "Unable to check eligibility.");
        return;
      }

      setResult(data.eligibility);
    } catch (error) {
      console.error("Eligibility check failed:", error);
      setError("Unable to check eligibility.");
    } finally {
      setLoading(false);
    }
  }

  function statusLabel(status) {
    if (status === "eligible") {
      return "Eligible";
    }

    if (status === "ineligible") {
      return "Not Eligible";
    }

    if (status === "needs_review") {
      return "Needs Review";
    }

    return status;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-lg font-semibold text-white">
        Check Your Eligibility
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        Your saved profile will be checked against this scheme&apos;s
        eligibility rules.
      </p>

      <button
        onClick={checkEligibility}
        disabled={loading}
        className="mt-5 rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60"
      >
        {loading ? "Checking..." : "Check Eligibility"}
      </button>

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-5">
          <p className="text-sm text-slate-400">
            Eligibility Result
          </p>

          <p className="mt-1 text-xl font-bold text-white">
            {statusLabel(result.status)}
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            {result.reason}
          </p>
        </div>
      )}
    </div>
  );
}