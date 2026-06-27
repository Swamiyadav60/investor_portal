import { createClient } from "npm:@supabase/supabase-js@2";

const friendSupabase = createClient(
  Deno.env.get("FRIEND_SUPABASE_URL")!,
  Deno.env.get("FRIEND_SERVICE_ROLE_KEY")!
);

const mySupabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    // Read one revenue row from friend's DB
    const { data: revenues, error: revenueError } = await friendSupabase
      .from("branch_daily_revenue")
      .select("*");

    if (revenueError) throw revenueError;
    let synced = 0;
    let skipped = 0;

    for (const revenue of revenues ?? []) {

    // Find kiosk mapping
    const { data: mapping, error: mappingError } = await mySupabase
      .from("branch_mapping")
      .select("my_kiosk_id")
      .eq("friend_branch_id", revenue.branch_id)
      .single();
    if (mappingError) {
      console.error("Mapping error:", mappingError);
      skipped++;
      continue;
    }

    if (!mapping) {
      console.log(`No mapping found for ${revenue.branch_name}`);
      skipped++;
      continue;
    }

    // Save into your revenues table
    const { error: insertError } = await mySupabase
      .from("revenues")
      .upsert(
        {
          friend_branch_id: revenue.branch_id,
          kiosk_id: mapping.my_kiosk_id,

          amount:
            Number(revenue.upi_revenue) +
            Number(revenue.wallet_amount),

          print_jobs:
            Number(revenue.upi_jobs) +
            Number(revenue.wallet_jobs),

          period_start: revenue.revenue_date,
          period_end: revenue.revenue_date,
          period_type: "daily",
        },
        {
          onConflict: "friend_branch_id,period_start",
        }
      );
      

      if (insertError) throw insertError;

      synced++;
    

    
    }

    return new Response(
  JSON.stringify({
    success: true,
    synced,
    skipped,
    total: revenues?.length ?? 0,
  }),
  {
    headers: {
      "Content-Type": "application/json",
    },
  }
);
  } catch (err) {
  console.error(err);

  return new Response(
    JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
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