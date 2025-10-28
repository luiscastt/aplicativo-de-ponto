import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gfoogchxvxjfqwulgrbb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmb29nY2h4dnhqZnF3dWxncmJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg3ODIsImV4cCI6MjA3NzIzNDc4Mn0.ZERsAMY-0EZ2jWg3j2gnhM6-sYIgEouWRYkKSW9LT8M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);