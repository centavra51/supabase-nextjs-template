import { NextResponse } from "next/server";

import { createSSRSassClient } from "@/lib/supabase/server";
import { getUsageSnapshot } from "@/lib/usage/limits";

export async function GET() {
  const supabase = await createSSRSassClient();
  const client = supabase.getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usage = await getUsageSnapshot(client, user.id);
    return NextResponse.json({ usage });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load usage.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
