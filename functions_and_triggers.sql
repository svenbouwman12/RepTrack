-- Functions and Triggers for RepTrack
-- Run this AFTER tables and policies are created

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, public_leaderboard)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', COALESCE((NEW.raw_user_meta_data->>'public_leaderboard')::boolean, false));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_workouts_updated_at ON public.workouts;
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;

-- Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON public.workouts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tables (ignore errors if already added)
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
    END;
END $$;
