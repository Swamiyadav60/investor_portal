-- Add branch_ambassador to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branch_ambassador';

-- Add assigned_college_id to investors table (profile)
-- This allows linking an ambassador to a specific college they manage or represent
ALTER TABLE investors ADD COLUMN IF NOT EXISTS assigned_college_id UUID REFERENCES colleges(id) ON DELETE SET NULL;

-- Update the handle_new_user function if needed (though it defaults to 'investor' which is fine)
-- We can add logic to detect role from metadata if we want, but usually admins assign roles.
