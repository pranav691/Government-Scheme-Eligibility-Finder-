"use client";

import ApplicationButton from "@/components/ApplicationButton";
import EligibilityCheck from "@/components/EligibilityCheck";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function getRuleValue(rule) {
  if (rule.value_type === "numeric") {
    return rule.numeric_value;
  }

  if (rule.value_type === "boolean") {
    return rule.boolean_value ? "True" : "False";
  }

  return rule.text_value;
}

export default function SchemeDetailsPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading scheme...</p>}>
      <SchemeDetails />
    </Suspense>
  );
}

function SchemeDetails() {
  const params = useParams();
  const code = params.code;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;

    async function loadScheme() {
      try {
        const response = await fetch(
          `/api/schemes/${encodeURIComponent(code)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Unable to load scheme"
          );
        }

        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadScheme();
  }, [code]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        Loading scheme...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <h1 className="text-2xl font-bold text-red-600">
          {error}
        </h1>

        <Link
          href="/schemes"
          className="mt-4 inline-block text-blue-700 underline"
        >
          Back to Scheme Catalogue
        </Link>
      </main>
    );
  }

  const {
    scheme,
    categories,
    documents,
    eligibility_groups,
  } = data;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <section className="bg-slate-900 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/schemes"
            className="text-sm text-teal-300 hover:underline"
          >
            ← Back to Scheme Catalogue
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-900">
              {scheme.scheme_code}
            </span>

            <span className="rounded-full bg-teal-500/20 px-3 py-1 text-sm capitalize text-teal-200">
              {scheme.government_level}
            </span>

            <span className="rounded-full bg-slate-700 px-3 py-1 text-sm">
              {scheme.scheme_type}
            </span>
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold">
            {scheme.scheme_name}
          </h1>

          <p className="mt-3 text-slate-300">
            {scheme.department}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[2fr_1fr]">
        {/* MAIN */}
        <div className="space-y-8">
          {/* DESCRIPTION */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              About this Scheme
            </h2>

            <p className="mt-4 leading-7 text-slate-700">
              {scheme.description}
            </p>
          </section>

          {/* BENEFITS */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Benefits
            </h2>

            <p className="mt-4 leading-7 text-slate-700">
              {scheme.benefit_summary ||
                "Benefit information unavailable."}
            </p>
          </section>

          <EligibilityCheck schemeCode={scheme.scheme_code} />

          <ApplicationButton schemeCode={scheme.scheme_code} />

          {/* ELIGIBILITY */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Eligibility Rules
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Conditions within one group are AND.
              Different groups are alternative OR paths.
            </p>

            <div className="mt-6 space-y-5">
              {eligibility_groups.length === 0 ? (
                <p className="text-slate-500">
                  No automated eligibility rules are stored.
                </p>
              ) : (
                eligibility_groups.map((group) => (
                  <div
                    key={group.group_id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <h3 className="font-bold text-slate-900">
                      {group.group_name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Eligibility path {group.group_order}
                    </p>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="pb-2">
                              Attribute
                            </th>

                            <th className="pb-2">
                              Operator
                            </th>

                            <th className="pb-2">
                              Required Value
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {group.rules.map((rule) => (
                            <tr
                              key={rule.rule_id}
                              className="border-b border-slate-100"
                            >
                              <td className="py-3">
                                {rule.attribute_name}
                              </td>

                              <td className="py-3 font-semibold">
                                {rule.operator}
                              </td>

                              <td className="py-3">
                                {String(
                                  getRuleValue(rule)
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* DOCUMENTS */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Required Documents
            </h2>

            <div className="mt-5 space-y-3">
              {documents.length === 0 ? (
                <p className="text-slate-500">
                  No document requirements stored.
                </p>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.document_id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {document.document_name}
                        </p>

                        {document.notes && (
                          <p className="mt-1 text-sm text-slate-500">
                            {document.notes}
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          document.is_mandatory
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {document.is_mandatory
                          ? "Mandatory"
                          : "Optional"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold">
              Scheme Information
            </h2>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">
                  Government Level
                </dt>

                <dd className="font-medium capitalize">
                  {scheme.government_level}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  State
                </dt>

                <dd className="font-medium">
                  {scheme.state_name || "All India"}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Application Mode
                </dt>

                <dd className="font-medium capitalize">
                  {scheme.application_mode || "Unknown"}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Scheme Status
                </dt>

                <dd className="font-medium capitalize">
                  {scheme.scheme_status}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">
                  Verification
                </dt>

                <dd className="font-medium capitalize">
                  {scheme.verification_status}
                </dd>
              </div>
            </dl>
          </section>

          {/* CATEGORIES */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold">
              Categories
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category.category_id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                >
                  {category.category_name}
                </span>
              ))}
            </div>
          </section>

          {/* LINKS */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-bold">
              Official Links
            </h2>

            <div className="mt-4 space-y-3">
              {scheme.source_url && (
                <a
                  href={scheme.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg bg-slate-900 px-4 py-3 text-center font-semibold text-white hover:bg-slate-700"
                >
                  Official Scheme Details
                </a>
              )}

              {scheme.application_url && (
                <a
                  href={scheme.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-slate-300 px-4 py-3 text-center font-semibold"
                >
                  Application Portal
                </a>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}