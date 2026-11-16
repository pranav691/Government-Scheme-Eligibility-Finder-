"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplicationButton({ schemeCode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function createDraft() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/student/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schemeCode,
          applicationKind: "fresh",
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setError(data.error || "Unable to create application.");
        return;
      }

      setMessage("Application draft created successfully.");
    } catch (error) {
      console.error("Application creation failed:", error);
      setError("Unable to create application.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white">
      <h2 className="text-lg font-semibold">
        Apply for this Scheme
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        This creates a draft application first. You will submit it in the next step.
      </p>

      <button
        onClick={createDraft}
        disabled={loading}
        className="mt-5 rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
      >
        {loading ? "Creating Draft..." : "Create Application Draft"}
      </button>

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}