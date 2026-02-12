# API Usage Examples

This directory contains the API service layer for communicating with the custom backend.

## Usage

### Authentication

```typescript
import { useAuthStore } from '../../store/auth.store'

// In your component
const { login, register, logout, user, profile, loading } = useAuthStore()

// Login
try {
  await login('user@example.com', 'password123')
  // User is now logged in
} catch (error) {
  console.error('Login failed:', error.message)
}

// Register
try {
  const result = await register('user@example.com', 'password123', {
    fullname: 'John Doe',
    accountType: 'farmer',
    verificationType: 'whatsapp',
    role: 'user',
    accountStatus: 'active',
  })
  
  if (result.requiresVerification) {
    // Navigate to verification page
  }
} catch (error) {
  console.error('Registration failed:', error.message)
}

// Logout
await logout()
```

### Using AuthContext (Backward Compatible)

```typescript
import { useAuth } from '../../context/AuthContext'

// In your component
const { login, register, logout, user, profile, loading } = useAuth()

// Same API as before
await login('user@example.com', 'password123')
```

### Direct API Calls

```typescript
import * as authAPI from '../lib/api/auth.api'
import * as announcementsAPI from '../lib/api/announcements.api'
import * as profileAPI from '../lib/api/profile.api'

// Login
const loginResponse = await authAPI.loginAPI({
  phone: '+37499123456',
  password: 'password123',
})

// Get announcements
const announcements = await announcementsAPI.getAnnouncementsAPI({
  type: 'goods',
  status: 'active',
})

// Get profile
const profile = await profileAPI.getProfileAPI()

// Update profile
const updatedProfile = await profileAPI.updateProfileAPI({
  fullname: 'New Name',
})
```

## Error Handling

All API calls throw errors that should be caught:

```typescript
try {
  await login('user@example.com', 'password123')
} catch (error: any) {
  // Error message is in error.message
  Alert.alert('Error', error.message)
}
```

## Token Management

Tokens are automatically:
- Stored in AsyncStorage on login/register
- Added to request headers via axios interceptor
- Cleared on logout or 401 error
- Restored on app start via `restoreSession()`

## 401 Handling

When a 401 error occurs:
1. Token is automatically cleared from storage
2. User state is cleared
3. App should redirect to login (handled by AppNavigator)

