# RepTrack - Complete Fitness Tracking Webapp

A modern, full-featured fitness tracking webapp built with HTML, CSS, JavaScript, and Supabase. Track workouts, view progress charts, create teams, and compete on leaderboards.

## Features

### 🏋️ Workout Management
- Add, edit, and delete workouts
- Track exercise, weight, reps, and sets
- Drag & drop workout reordering
- Notes and timestamps

### 📊 Progress Visualization
- Interactive Chart.js progress charts
- Exercise-specific progress tracking
- Visual representation of fitness journey

### 👥 Team Features
- Create and join teams
- Team leaderboards
- Collaborative fitness tracking

### 🏆 Leaderboards
- Personal statistics dashboard
- Team rankings
- Public leaderboard (with permission)
- Real-time updates

### 🎨 Modern UI/UX
- Glassmorphism design with gradients
- Skeleton loaders for smooth loading
- Responsive design (desktop, tablet, mobile)
- Smooth animations and transitions
- Drag & drop functionality

## Quick Start

### 1. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to Settings > API
3. Copy your Project URL and anon public key
4. Replace the placeholders in `app.js`:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
   ```

### 2. Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    public_leaderboard BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workouts table
CREATE TABLE public.workouts (
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
CREATE TABLE public.teams (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE public.team_members (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create permissions table
CREATE TABLE public.permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL,
    granted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_type)
);

-- Row Level Security Policies

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Workouts policies
CREATE POLICY "Users can view own workouts" ON public.workouts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON public.workouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts" ON public.workouts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON public.workouts
    FOR DELETE USING (auth.uid() = user_id);

-- Teams policies
CREATE POLICY "Anyone can view teams" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team creators can update teams" ON public.teams
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Team creators can delete teams" ON public.teams
    FOR DELETE USING (auth.uid() = created_by);

-- Team members policies
CREATE POLICY "Users can view team members" ON public.team_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join teams" ON public.team_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave teams" ON public.team_members
    FOR DELETE USING (auth.uid() = user_id);

-- Permissions policies
CREATE POLICY "Users can view own permissions" ON public.permissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own permissions" ON public.permissions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own permissions" ON public.permissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON public.workouts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
```

### 3. Run the Application

1. Open `index.html` in your web browser
2. Sign up for a new account or log in
3. Start tracking your workouts!

## File Structure

```
RepTrack/
├── index.html          # Main HTML structure
├── style.css           # Complete CSS styling
├── app.js             # JavaScript functionality
└── README.md          # This file
```

## Features Breakdown

### Authentication
- Secure login/signup with Supabase Auth
- User profile management
- Public leaderboard permission toggle

### Workout Tracking
- Add workouts with exercise name, weight, reps, sets
- Optional notes for each workout
- Delete workouts with confirmation
- Drag & drop reordering
- Real-time updates

### Progress Visualization
- Chart.js integration for progress charts
- Exercise-specific progress tracking
- Interactive chart selection
- Responsive chart design

### Team Features
- Create teams with name and description
- Join existing teams
- Team leaderboards with member rankings
- Real-time team updates

### Leaderboards
- Personal statistics dashboard
- Team rankings and competitions
- Public leaderboard (opt-in)
- Real-time ranking updates

### UI/UX Features
- Modern glassmorphism design
- Gradient backgrounds and effects
- Skeleton loaders for smooth loading
- Responsive design for all devices
- Smooth animations and transitions
- Drag & drop functionality
- Empty states and error handling

## Customization

### Styling
The CSS uses CSS custom properties (variables) for easy customization:
- `--primary-gradient`: Main gradient background
- `--secondary-gradient`: Secondary gradient for buttons
- `--success-gradient`: Success/positive actions
- `--glass-bg`: Glassmorphism background
- `--border-radius`: Border radius for cards and buttons

### Functionality
The JavaScript is modular and well-commented, making it easy to:
- Add new workout fields
- Modify chart types
- Add new team features
- Customize leaderboard calculations

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security

- Row Level Security (RLS) enabled on all tables
- User data isolation
- Secure authentication with Supabase
- Input validation and sanitization

## Performance

- Lazy loading of data
- Skeleton loaders for better UX
- Optimized database queries
- Real-time updates without polling
- Responsive images and layouts

## Troubleshooting

### Common Issues

1. **Supabase connection errors**
   - Verify your URL and API key
   - Check if your Supabase project is active
   - Ensure RLS policies are set up correctly

2. **Authentication not working**
   - Check if email confirmation is required
   - Verify user metadata is being saved
   - Check browser console for errors

3. **Real-time updates not working**
   - Ensure tables are added to realtime publication
   - Check if RLS policies allow realtime access
   - Verify Supabase realtime is enabled

4. **Charts not displaying**
   - Check if Chart.js is loaded
   - Verify workout data exists
   - Check browser console for errors

### Debug Mode

Enable debug mode by adding this to your browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## Contributing

This is a complete, ready-to-use webapp. To extend it:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase documentation
3. Check browser console for errors
4. Verify database setup

---

**RepTrack** - Track your fitness journey with style! 💪
