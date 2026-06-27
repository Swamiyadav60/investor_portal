import { createClient } from "npm:@supabase/supabase-js@2";

const friendSupabase = createClient(
  Deno.env.get("FRIEND_SUPABASE_URL")!,
  Deno.env.get("FRIEND_SERVICE_ROLE_KEY")!
);

const mySupabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const secret = Deno.env.get("SYNC_SECRET");

  if (req.headers.get("x-sync-secret") !== secret) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  try {
    // Read one revenue row from friend's DB
    const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 7);

const { data: revenues, error: revenueError } = await friendSupabase
  .from("branch_daily_revenue")
  .select("*")
  .gte("revenue_date", fromDate.toISOString().split("T")[0]);

    if (revenueError) throw revenueError;
    let synced = 0;
    let skipped = 0;

    const { data: mappings, error: mappingLoadError } = await mySupabase
  .from("branch_mapping")
  .select("friend_branch_id, my_kiosk_id");

if (mappingLoadError) throw mappingLoadError;

const mappingMap = new Map<string, string>(
  (mappings ?? []).map((m: {
    friend_branch_id: string;
    my_kiosk_id: string;
  }) => [m.friend_branch_id, m.my_kiosk_id])
);
const kiosksToUpdate = new Set<string>();
    for (const revenue of revenues ?? []) {

    // Find kiosk mapping
    const kioskId = mappingMap.get(revenue.branch_id);

if (!kioskId) {
    skipped++;
    continue;
}
    // Save into your revenues table
    const { error: insertError } = await mySupabase
      .from("revenues")
      .upsert(
        {
          friend_branch_id: revenue.branch_id,
          kiosk_id: kioskId,

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

        kiosksToUpdate.add(kioskId);

      synced++;
    

    
    }
    for (const kioskId of kiosksToUpdate) {
  const { error } = await mySupabase.rpc("update_kiosk_stats", {
    p_kiosk_id: kioskId,
  });

  if (error) {
    console.error(`Failed to update stats for ${kioskId}:`, error);
  }
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