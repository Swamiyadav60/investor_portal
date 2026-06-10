-- Seed data for development/demo
-- Note: Run after creating an admin user via Supabase Auth
-- Update the user_id below after first admin signup

-- Sample colleges
INSERT INTO colleges (name, location, city, type, slots_total, slots_taken, investment_amount, avg_monthly_earnings, tag, tag_label) VALUES
  ('Secunderabad Station', 'High-footfall transit hub · Sec''bad', 'Hyderabad', 'transit', 4, 3, 25000, 5600, 'hot', '🔥 Hot'),
  ('JNTU College Gate', 'Engineering college cluster · Kukatpally', 'Hyderabad', 'college', 3, 0, 22000, 4800, 'new', 'New'),
  ('Dilsukhnagar Market', 'Retail-dense commercial belt', 'Hyderabad', 'commercial', 2, 1, 23000, 4200, 'limited', '1 left'),
  ('HITEC City Signal', 'Tech-worker commuter hotspot · Madhapur', 'Hyderabad', 'transit', 3, 2, 26000, 6100, 'hot', '🔥 Hot'),
  ('Osmania University', 'Large campus, heavy print demand', 'Hyderabad', 'college', 4, 1, 21000, 5100, 'new', 'New'),
  ('Mehdipatnam Bus Stand', 'High-density commuter stop · SW Hyd', 'Hyderabad', 'transit', 3, 1, 22000, 4500, 'limited', '2 left'),
  ('Madhapur IT Park', 'Corporate campus · Madhapur', 'Hyderabad', 'commercial', 5, 3, 25000, 5800, 'hot', '🔥 Hot'),
  ('Kukatpally HB', 'Residential hub · Kukatpally', 'Hyderabad', 'commercial', 3, 2, 25000, 5200, 'new', 'New'),
  ('LB Nagar Junction', 'Metro junction · LB Nagar', 'Hyderabad', 'transit', 2, 1, 25000, 4900, 'limited', '1 left'),
  ('Ameerpet Metro Station', 'Metro interchange · Ameerpet', 'Hyderabad', 'transit', 4, 3, 25000, 5500, 'hot', '🔥 Hot');
