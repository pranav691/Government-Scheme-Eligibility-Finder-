import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import AdminApplicationsList from "./AdminApplicationsList";

async function AdminApplicationsContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  return <AdminApplicationsList />;
}

export default function AdminApplicationsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading applications...
        </main>
      }
    >
      <AdminApplicationsContent />
    </Suspense>
  );
}
