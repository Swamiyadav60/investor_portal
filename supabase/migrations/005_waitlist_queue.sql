-- Add waitlist type and queue position
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS waitlist_type TEXT DEFAULT 'free'; -- 'free', 'priority'
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS queue_position INTEGER;

-- Function to get the next queue position for a college
CREATE OR REPLACE FUNCTION get_next_queue_position(p_college_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_pos INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1
  INTO v_pos
  FROM waitlists
  WHERE college_id = p_college_id;
  
  RETURN v_pos;
END;
$$ LANGUAGE plpgsql;
