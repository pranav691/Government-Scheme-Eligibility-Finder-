import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import AdminUsersList from "./AdminUsersList";

async function AdminUsersContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  return <AdminUsersList />;
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading users...
        </main>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}