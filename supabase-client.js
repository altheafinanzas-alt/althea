// Configuración del cliente Supabase.
// La "anon key" es pública por diseño: la seguridad real la dan las
// políticas de Row Level Security definidas en supabase/schema.sql.
// Completar estos dos valores con los de tu proyecto:
// Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://danaarofqfhghcigfbdz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbmFhcm9mcWZoZ2hjaWdmYmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTg1NTksImV4cCI6MjA5ODI5NDU1OX0.nRGDRdSlmJVs2MD0-uC1u3i8XLfPnybBX0W2yAa9xJs';

// Se llama "supabaseClient" (no "supabase") porque el script del CDN
// ya ocupa el nombre global "supabase" para su propio namespace.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
