-- Enable Realtime for core tables
-- This fix was applied to resolve the issue where room status updates 
-- were not synchronizing across clients.

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;
