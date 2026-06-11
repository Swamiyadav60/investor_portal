-- Refine queue logic to handle Priority vs Free
-- Priority users always rank before Free users.
-- When a Priority user joins, they are placed after the last Priority user but before the first Free user.

CREATE OR REPLACE FUNCTION join_waitlist(
  p_investor_id UUID,
  p_college_id UUID,
  p_waitlist_type TEXT, -- 'free' or 'priority'
  p_payment_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_pos INTEGER;
  v_last_priority_pos INTEGER;
BEGIN
  IF p_waitlist_type = 'priority' THEN
    -- 1. Find the position after the last priority user
    SELECT COALESCE(MAX(queue_position), 0)
    INTO v_last_priority_pos
    FROM waitlists
    WHERE college_id = p_college_id AND waitlist_type = 'priority';

    v_new_pos := v_last_priority_pos + 1;

    -- 2. Shift all FREE users down by 1
    UPDATE waitlists
    SET queue_position = queue_position + 1
    WHERE college_id = p_college_id AND waitlist_type = 'free' AND queue_position >= v_new_pos;

  ELSE
    -- For FREE users, they just go to the end
    SELECT COALESCE(MAX(queue_position), 0) + 1
    INTO v_new_pos
    FROM waitlists
    WHERE college_id = p_college_id;
  END IF;

  -- 3. Insert the new waitlist record
  INSERT INTO waitlists (
    investor_id, 
    college_id, 
    waitlist_type, 
    queue_position, 
    status, 
    razorpay_payment_id, 
    notes
  )
  VALUES (
    p_investor_id, 
    p_college_id, 
    p_waitlist_type, 
    v_new_pos, 
    CASE WHEN p_waitlist_type = 'priority' THEN 'approved'::waitlist_status ELSE 'pending'::waitlist_status END,
    p_payment_id, 
    p_notes
  );

  RETURN v_new_pos;
END;
$$ LANGUAGE plpgsql;
