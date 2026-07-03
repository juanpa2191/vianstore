import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Signout endpoint. Route handler (no server action) para poder invocarlo
 * desde un `<form method="POST" action="/auth/signout">` en cualquier RSC
 * sin necesidad de client-side JS.
 *
 * Después de cerrar sesión redirigimos a `/`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[auth/signout] signOut failed:", error.message);
    }
  }

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
