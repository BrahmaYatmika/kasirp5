// supabase-config.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Ganti dengan credentials dari project Supabase Anda
const supabaseUrl = 'https://orwfgnrzekfwhpdhwbkb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yd2ZnbnJ6ZWtmd2hwZGh3YmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjA1MDYsImV4cCI6MjA4ODYzNjUwNn0.us6ANXBLDc59Q8jMVldnZ5b3_NZmtwEgn1tSyUuaZjA'

export const supabase = createClient(supabaseUrl, supabaseKey)