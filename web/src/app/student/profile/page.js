import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import ProfileForm from "./ProfileForm";

async function ProfileContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "student") {
    redirect("/");
  }

  return <ProfileForm />;
}

export default function StudentProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading profile...
        </main>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}