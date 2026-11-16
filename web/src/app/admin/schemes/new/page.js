import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import NewSchemeForm from "./NewSchemeForm";

async function NewSchemeContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  return <NewSchemeForm />;
}

export default function NewSchemePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading...
        </main>
      }
    >
      <NewSchemeContent />
    </Suspense>
  );
}
