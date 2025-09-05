// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Ganti dengan URL & anon key dari project Supabase kamu
const SUPABASE_URL = "https://zvqlsgwccrdqjgcxgmzq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWxzZ3djY3JkcWpnY3hnbXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNTc0MDUsImV4cCI6MjA3MjYzMzQwNX0.6Ge1ON_x9Ce-l4tFRtH_Ks9o3v1RouLIDejtbohjo4Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
