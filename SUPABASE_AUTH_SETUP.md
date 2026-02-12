# Supabase Authentication Setup Guide

This document explains the complete authentication setup following Supabase rules.

## 🔐 Authentication Methods Supported

### 1. **Username + Password**
- Username is converted to internal email format: `username@app.local`
- Stored in both `user_metadata` and `profiles` table

### 2. **Email + Password**
- Standard Supabase email authentication
- Direct email/password login

### 3. **Phone + Password**
- Phone number is converted to internal email format (no OTP)
- Works the same as username authentication
- No SMS/OTP provider needed

## 📋 Database Schema Required

### Profiles Table

Run this SQL in your Supabase SQL Editor (see `DATABASE_SCHEMA.sql` for complete schema):

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  fullname TEXT NOT NULL,
  email_or_phone TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('farmer', 'organization')),
  verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'whatsapp', 'viber', 'telegram')),
  account_status TEXT NOT NULL DEFAULT 'active',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- See DATABASE_SCHEMA.sql for complete schema with indexes and policies
```

**Field Descriptions:**
- `fullname`: User's full name (single field instead of name/surname)
- `email_or_phone`: User's contact information
- `account_type`: 'farmer' or 'organization'
- `verification_type`: Communication method - 'email', 'whatsapp', 'viber', or 'telegram'
- `account_status`: 'pending', 'active', 'suspended', or 'banned' (default: 'active')
- `role`: 'user', 'farmer', or 'admin' (default: 'user')

## ⚙️ Supabase Dashboard Configuration

### 1. **Email Auth (Required)**

1. Go to: **Authentication** → **Providers**
2. Enable **Email** provider
3. Settings:
   - ✅ Enable Email provider
   - Configure email templates (optional)
   - Set email confirmation (optional): 
     - For development: Disable confirmation
     - For production: Enable confirmation

### 2. **Phone Auth (NOT Required)**

Phone authentication in this app uses password-based login (no OTP).
- Phone numbers are converted to internal email format
- No SMS provider configuration needed
- Works exactly like username authentication

### 3. **Email Settings**

1. Go to: **Authentication** → **Settings**
2. Configure:
   - **Site URL**: Your app URL (e.g., `yourapp://`)
   - **Redirect URLs**: Add callback URLs
   - **Minimum password length**: 6 (already validated in app)

### 4. **Disable Email Confirmation for Development**

For testing purposes:

1. Go to: **Authentication** → **Settings**
2. Under **Email Auth**:
   - ❌ Uncheck "Enable email confirmations"
   
⚠️ **Remember to enable this in production!**

## 🔧 How Authentication Works

### Registration Flow

```typescript
// User enters: "john_farmer" + password
register("john_farmer", "password123", metadata)

// Internally converts to:
signUp({ 
  email: "john_farmer@app.local", 
  password: "password123",
  options: { 
    data: { ...metadata, username: "john_farmer" }
  }
})

// Creates profile:
profiles.insert({
  id: user.id,
  username: "john_farmer",
  name: "John",
  surname: "Doe",
  ...
})
```

### Login Flow

```typescript
// User enters: "john_farmer" + password
login("john_farmer", "password123")

// Internally converts to:
signInWithPassword({ 
  email: "john_farmer@app.local", 
  password: "password123"
})

// Fetches profile and sets user state
```

### Email Login Flow

```typescript
// User enters: "john@email.com" + password
login("john@email.com", "password123")

// Uses email directly:
signInWithPassword({ 
  email: "john@email.com", 
  password: "password123"
})
```

### Phone Login Flow

```typescript
// User enters: "+37412345678"
login("+37412345678", "password123")

// Converts to internal email format (no OTP):
signInWithPassword({ 
  email: "37412345678@app.local", 
  password: "password123"
})
```

## 📱 iOS Configuration

The `Info.plist` is already configured to allow network access to Supabase:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>supabase.co</key>
    <dict>
      <key>NSIncludesSubdomains</key>
      <true/>
    </dict>
  </dict>
</dict>
```

## 🧪 Testing

### Mock Mode (Current)

The app is currently in **MOCK_MODE** for development:

```typescript
// src/config/dev.config.ts
MOCK_MODE: true
```

This allows testing without a real Supabase connection.

### Real Mode

To use real Supabase:

1. Set `MOCK_MODE: false` in `src/config/dev.config.ts`
2. Ensure Supabase credentials are correct in `src/config.ts`
3. Rebuild the app

### Test Accounts

Create test users with:
- Username: `testuser`
- Password: `test123456`

Or:
- Email: `test@example.com`
- Password: `test123456`

## 🔒 Security Features

### ✅ Implemented

- Password minimum length validation (6 characters)
- Row Level Security (RLS) on profiles table
- Session persistence with AsyncStorage
- Secure password hashing (handled by Supabase)
- Error messages in Armenian

### 🛡️ Best Practices

1. **Never store passwords in plain text**
2. **Use HTTPS only** (enforced)
3. **Enable email confirmation in production**
4. **Implement rate limiting** (Supabase provides this)
5. **Use strong passwords** (enforced: min 6 chars)

## 🐛 Troubleshooting

### "Network request failed"

**Solutions:**
1. Check internet connection
2. Verify Supabase URL in `src/config.ts`
3. Ensure `NSAppTransportSecurity` is configured
4. Rebuild the app: `npx react-native run-ios`

### "Invalid login credentials"

**Solutions:**
1. Verify username/email exists
2. Check password is correct (min 6 chars)
3. Ensure user is registered
4. Check Supabase Dashboard → Authentication → Users

### "Email not confirmed"

**Solutions:**
1. Disable email confirmation in Supabase (development only)
2. Or check user's email for confirmation link
3. Or manually confirm in Supabase Dashboard

### Profile not created

**Solutions:**
1. Check profiles table exists
2. Verify RLS policies are correct
3. Check Supabase logs for errors

## 📞 Support

For Supabase-specific issues:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)

For React Native Auth issues:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

