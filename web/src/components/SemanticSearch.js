"use client";

import Link from "next/link";
import { useState } from "react";

const EXAMPLES = [
  "scholarship for girls studying engineering",
  "financial help for students with disability",
  "loan to study abroad for minority students",
  "support for unemployed graduates in Karnataka",
];

const ELIGIBILITY_STYLES = {
  eligible: "bg-emerald-100 text-emerald-800",
  ineligible: "bg-red-100 text-red-800",
  needs_review: "bg-amber-100 text-amber-800",
};

const ELIGIBILITY_LABELS = {
  eligible: "Eligible",
  ineligible: "Not eligible",
  needs_review: "Needs review",
};

export default function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch(text) {
    const q = text.trim();
    if (!q) return;

    setQuery(q);
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Search failed.");
        setResults(null);
        return;
      }

      setResults(data.results);
      setEligibilityChecked(data.eligibilityChecked);
    } catch (err) {
      console.error(err);
      setError("Search failed.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-10 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
        Smart search · pgvector semantic similarity
      </p>

      <h2 className="mt-1 text-xl font-bold text-slate-900">
        Describe what you need, in your own words
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Finds schemes by meaning, not exact keywords. Signed-in students
        also see their eligibility for each match.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(query);
        }}
        className="mt-4 flex flex-col gap-3 md:flex-row"
      >
        <input
          type="text"
          value={query}
          maxLength={300}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. money for a first-year girl student in an engineering college"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-600"
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? "Searching..." : "Smart Search"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => runSearch(example)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-800"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {results && (
        <div className="mt-6">
          {!eligibilityChecked && (
            <p className="mb-3 text-xs text-slate-500">
              <Link href="/login" className="font-semibold text-teal-700">
                Sign in as a student
              </Link>{" "}
              to see your eligibility for each result.
            </p>
          )}

          {results.length === 0 ? (
            <p className="text-sm text-slate-500">No matching schemes found.</p>
          ) : (
            <ol className="space-y-3">
              {results.map((result, index) => (
                <li
                  key={result.schemeCode}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        #{index + 1} ·{" "}
                        <span className="font-semibold text-slate-900">
                          {result.schemeCode}
                        </span>{" "}
                        · {result.stateName || "All India"}
                        {result.schemeType ? ` · ${result.schemeType}` : ""}
                      </p>

                      <Link
                        href={`/schemes/${result.schemeCode}`}
                        className="mt-1 block text-lg font-bold text-slate-900 hover:text-teal-700"
                      >
                        {result.schemeName}
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        Similarity {(result.similarity * 100).toFixed(1)}%
                      </span>

                      {result.eligibility && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            ELIGIBILITY_STYLES[result.eligibility.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ELIGIBILITY_LABELS[result.eligibility.status] ||
                            result.eligibility.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {result.benefitSummary && (
                    <p className="mt-2 text-sm text-slate-600">
                      {result.benefitSummary}
                    </p>
                  )}

                  {result.eligibility?.reason && (
                    <p className="mt-2 text-xs text-slate-500">
                      Reason: {result.eligibility.reason}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
