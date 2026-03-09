import { NextResponse } from "next/server";

import { createSSRSassClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSSRSassClient();
  const client = supabase.getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await client
    .from("listing_audits")
    .select("*")
    .eq("id", id)
    .eq("owner", user.id)
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: "Audit not found.",
        details: error.message,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ audit: data });
}
