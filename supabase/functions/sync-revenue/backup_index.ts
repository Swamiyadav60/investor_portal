import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    console.log("Starting sync...");

    console.log("Friend URL:", Deno.env.get("FRIEND_SUPABASE_URL"));

    const friendSupabase = createClient(
      Deno.env.get("FRIEND_SUPABASE_URL")!,
      Deno.env.get("FRIEND_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await friendSupabase
      .from("branch_daily_revenue")
      .select("*")
      .limit(1);

    console.log("Data:", data);
    console.log("Error:", error);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("Caught Error:", e);

    return new Response(
      JSON.stringify({
        error: String(e),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});