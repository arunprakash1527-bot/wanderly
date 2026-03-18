import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bwahdnkptexvvsoofidg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3YWhkbmtwdGV4dnZzb29maWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjMyNTgsImV4cCI6MjA4OTQzOTI1OH0.0XeadG7jWY3_n39SUfI0zImB4NUKK1RLo37gYrGONGs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
