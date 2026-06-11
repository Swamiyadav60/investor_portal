-- Function to get admin dashboard KPIs
CREATE OR REPLACE FUNCTION get_admin_kpis()
RETURNS TABLE (
  total_colleges BIGINT,
  available_slots BIGINT,
  free_waitlists BIGINT,
  priority_waitlists BIGINT,
  priority_waitlist_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM public.colleges) AS total_colleges,
    (SELECT COALESCE(SUM(slots_total - slots_taken), 0)::BIGINT FROM public.colleges WHERE is_active = TRUE) AS available_slots,
    (SELECT COUNT(*)::BIGINT FROM public.waitlists WHERE waitlist_type = 'free' AND status = 'pending') AS free_waitlists,
    (SELECT COUNT(*)::BIGINT FROM public.waitlists WHERE waitlist_type = 'priority' AND status = 'approved') AS priority_waitlists,
    (SELECT COALESCE(SUM(499), 0)::NUMERIC FROM public.waitlists WHERE waitlist_type = 'priority' AND razorpay_payment_id IS NOT NULL AND status = 'approved') AS priority_waitlist_revenue;
END;
$$;
