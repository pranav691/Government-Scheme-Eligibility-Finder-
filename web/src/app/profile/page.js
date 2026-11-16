import { redirect } from "next/navigation";

// The early prototype profile form lived here. It was not connected to
// the database and was not protected, so send visitors to the real,
// signed-in student profile page instead.
export default function LegacyProfilePage() {
  redirect("/student/profile");
}
