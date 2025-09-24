-- RepTrack Database Setup
-- Run this in your Supabase SQL Editor

-- Note: auth.users already exists and has RLS enabled by default
-- We don't need to modify auth.users directly

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    public_leaderboard BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workouts table
CREATE TABLE IF NOT EXISTS public.workouts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    weight DECIMAL(5,2) DEFAULT 0,
    reps INTEGER NOT NULL,
    sets INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL,
    granted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_type)
);

-- Row Level Security Policies

-- Enable RLS on public.users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can view own profile" ON public.users
            FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can update own profile" ON public.users
            FOR UPDATE USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can insert own profile" ON public.users
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Workouts policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own workouts' AND tablename = 'workouts') THEN
        CREATE POLICY "Users can view own workouts" ON public.workouts
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own workouts' AND tablename = 'workouts') THEN
        CREATE POLICY "Users can insert own workouts" ON public.workouts
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own workouts' AND tablename = 'workouts') THEN
        CREATE POLICY "Users can update own workouts" ON public.workouts
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own workouts' AND tablename = 'workouts') THEN
        CREATE POLICY "Users can delete own workouts" ON public.workouts
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Teams policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view teams' AND tablename = 'teams') THEN
        CREATE POLICY "Anyone can view teams" ON public.teams
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create teams' AND tablename = 'teams') THEN
        CREATE POLICY "Authenticated users can create teams" ON public.teams
            FOR INSERT WITH CHECK (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team creators can update teams' AND tablename = 'teams') THEN
        CREATE POLICY "Team creators can update teams" ON public.teams
            FOR UPDATE USING (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team creators can delete teams' AND tablename = 'teams') THEN
        CREATE POLICY "Team creators can delete teams" ON public.teams
            FOR DELETE USING (auth.uid() = created_by);
    END IF;
END $$;

-- Team members policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view team members' AND tablename = 'team_members') THEN
        CREATE POLICY "Users can view team members" ON public.team_members
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can join teams' AND tablename = 'team_members') THEN
        CREATE POLICY "Users can join teams" ON public.team_members
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can leave teams' AND tablename = 'team_members') THEN
        CREATE POLICY "Users can leave teams" ON public.team_members
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Permissions policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own permissions' AND tablename = 'permissions') THEN
        CREATE POLICY "Users can view own permissions" ON public.permissions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own permissions' AND tablename = 'permissions') THEN
        CREATE POLICY "Users can update own permissions" ON public.permissions
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own permissions' AND tablename = 'permissions') THEN
        CREATE POLICY "Users can insert own permissions" ON public.permissions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Functions and Triggers

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, public_leaderboard)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', (NEW.raw_user_meta_data->>'public_leaderboard')::boolean);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON public.users
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workouts_updated_at') THEN
        CREATE TRIGGER update_workouts_updated_at
            BEFORE UPDATE ON public.workouts
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_updated_at') THEN
        CREATE TRIGGER update_teams_updated_at
            BEFORE UPDATE ON public.teams
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Enable realtime for tables (only if not already added)
DO $$ 
BEGIN
    -- Add tables to realtime publication if not already there
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workouts') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'teams') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'team_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;
END $$;
