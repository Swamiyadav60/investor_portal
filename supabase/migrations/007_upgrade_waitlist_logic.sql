-- Function to upgrade a FREE waitlist entry to PRIORITY
CREATE OR REPLACE FUNCTION upgrade_to_priority(
  p_waitlist_id UUID,
  p_payment_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_college_id UUID;
  v_new_pos INTEGER;
  v_last_priority_pos INTEGER;
BEGIN
  -- 1. Get the college ID for this waitlist entry
  SELECT college_id INTO v_college_id
  FROM waitlists
  WHERE id = p_waitlist_id AND waitlist_type = 'free';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found or already priority';
  END IF;

  -- 2. Find the position after the last priority user for this college
  SELECT COALESCE(MAX(queue_position), 0)
  INTO v_last_priority_pos
  FROM waitlists
  WHERE college_id = v_college_id AND waitlist_type = 'priority';

  v_new_pos := v_last_priority_pos + 1;

  -- 3. Shift all FREE users down by 1 (who are at or after the new position)
  -- Actually, since we're moving ONE user from Free to Priority, 
  -- we should just update everyone's position correctly.
  
  -- Shift all users who were previously above this user's NEW position down
  UPDATE waitlists
  SET queue_position = queue_position + 1
  WHERE college_id = v_college_id AND waitlist_type = 'free' AND queue_position >= v_new_pos;

  -- 4. Update the specific waitlist entry to Priority
  UPDATE waitlists
  SET 
    waitlist_type = 'priority',
    queue_position = v_new_pos,
    status = 'approved',
    razorpay_payment_id = p_payment_id,
    notes = COALESCE(notes, '') || ' (Upgraded to Priority)',
    updated_at = NOW()
  WHERE id = p_waitlist_id;

  RETURN v_new_pos;
END;
$$ LANGUAGE plpgsql;
