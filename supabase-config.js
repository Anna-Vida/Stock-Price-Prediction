// Add these values from Supabase Dashboard > Project Settings > API.
window.SUPABASE_URL = 'https://vnzrmyzsgbyhpzgihsiu.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_-9jBR-qp3JAvhNqkqhVDLw_jVvgazlg';

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase) {
  window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}
