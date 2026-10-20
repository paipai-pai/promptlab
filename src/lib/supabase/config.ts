import { z } from "zod";

const supabaseConfigSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(1),
});

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;

function readSupabaseConfig() {
  return supabaseConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function isSupabaseConfigured() {
  return readSupabaseConfig().success;
}

export function getSupabaseConfig(): SupabaseConfig {
  const result = readSupabaseConfig();

  if (!result.success) {
    throw new Error(
      "Supabase 未配置。请根据 .env.example 设置公开项目 URL 和 publishable key。",
    );
  }

  return result.data;
}
