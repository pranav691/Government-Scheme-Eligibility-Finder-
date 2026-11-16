import { deleteSession } from "@/lib/session";

export async function POST() {
  try {
    await deleteSession();

    return Response.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to log out.",
      },
      { status: 500 }
    );
  }
}