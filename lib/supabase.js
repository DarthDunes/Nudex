import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xowgktixdjmhfubuxtsg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvd2drdGl4ZGptaGZ1YnV4dHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODI0MTksImV4cCI6MjA5NDQ1ODQxOX0.6nLmuzAPtZ-YIPt58JLctNRTYGDPULGoYvxK9zuu6uk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
