import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const subject = claims?.sub;

    if (error || !claims || typeof subject !== "string") {
      return null;
    }

    const email = claims.email;

    return {
      id: subject,
      email: typeof email === "string" ? email : undefined,
    };
  } catch {
    return null;
  }
}
