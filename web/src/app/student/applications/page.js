import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import ApplicationsList from "./ApplicationsList";

async function ApplicationsContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "student") {
    redirect("/");
  }

  return <ApplicationsList />;
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading applications...
        </main>
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}