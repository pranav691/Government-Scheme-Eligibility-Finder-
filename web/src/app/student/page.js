import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

async function StudentContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "student") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

          <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
            Student Dashboard
          </p>

          <div className="mt-3 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">
                Welcome
            </h1>

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

          <div className="mt-8 grid gap-4 md:grid-cols-3">

          <Link
            href="/student/profile"
            className="rounded-2xl border border-slate-800 p-5 transition hover:border-teal-400 hover:bg-slate-800/50"
          >
            <h2 className="font-semibold">
                My Profile
            </h2>

            <p className="mt-2 text-sm text-slate-400">
                Complete your details for eligibility checking.
            </p>
          </Link>

            <Link
                href="/schemes"
                className="rounded-2xl border border-slate-800 p-5 transition hover:border-teal-400 hover:bg-slate-800/50"
            >
            <h2 className="font-semibold">
                Find Schemes
            </h2>

            <p className="mt-2 text-sm text-slate-400">
                Explore schemes and check your eligibility.
            </p>
            </Link>

            <Link
                href="/student/applications"
                className="rounded-2xl border border-slate-800 p-5 transition hover:border-teal-400 hover:bg-slate-800/50"
            >
            <h2 className="font-semibold">
                My Applications
            </h2>

            <p className="mt-2 text-sm text-slate-400">
                Track your scheme applications.
            </p>
            </Link>

          </div>

        </div>
      </div>
    </main>
  );
}

function LoadingStudent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-slate-400">
        Loading student dashboard...
      </p>
    </main>
  );
}

export default function StudentPage() {
  return (
    <Suspense fallback={<LoadingStudent />}>
      <StudentContent />
    </Suspense>
  );
}