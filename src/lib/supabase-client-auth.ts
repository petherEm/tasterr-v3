import { createClient } from "@supabase/supabase-js"

// Create authenticated Supabase client for storage operations
export const createAuthenticatedSupabaseClient = async (getToken: () => Promise<string | null>) => {
  const token = await getToken()
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      }
    }
  )
}