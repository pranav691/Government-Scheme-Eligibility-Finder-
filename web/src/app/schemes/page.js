"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import SemanticSearch from "@/components/SemanticSearch";

export default function SchemesPage() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");

  useEffect(() => {
    async function loadSchemes() {
      try {
        const response = await fetch("/api/schemes");

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load schemes");
        }

        setSchemes(data.schemes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSchemes();
  }, []);

const filteredSchemes = useMemo(() => {
  const searchTerms = search
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return schemes.filter((scheme) => {
    const matchesLevel =
      level === "all" ||
      scheme.government_level === level;

    const searchable = [
      scheme.scheme_code,
      scheme.scheme_name,
      scheme.government_level,
      scheme.state_name,
      scheme.department,
      scheme.scheme_type,
      scheme.description,
      scheme.benefit_summary,
      ...(scheme.categories || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      searchTerms.length === 0 ||
      searchTerms.every((term) =>
        searchable.includes(term)
      );

    return matchesLevel && matchesSearch;
  });
}, [schemes, search, level]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p>Loading schemes...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-2xl font-bold text-red-600">
          Unable to load schemes
        </h1>

        <p className="mt-2">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-900 px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-300">
            Government / State Scheme Eligibility Finder
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Scheme Catalogue
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Browse national and Karnataka government schemes
            stored in our PostgreSQL database.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <SemanticSearch />

        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_220px]">
          <input
            type="text"
            placeholder="Search by scheme, department, category..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-600"
          />

          <select
            value={level}
            onChange={(event) =>
              setLevel(event.target.value)
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
          >
            <option value="all">
              All government levels
            </option>

            <option value="national">
              National
            </option>

            <option value="state">
              Karnataka State
            </option>
          </select>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Available Schemes
          </h2>

          <span className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800">
            {filteredSchemes.length} schemes
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredSchemes.map((scheme) => (
            <article
              key={scheme.scheme_id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {scheme.scheme_code}
                </span>

                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold capitalize text-teal-700">
                  {scheme.government_level}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900">
                {scheme.scheme_name}
              </h3>

              <p className="mt-2 text-sm font-medium text-slate-500">
                {scheme.department}
              </p>

              <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">
                {scheme.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(scheme.categories || []).map(
                  (category) => (
                    <span
                      key={category}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {category}
                    </span>
                  )
                )}
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Benefit
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {scheme.benefit_summary ||
                    "Benefit information not available."}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-3 pt-5">
                <Link
                  href={`/schemes/${scheme.scheme_code}`}
                  className="inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  View Details
                </Link>

                {scheme.source_url && (
                  <a
                    href={scheme.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Official Website
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {filteredSchemes.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center">
            <h3 className="text-lg font-semibold">
              No schemes found
            </h3>

            <p className="mt-2 text-slate-500">
              Try another search term or filter.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}