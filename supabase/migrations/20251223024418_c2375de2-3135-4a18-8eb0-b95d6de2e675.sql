-- Add target_score column to profiles table
ALTER TABLE public.profiles ADD COLUMN target_score numeric DEFAULT 7.0;

-- Update RLS policies to allow users to update their target_score
-- (Already covered by existing "Users can update their own profile" policy)