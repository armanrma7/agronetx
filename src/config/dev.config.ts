/**
 * Development Configuration
 * Set MOCK_MODE to true to use fake data and skip backend requests
 */

export const DEV_CONFIG = {
  // Set to true to use mock data instead of real backend
  MOCK_MODE: false,

  // Supabase API key
  SUPABASE_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10c2N0ZXlneWJpZmh0c3lzZm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MjE2NzEsImV4cCI6MjA4MTE5NzY3MX0.8mjJjlxhI5WnMiJHHIgWFIvCV95IaU1b08sk297a4z8',

  // Supabase config
  SUPABASE_CONFIG: {
    url: 'https://mtscteygybifhtsysfoq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10c2N0ZXlneWJpZmh0c3lzZm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MjE2NzEsImV4cCI6MjA4MTE5NzY3MX0.8mjJjlxhI5WnMiJHHIgWFIvCV95IaU1b08sk297a4z8',
  },
  // Mock user data
  MOCK_USER: {
    id: 'mock-user-123',
    email: 'test@agronetx.com',
    phone: '+37499123456',
  },
  
  // Mock profile data
  MOCK_PROFILE: {
    id: 'mock-profile-123',
    user_id: 'mock-user-123',
    fullname: 'Արամ Հարությունյան',
    email_or_phone: '+37499123456',
    account_type: 'farmer',
    verification_type: 'whatsapp',
    account_status: 'active',
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  
  // Mock delays (in milliseconds) to simulate network requests
  MOCK_DELAY: 1000,
}

