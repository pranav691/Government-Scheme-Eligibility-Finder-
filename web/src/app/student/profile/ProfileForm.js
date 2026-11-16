"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const initialProfile = {
  date_of_birth: "",
  gender: "",
  domicile_state: "",
  district: "",
  residence_type: "",
  social_category: "",

  minority_status: "",
  disability_status: "",
  disability_percentage: "",
  annual_family_income: "",

  current_course: "",
  degree_level: "",
  year_of_study: "",
  institution_name: "",
  institution_approval_body: "",
  marks_percentage: "",
  cgpa: "",
  class_12_percentage: "",
  class_12_percentile: "",
  admission_entry_type: "",
  aicte_approved_degree: "",

  employment_status: "",
  unemployment_days: "",
  self_employed: "",
  artisan_status: "",
  weaver_status: "",
  training_status: "",

  parent_occupation: "",
  parent_service_status: "",
  parent_martyred_status: "",

  orphan_status: "",
  parental_death_covid: "",
  other_scholarship: "",

  currently_studying: "",
  hosteller: "",
  hostel_available: "",
  distance_km: "",
  beneficiary_siblings: "",
};

function normaliseProfile(profile) {
  const output = { ...initialProfile };

  for (const key of Object.keys(output)) {
    const value = profile?.[key];

    if (value === null || value === undefined) {
      output[key] = "";
    } else if (typeof value === "boolean") {
      output[key] = value ? "true" : "false";
    } else {
      output[key] = String(value);
    }
  }

  return output;
}

function TextInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400"
      />
    </div>
  );
}

function SelectInput({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-teal-400"
      >
        <option value="">Not specified</option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BooleanInput({
  label,
  name,
  value,
  onChange,
}) {
  return (
    <SelectInput
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      options={[
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ]}
    />
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-slate-400">
            {description}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export default function ProfileForm() {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/student/profile", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load profile.");
          return;
        }

        if (data.profile) {
          setProfile(normaliseProfile(data.profile));
        }
      } catch (error) {
        console.error(error);
        setError("Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/student/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to save profile.");
        return;
      }

      setProfile(normaliseProfile(data.profile));
      setMessage("Profile saved successfully.");
    } catch (error) {
      console.error(error);
      setError("Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading profile...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Student Profile
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Eligibility Information
            </h1>

            <p className="mt-2 text-slate-400">
              These details are used by the eligibility rules.
            </p>
          </div>

          <Link
            href="/student"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          <Section
            title="Personal & Residence"
            description="Basic demographic and domicile information."
          >
            <TextInput
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              value={profile.date_of_birth}
              onChange={handleChange}
            />

            <SelectInput
              label="Gender"
              name="gender"
              value={profile.gender}
              onChange={handleChange}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "other", label: "Other" },
                {
                  value: "prefer_not_to_say",
                  label: "Prefer not to say",
                },
              ]}
            />

            <TextInput
              label="Domicile State"
              name="domicile_state"
              value={profile.domicile_state}
              onChange={handleChange}
            />

            <TextInput
              label="District"
              name="district"
              value={profile.district}
              onChange={handleChange}
            />

            <SelectInput
              label="Residence Type"
              name="residence_type"
              value={profile.residence_type}
              onChange={handleChange}
              options={[
                { value: "rural", label: "Rural" },
                { value: "urban", label: "Urban" },
                { value: "semi_urban", label: "Semi Urban" },
                { value: "other", label: "Other" },
              ]}
            />

            <TextInput
              label="Social Category"
              name="social_category"
              value={profile.social_category}
              onChange={handleChange}
            />

            <BooleanInput
              label="Minority Community"
              name="minority_status"
              value={profile.minority_status}
              onChange={handleChange}
            />

            <TextInput
              label="Annual Family Income"
              name="annual_family_income"
              type="number"
              min="0"
              step="0.01"
              value={profile.annual_family_income}
              onChange={handleChange}
            />
          </Section>

          <Section
            title="Education"
            description="Current study and academic information."
          >
            <TextInput
              label="Current Course"
              name="current_course"
              value={profile.current_course}
              onChange={handleChange}
            />

            <TextInput
              label="Degree Level"
              name="degree_level"
              value={profile.degree_level}
              onChange={handleChange}
            />

            <TextInput
              label="Year of Study"
              name="year_of_study"
              type="number"
              min="1"
              max="10"
              value={profile.year_of_study}
              onChange={handleChange}
            />

            <TextInput
              label="Institution Name"
              name="institution_name"
              value={profile.institution_name}
              onChange={handleChange}
            />

            <TextInput
              label="Institution Approval Body"
              name="institution_approval_body"
              value={profile.institution_approval_body}
              onChange={handleChange}
            />

            <TextInput
              label="Marks Percentage"
              name="marks_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={profile.marks_percentage}
              onChange={handleChange}
            />

            <TextInput
              label="CGPA"
              name="cgpa"
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={profile.cgpa}
              onChange={handleChange}
            />

            <TextInput
              label="Class 12 Percentage"
              name="class_12_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={profile.class_12_percentage}
              onChange={handleChange}
            />

            <TextInput
              label="Class 12 Percentile"
              name="class_12_percentile"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={profile.class_12_percentile}
              onChange={handleChange}
            />

            <SelectInput
              label="Admission Entry Type"
              name="admission_entry_type"
              value={profile.admission_entry_type}
              onChange={handleChange}
              options={[
                {
                  value: "first_year",
                  label: "First Year",
                },
                {
                  value: "lateral_entry",
                  label: "Lateral Entry",
                },
                {
                  value: "other",
                  label: "Other",
                },
              ]}
            />

            <BooleanInput
              label="AICTE Approved Degree"
              name="aicte_approved_degree"
              value={profile.aicte_approved_degree}
              onChange={handleChange}
            />

            <BooleanInput
              label="Currently Studying"
              name="currently_studying"
              value={profile.currently_studying}
              onChange={handleChange}
            />
          </Section>

          <Section
            title="Employment & Special Circumstances"
            description="Employment, disability and occupation-related eligibility information."
          >
            <TextInput
              label="Employment Status"
              name="employment_status"
              value={profile.employment_status}
              onChange={handleChange}
            />

            <TextInput
              label="Unemployment Days"
              name="unemployment_days"
              type="number"
              min="0"
              value={profile.unemployment_days}
              onChange={handleChange}
            />

            <BooleanInput
              label="Self Employed"
              name="self_employed"
              value={profile.self_employed}
              onChange={handleChange}
            />

            <BooleanInput
              label="Artisan"
              name="artisan_status"
              value={profile.artisan_status}
              onChange={handleChange}
            />

            <BooleanInput
              label="Weaver"
              name="weaver_status"
              value={profile.weaver_status}
              onChange={handleChange}
            />

            <BooleanInput
              label="Training Status"
              name="training_status"
              value={profile.training_status}
              onChange={handleChange}
            />

            <BooleanInput
              label="Disability"
              name="disability_status"
              value={profile.disability_status}
              onChange={handleChange}
            />

            <TextInput
              label="Disability Percentage"
              name="disability_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={profile.disability_percentage}
              onChange={handleChange}
            />
          </Section>

          <Section
            title="Family & Other Circumstances"
            description="Family circumstances used by specific scheme rules."
          >
            <TextInput
              label="Parent Occupation"
              name="parent_occupation"
              value={profile.parent_occupation}
              onChange={handleChange}
            />

            <TextInput
              label="Parent Service Status"
              name="parent_service_status"
              value={profile.parent_service_status}
              onChange={handleChange}
            />

            <BooleanInput
              label="Parent Martyred"
              name="parent_martyred_status"
              value={profile.parent_martyred_status}
              onChange={handleChange}
            />

            <BooleanInput
              label="Orphan"
              name="orphan_status"
              value={profile.orphan_status}
              onChange={handleChange}
            />

            <BooleanInput
              label="Parental Death due to COVID"
              name="parental_death_covid"
              value={profile.parental_death_covid}
              onChange={handleChange}
            />

            <BooleanInput
              label="Receiving Another Scholarship"
              name="other_scholarship"
              value={profile.other_scholarship}
              onChange={handleChange}
            />

            <BooleanInput
              label="Hosteller"
              name="hosteller"
              value={profile.hosteller}
              onChange={handleChange}
            />

            <BooleanInput
              label="Hostel Available"
              name="hostel_available"
              value={profile.hostel_available}
              onChange={handleChange}
            />

            <TextInput
              label="Distance from Institution (km)"
              name="distance_km"
              type="number"
              min="0"
              step="0.01"
              value={profile.distance_km}
              onChange={handleChange}
            />

            <TextInput
              label="Beneficiary Siblings"
              name="beneficiary_siblings"
              type="number"
              min="0"
              value={profile.beneficiary_siblings}
              onChange={handleChange}
            />
          </Section>

          {message && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-400 px-8 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}