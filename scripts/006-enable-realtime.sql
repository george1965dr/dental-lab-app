-- Enable real-time replication on the cases table
-- This allows the table to broadcast INSERT, UPDATE, DELETE events
-- to subscribed clients via Supabase real-time

-- Enable real-time for the cases table
ALTER PUBLICATION supabase_realtime ADD TABLE cases;

-- Enable real-time for the profiles table (in case we need it later)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Verify real-time is enabled
-- You can check this by running: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
