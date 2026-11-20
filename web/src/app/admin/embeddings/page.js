import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import AdminEmbeddingsList from "./AdminEmbeddingsList";

async function AdminEmbeddingsContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  return <AdminEmbeddingsList />;
}

export default function AdminEmbeddingsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading embeddings...
        </main>
      }
    >
      <AdminEmbeddingsContent />
    </Suspense>
  );
}
