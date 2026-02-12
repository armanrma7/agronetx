import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SUPABASE_CONFIG } from '../config'

const SUPABASE_URL = SUPABASE_CONFIG.url
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ Missing Supabase credentials in config.ts')
} else {
  console.log('✅ Supabase configured:', SUPABASE_URL)
}
console.info('Supabase URL:', SUPABASE_URL);
console.info('Supabase ANON KEY:', SUPABASE_ANON_KEY);
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

async function pingSupabase() {
  try {
    const res = await fetch(
      'https://mtscteygybifhtsysfoq.supabase.co'
    );
    const json = await res.json();
    console.log("HEALTH CHECK", json);
  } catch (e) {
    console.log("FETCH FAILED", e);
  }
}

pingSupabase();