-- ==========================================
-- SYNCROOM PRODUCTION SCHEMA (Sprint 2)
-- Consolidates all tables, policies, and triggers
-- ==========================================

-- 1. PROFILES (Extends Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT,
    username TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. ROOMS (Lifecycle System)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    status TEXT CHECK (status IN ('waiting', 'ready', 'playing', 'finished')) DEFAULT 'waiting',
    max_participants INT DEFAULT 2 CHECK (max_participants > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms viewable by everyone" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Creator can update room" ON public.rooms FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can create" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON public.rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);

-- 3. PARTICIPANTS (Room Connectivity)
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(room_id, user_id)
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by everyone" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON public.participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.participants FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_participants_room_id ON public.participants(room_id);

-- 4. MATCHING SYSTEM (Activity 4)
CREATE TABLE IF NOT EXISTS public.swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    vote BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, target_id)
);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own swipes" ON public.swipes 
    FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_match_pair UNIQUE (user_a, user_b, room_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own matches" ON public.matches
    FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create matches" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- 5. AUTOMATION (Triggers)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger should be linked to auth.users in the dashboard or via SQL
-- Note: Trigger creation on auth schema often requires Superuser or special wrapper.
