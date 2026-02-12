# Supabase to Custom Backend API Migration Guide

This document outlines the migration from Supabase to a custom backend API.

## Overview

The app has been migrated from Supabase to a custom backend API using:
- **Axios** for HTTP requests
- **Zustand** for state management
- **Custom API layer** for all backend communication

## Architecture

### API Layer Structure

```
src/lib/api/
├── client.ts          # Axios client with interceptors
├── auth.api.ts        # Authentication endpoints
├── profile.api.ts     # Profile endpoints
└── listings.api.ts    # Listings endpoints
```

### State Management

```
src/store/
└── auth.store.ts      # Zustand auth store
```

### Backward Compatibility

The `AuthContext` has been refactored to wrap the Zustand store, maintaining backward compatibility with existing components that use `useAuth()` hook.

## Installation

Install required dependencies:

```bash
npm install axios zustand
# or
yarn add axios zustand
```

## Configuration

### API Base URL

Update `src/config/api.config.ts` with your backend API URL:

```typescript
export const API_CONFIG = {
  baseURL: 'https://28dd9366c2ed.ngrok.app/api',
  timeout: 30000,
}
```

## Backend API Endpoints

Your backend API should implement the following endpoints:

### Authentication

- `POST /api/auth/login` - Login with identifier and password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/send-otp` - Send OTP code
- `POST /api/auth/forgot-password` - Send password reset OTP
- `GET /api/auth/me` - Restore session (get current user)
- `POST /api/auth/logout` - Logout (invalidate token)

### Profile

- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update user profile
- `PATCH /api/profile/contact` - Update contact (phone/email)

### Listings

- `GET /api/listings` - Get listings (with query params: type, status, limit, offset)
- `GET /api/listings/:id` - Get listing by ID
- `POST /api/listings` - Create listing
- `PATCH /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing

## Request/Response Formats

### Login Request
```json
{
  "identifier": "user@example.com", // or phone number or username
  "password": "password123"
}
```

### Login Response
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "phone": "+37499123456",
    "username": "username"
  },
  "profile": {
    "id": "profile-id",
    "fullname": "John Doe",
    "user_type": "farmer",
    ...
  }
}
```

### Register Request
```json
{
  "identifier": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "user_type": "farmer",
  "verification_type": "whatsapp",
  "role": "user",
  "status": "active",
  "verified": false,
  "phone": "+37499123456", // if identifier is phone
  "email": "user@example.com" // if identifier is email
}
```

### Register Response
```json
{
  "success": true,
  "requiresVerification": true
}
```

### Verify OTP Request
```json
{
  "phone": "+37499123456",
  "code": "123456"
}
```

### Verify OTP Response
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": { ... },
  "profile": { ... }
}
```

## Authentication Flow

1. **Token Storage**: Tokens are stored in AsyncStorage with key `@agronetx:auth_token`
2. **Request Interceptor**: Automatically adds `Authorization: Bearer <token>` header to all requests
3. **Response Interceptor**: Handles 401 errors by clearing token and triggering logout
4. **Session Restore**: On app start, `restoreSession()` is called to verify token and get user data

## Migration Checklist

- [x] Install axios and zustand
- [x] Create API client with interceptors
- [x] Create Zustand auth store
- [x] Create API service layer
- [x] Update AuthContext to use Zustand
- [x] Update ListingsPage to use custom API
- [x] Update ForgotPasswordPage to use custom API
- [ ] Remove Supabase dependencies from package.json
- [ ] Remove Supabase configuration files
- [ ] Remove Supabase client file
- [ ] Test all authentication flows
- [ ] Test all API calls
- [ ] Update environment variables if needed

## Removing Supabase

After confirming everything works:

1. Remove Supabase package:
   ```bash
   npm uninstall @supabase/supabase-js react-native-url-polyfill
   ```

2. Delete Supabase files:
   - `src/lib/supabase.ts`
   - `src/config.ts` (if only contains Supabase config)
   - `src/config.example.ts` (if only contains Supabase config)

3. Remove Supabase references from:
   - `src/config/dev.config.ts` (remove SUPABASE_API_KEY and SUPABASE_CONFIG)

## Error Handling

All API errors are handled consistently:
- Network errors are caught and displayed to users
- 401 errors trigger automatic logout
- Error messages are extracted from `error.response.data.message` or fallback to generic messages

## Testing

Test the following flows:
1. ✅ Login with email/phone/username
2. ✅ Register new user
3. ✅ Verify OTP after registration
4. ✅ Restore session on app restart
5. ✅ Logout
6. ✅ Fetch listings
7. ✅ Update profile
8. ✅ Forgot password flow

## Notes

- The `AuthContext` wrapper maintains backward compatibility, so existing components don't need immediate changes
- All Supabase-specific types have been replaced with custom types
- The app now uses JWT tokens instead of Supabase sessions
- Token is automatically included in all API requests via axios interceptor

