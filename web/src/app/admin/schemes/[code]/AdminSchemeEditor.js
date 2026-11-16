"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import RuleEditor from "./RuleEditor";

function dateValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function AdminSchemeEditor() {
  const params = useParams();
  const code = params.code;

  const [scheme, setScheme] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadScheme() {
      try {
        const response = await fetch(
          `/api/admin/schemes/${encodeURIComponent(code)}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load scheme.");
          return;
        }

        setScheme({
          ...data.scheme,
          application_start_date: dateValue(
            data.scheme.application_start_date
          ),
          application_deadline: dateValue(
            data.scheme.application_deadline
          ),
          last_verified_date: dateValue(
            data.scheme.last_verified_date
          ),
        });

        setGroups(data.eligibility_groups || []);
      } catch (error) {
        console.error(error);
        setError("Unable to load scheme.");
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      loadScheme();
    }
  }, [code]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setScheme((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveScheme(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/admin/schemes/${encodeURIComponent(code)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(scheme),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to update scheme.");
        return;
      }

      setScheme({
        ...data.scheme,
        application_start_date: dateValue(
          data.scheme.application_start_date
        ),
        application_deadline: dateValue(
          data.scheme.application_deadline
        ),
        last_verified_date: dateValue(
          data.scheme.last_verified_date
        ),
      });

      setMessage("Scheme updated successfully.");
    } catch (error) {
      console.error(error);
      setError("Unable to update scheme.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading scheme...
      </main>
    );
  }

  if (!scheme) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        {error || "Scheme not found."}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Admin · {scheme.scheme_code}
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Edit Scheme
            </h1>
          </div>

          <Link
            href="/admin/schemes"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Back to Schemes
          </Link>
        </div>

        <form
          onSubmit={saveScheme}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">

            <Field
              label="Scheme Name"
              name="scheme_name"
              value={scheme.scheme_name || ""}
              onChange={handleChange}
            />

            <Field
              label="Department"
              name="department"
              value={scheme.department || ""}
              onChange={handleChange}
            />

            <Field
              label="Scheme Type"
              name="scheme_type"
              value={scheme.scheme_type || ""}
              onChange={handleChange}
            />

            <SelectField
              label="Government Level"
              name="government_level"
              value={scheme.government_level || ""}
              onChange={handleChange}
              options={[
                ["national", "National"],
                ["state", "State"],
              ]}
            />

            {scheme.government_level === "state" && (
              <Field
                label="State"
                name="state_name"
                value={scheme.state_name || ""}
                onChange={handleChange}
              />
            )}

            <SelectField
              label="Application Mode"
              name="application_mode"
              value={scheme.application_mode || ""}
              onChange={handleChange}
              options={[
                ["", "Not specified"],
                ["online", "Online"],
                ["offline", "Offline"],
                ["both", "Both"],
                ["unknown", "Unknown"],
              ]}
            />

            <SelectField
              label="Scheme Status"
              name="scheme_status"
              value={scheme.scheme_status}
              onChange={handleChange}
              options={[
                ["upcoming", "Upcoming"],
                ["open", "Open"],
                ["closed", "Closed"],
                ["expired", "Expired"],
              ]}
            />

            <SelectField
              label="Verification Status"
              name="verification_status"
              value={scheme.verification_status}
              onChange={handleChange}
              options={[
                ["unverified", "Unverified"],
                ["verified", "Verified"],
                ["needs_review", "Needs Review"],
              ]}
            />

            <Field
              label="Academic Year"
              name="academic_year"
              value={scheme.academic_year || ""}
              onChange={handleChange}
            />

            <Field
              label="Application Start Date"
              name="application_start_date"
              type="date"
              value={scheme.application_start_date}
              onChange={handleChange}
            />

            <Field
              label="Application Deadline"
              name="application_deadline"
              type="date"
              value={scheme.application_deadline}
              onChange={handleChange}
            />

            <Field
              label="Last Verified Date"
              name="last_verified_date"
              type="date"
              value={scheme.last_verified_date}
              onChange={handleChange}
            />

            <Field
              label="Application URL"
              name="application_url"
              value={scheme.application_url || ""}
              onChange={handleChange}
            />

            <Field
              label="Official Source URL"
              name="source_url"
              value={scheme.source_url || ""}
              onChange={handleChange}
            />
          </div>

          <div className="mt-5">
            <TextArea
              label="Description"
              name="description"
              value={scheme.description || ""}
              onChange={handleChange}
            />
          </div>

          <div className="mt-5">
            <TextArea
              label="Benefit Summary"
              name="benefit_summary"
              value={scheme.benefit_summary || ""}
              onChange={handleChange}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                checked={Boolean(scheme.is_active)}
                onChange={handleChange}
              />

              <span>Active Scheme</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="eligibility_rules_complete"
                checked={Boolean(
                  scheme.eligibility_rules_complete
                )}
                onChange={handleChange}
              />

              <span>Eligibility Rules Complete</span>
            </label>
          </div>

          {message && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-400 px-6 py-3 font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Scheme Changes"}
            </button>
          </div>
        </form>

        {/* Eligibility Rules */}
        
        <RuleEditor code={code} initialGroups={groups} />

      </div>
    </main>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-teal-400"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-teal-400"
      >
        {options.map(([optionValue, label]) => (
          <option
            key={optionValue || "blank"}
            value={optionValue}
          >
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-teal-400"
      />
    </div>
  );
}

function ruleValue(rule) {
  if (rule.value_type === "numeric") {
    return String(rule.numeric_value);
  }

  if (rule.value_type === "boolean") {
    return rule.boolean_value ? "True" : "False";
  }

  return rule.text_value;
}