-- Row Level Security Policies for RepTrack
-- Run this AFTER the tables are created

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Workouts policies
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;

CREATE POLICY "Users can view own workouts" ON public.workouts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON public.workouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts" ON public.workouts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON public.workouts
    FOR DELETE USING (auth.uid() = user_id);

-- Teams policies
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team creators can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team creators can delete teams" ON public.teams;

CREATE POLICY "Anyone can view teams" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team creators can update teams" ON public.teams
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Team creators can delete teams" ON public.teams
    FOR DELETE USING (auth.uid() = created_by);

-- Team members policies
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;

CREATE POLICY "Users can view team members" ON public.team_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join teams" ON public.team_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave teams" ON public.team_members
    FOR DELETE USING (auth.uid() = user_id);

-- Permissions policies
DROP POLICY IF EXISTS "Users can view own permissions" ON public.permissions;
DROP POLICY IF EXISTS "Users can update own permissions" ON public.permissions;
DROP POLICY IF EXISTS "Users can insert own permissions" ON public.permissions;

CREATE POLICY "Users can view own permissions" ON public.permissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own permissions" ON public.permissions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own permissions" ON public.permissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
