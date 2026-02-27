// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nsbcybiulpqbbzlczvyt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYmN5Yml1bHBxYmJ6bGN6dnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDA1NDQsImV4cCI6MjA4Njk3NjU0NH0.rHQAVofGefvyWN2_pK2oSwiMYmMEOFKibrB8g4zBhPs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)