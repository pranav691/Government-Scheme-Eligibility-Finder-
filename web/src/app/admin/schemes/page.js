import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import AdminSchemesList from "./AdminSchemesList";

async function AdminSchemesContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  return <AdminSchemesList />;
}

export default function AdminSchemesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading schemes...
        </main>
      }
    >
      <AdminSchemesContent />
    </Suspense>
  );
}