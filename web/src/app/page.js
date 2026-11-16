import Link from "next/link";

const FEATURES = [
  {
    title: "Rule-based eligibility",
    text: "A PostgreSQL function evaluates your profile against each scheme's rules: AND within a rule group, OR across groups.",
  },
  {
    title: "Smart semantic search",
    text: "Describe what you need in plain words. pgvector finds schemes by meaning, not just keywords.",
  },
  {
    title: "Applications and tracking",
    text: "Create, submit and track applications. Every status change is recorded automatically by a database trigger.",
  },
  {
    title: "Role-based security",
    text: "Separate student, officer and admin areas, each backed by its own least-privilege database role and Row-Level Security.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-300">
            DBMS Mini-Project · PostgreSQL + pgvector + Next.js
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Government / State Scheme Eligibility Finder
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Discover national and Karnataka government schemes, check
            whether you qualify, and apply, all driven by rules stored
            in the database.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/schemes"
              className="rounded-xl bg-teal-500 px-6 py-3 font-semibold text-slate-950 hover:bg-teal-400"
            >
              Browse Schemes
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-slate-600 px-6 py-3 font-semibold hover:bg-slate-800"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-2">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {feature.text}
            </p>
          </article>
        ))}
      </section>

      <p className="mx-auto max-w-5xl px-6 pb-12 text-xs text-slate-500">
        Scheme information is for demonstration only. Always confirm
        eligibility and deadlines on the official scheme website.
      </p>
    </main>
  );
}
