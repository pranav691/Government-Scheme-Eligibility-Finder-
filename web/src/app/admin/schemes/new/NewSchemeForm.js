"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-teal-400";

function Field({ label, name, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">{label}</label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "blank"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function NewSchemeForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    scheme_code: "",
    scheme_name: "",
    government_level: "national",
    state_name: "",
    department: "",
    scheme_type: "",
    application_mode: "",
    scheme_status: "upcoming",
    verification_status: "unverified",
    academic_year: "",
    application_start_date: "",
    application_deadline: "",
    application_url: "",
    source_url: "",
    description: "",
    benefit_summary: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create scheme.");
        return;
      }

      // Go straight to the editor so rule groups and rules can be added.
      router.push(
        `/admin/schemes/${encodeURIComponent(data.scheme.scheme_code)}`
      );
    } catch (err) {
      console.error(err);
      setError("Unable to create scheme.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Admin
            </p>

            <h1 className="mt-2 text-3xl font-bold">Add New Scheme</h1>

            <p className="mt-2 text-slate-400">
              After creating the scheme you can add its eligibility rule
              groups and rules.
            </p>
          </div>

          <Link
            href="/admin/schemes"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Back to Schemes
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Scheme Code (e.g. N16)"
              name="scheme_code"
              value={form.scheme_code}
              onChange={handleChange}
              required
            />

            <Field
              label="Scheme Name"
              name="scheme_name"
              value={form.scheme_name}
              onChange={handleChange}
              required
            />

            <SelectField
              label="Government Level"
              name="government_level"
              value={form.government_level}
              onChange={handleChange}
              options={[
                ["national", "National"],
                ["state", "State"],
              ]}
            />

            {form.government_level === "state" && (
              <Field
                label="State"
                name="state_name"
                value={form.state_name}
                onChange={handleChange}
                required
              />
            )}

            <Field
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
            />

            <Field
              label="Scheme Type"
              name="scheme_type"
              value={form.scheme_type}
              onChange={handleChange}
            />

            <SelectField
              label="Application Mode"
              name="application_mode"
              value={form.application_mode}
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
              value={form.scheme_status}
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
              value={form.verification_status}
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
              value={form.academic_year}
              onChange={handleChange}
            />

            <Field
              label="Application Start Date"
              name="application_start_date"
              type="date"
              value={form.application_start_date}
              onChange={handleChange}
            />

            <Field
              label="Application Deadline"
              name="application_deadline"
              type="date"
              value={form.application_deadline}
              onChange={handleChange}
            />

            <Field
              label="Application URL"
              name="application_url"
              value={form.application_url}
              onChange={handleChange}
            />

            <Field
              label="Official Source URL"
              name="source_url"
              value={form.source_url}
              onChange={handleChange}
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm text-slate-300">
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className={inputClass}
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm text-slate-300">
              Benefit Summary
            </label>

            <textarea
              name="benefit_summary"
              value={form.benefit_summary}
              onChange={handleChange}
              rows={3}
              className={inputClass}
            />
          </div>

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
              {saving ? "Creating..." : "Create Scheme"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
