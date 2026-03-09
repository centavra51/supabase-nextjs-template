import { redirect } from "next/navigation";

import { createSSRClient } from "@/lib/supabase/server";

export default async function Home() {
  const client = await createSSRClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    redirect("/app/audit");
  }

  redirect("/auth/login");
}
