import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user: {
        userId: Number(session.userId),
        email: session.email,
        role: session.role,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to verify session.",
      },
      { status: 500 }
    );
  }
}