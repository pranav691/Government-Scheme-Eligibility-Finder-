import Link from "next/link";

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

async function AdminContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
                Admin Dashboard
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Scheme Finder Administration
              </h1>
            </div>

            <LogoutButton />
          </div>

          <div className="mt-6 rounded-2xl bg-slate-950 p-5">
            <p>
              <span className="text-slate-400">User ID:</span>{" "}
              {session.userId}
            </p>

            <p className="mt-2">
              <span className="text-slate-400">Email:</span>{" "}
              {session.email}
            </p>

            <p className="mt-2">
              <span className="text-slate-400">Role:</span>{" "}
              {session.role}
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">

            <Link
                href="/admin/users"
                className="rounded-2xl border border-slate-800 p-6 transition hover:border-teal-400 hover:bg-slate-800/50"
            >
                <h2 className="text-xl font-semibold">
                    Users
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                    View registered students, officers and administrators.
                </p>
            </Link>

            <Link
                href="/admin/schemes"
                className="rounded-2xl border border-slate-800 p-6 transition hover:border-teal-400 hover:bg-slate-800/50"
            >
                <h2 className="text-xl font-semibold">
                    Scheme Management
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                    Manage schemes, eligibility rules, categories and documents.
                </p>
            </Link>

            <Link
                href="/admin/applications"
                className="rounded-2xl border border-slate-800 p-6 transition hover:border-teal-400 hover:bg-slate-800/50"
            >
                <h2 className="text-xl font-semibold">
                    Applications
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                    Review all student applications and their status history.
                </p>
            </Link>

            <Link
                href="/admin/embeddings"
                className="rounded-2xl border border-slate-800 p-6 transition hover:border-teal-400 hover:bg-slate-800/50"
            >
                <h2 className="text-xl font-semibold">
                    Vector Embeddings
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                    Read, update and delete the pgvector search data.
                </p>
            </Link>

          </div>

        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading admin dashboard...
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}