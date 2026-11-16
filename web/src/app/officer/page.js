import OfficerApplications from "./OfficerApplications";

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

async function OfficerContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "officer") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
                Officer Dashboard
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Application Review
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

          <OfficerApplications />
          
        </div>

      </div>
    </main>
  );
}

export default function OfficerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading officer dashboard...
        </main>
      }
    >
      <OfficerContent />
    </Suspense>
  );
}