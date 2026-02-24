/**
 * Auth Store (Zustand)
 * Manages authentication state: user, token, login, logout, session restore
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Profile } from '../../types'
import * as authAPI from '../../lib/api/auth.api'
import * as profileAPI from '../../lib/api/profile.api'

const ACCESS_TOKEN_KEY = '@agronetx:access_token'
const REFRESH_TOKEN_KEY = '@agronetx:refresh_token'
const USER_KEY = '@agronetx:user'

export interface User {
  id: string
  email?: string
  phone?: string
  username?: string
  full_name?: string
  user_type?: string
  emails?: string[]
  phones?: string[]
  region_id?: string
  village_id?: string
  region?: {
    id: string
    name: string
    name_hy?: string
    name_en?: string
    name_ru?: string
  }
  village?: {
    id: string
    name: string
    name_hy?: string
    name_en?: string
    name_ru?: string
  }
}

interface AuthState {
  // State
  user: User | null
  profile: Profile | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  initialized: boolean

  // Actions
  login: (phone: string, password: string) => Promise<void>
  register: (
    phone: string,
    password: string,
    fullname: string,
    accountType: string
  ) => Promise<{ success: boolean; phone: string; requiresVerification: boolean }>
  verifyOTP: (phone: string, code: string) => Promise<void>
  sendOTP: (phone: string) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateContact: (phoneOrEmail: string) => Promise<void>
  updateUser: (updates: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  initialized: false,

  // Set loading state
  setLoading: (loading: boolean) => {
    set({ loading })
  },

  // Login
  login: async (phone: string, password: string) => {
    try {
      set({ loading: true })
      const response = await authAPI.loginAPI({ phone, password })

      // Handle different response structures
      const accessToken = response.access_token || response.data?.access_token || response.token
      const refreshToken = response.refresh_token || response.data?.refresh_token
      const user = response.user || response.data?.user
      const profile = response.profile || response.data?.profile

      if (accessToken && user) {
        // Store tokens and user
        const itemsToStore: Array<[string, string]> = [
          [ACCESS_TOKEN_KEY, accessToken],
          [USER_KEY, JSON.stringify(user)],
        ]
        if (refreshToken) {
          itemsToStore.push([REFRESH_TOKEN_KEY, refreshToken])
        }
        await AsyncStorage.multiSet(itemsToStore)

        // Update state immediately
        set({
          user,
          profile: profile || null,
          accessToken,
          refreshToken: refreshToken || null,
          loading: false,
        })

        // Fetch profile if not included in response (non-blocking)
        if (user && !profile) {
          profileAPI.getProfileAPI()
            .then((fetchedProfile) => {
              set({ profile: fetchedProfile })
            })
            .catch((error: any) => {
              // Only log non-404 errors (404 means profile endpoint doesn't exist yet)
              if (error.response?.status !== 404) {
                console.error('Error fetching profile after login:', error)
              }
              // Don't throw - login is still successful
            })
        }
      } else {
        throw new Error('Invalid login response')
      }
    } catch (error: any) {
      set({ loading: false })
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Սխալ մուտքանուն կամ գաղտնաբառ'
      throw new Error(errorMessage)
    }
  },

  // Register
  register: async (
    phone: string,
    password: string,
    fullname: string,
    accountType: string
  ) => {
    try {
      set({ loading: true })

      // Validate required fields
      if (!accountType || accountType.trim() === '') {
        throw new Error('Օգտագործողի տեսակը պարտադիր է')
      }
      if (!fullname || !fullname.trim()) {
        throw new Error('Անուն Ազգանուն դաշտը պարտադիր է')
      }

      // Validate phone format
      if (!/^\+?[0-9]{10,}$/.test(phone?.replace(/\s/g, '') || '')) {
        throw new Error('Սխալ հեռախոսահամար')
      }

      // Prepare registration data - only 4 required fields
      const registrationData: authAPI.RegisterRequest = {
        user_type: accountType.trim(),
        full_name: fullname.trim(),
        phone: phone.trim(),
        password,
      }

      const response = await authAPI.registerAPI(registrationData)

      set({ loading: false })

      return {
        success: response.success,
        phone,
        requiresVerification: response.requiresVerification || false,
      }
    } catch (error: any) {
      set({ loading: false })
      
      // Check for status 409 - Phone number already registered
      if (error.response?.status === 409) {
        throw new Error('Հեռախոսահամարը արդեն գրանցված է')
      }
      
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Գրանցման սխալ'
      throw new Error(errorMessage)
    }
  },

  // Verify OTP
  verifyOTP: async (phone: string, code: string) => {
    try {
      set({ loading: true })
      console.log('Calling verifyOTPAPI with phone:', phone, 'code:', code, 'purpose: registration')
      
      const response = await authAPI.verifyOTPAPI({ 
        phone, 
        code,
        purpose: 'registration'
      })
      console.log('OTP verification response:', response)

      // Handle different response structures
      const accessToken = response.access_token || response.data?.access_token || response.token
      const refreshToken = response.refresh_token || response.data?.refresh_token
      const user = response.user || response.data?.user
      const profile = response.profile || response.data?.profile

      console.log('Extracted from response:', {
        accessToken: accessToken ? 'exists' : 'missing',
        refreshToken: refreshToken ? 'exists' : 'missing',
        user: user ? user : 'missing',
        profile: profile ? profile : 'missing',
      })

      if (accessToken && user) {
        // Store tokens and user
        const itemsToStore: Array<[string, string]> = [
          [ACCESS_TOKEN_KEY, accessToken],
          [USER_KEY, JSON.stringify(user)],
        ]
        if (refreshToken) {
          itemsToStore.push([REFRESH_TOKEN_KEY, refreshToken])
        }
        await AsyncStorage.multiSet(itemsToStore)
        console.log('Tokens and user stored in AsyncStorage')

        // Update state immediately
        set({
          user,
          profile: profile || null,
          accessToken,
          refreshToken: refreshToken || null,
          loading: false,
        })
        console.log('User state updated:', { userId: user.id, phone: user.phone })

        // Fetch profile if not included in response (non-blocking)
        if (user && !profile) {
          console.log('Fetching profile data...')
          profileAPI.getProfileAPI()
            .then((fetchedProfile) => {
              set({ profile: fetchedProfile })
              console.log('Profile fetched successfully:', fetchedProfile)
            })
            .catch((error) => {
              console.error('Error fetching profile after OTP verification:', error)
            })
        }
      } else {
        console.error('Invalid response: missing accessToken or user')
        throw new Error('Կոդի հաստատման սխալ')
      }
    } catch (error: any) {
      set({ loading: false })
      console.error('OTP verification failed:', error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Կոդի հաստատման սխալ'
      console.error('Error message:', errorMessage)
      throw new Error(errorMessage)
    }
  },

  // Send OTP
  sendOTP: async (phone: string) => {
    try {
      console.log('Sending OTP with:', { phone, channel: 'sms', purpose: 'registration' })
      const response = await authAPI.sendOTPAPI({ 
        phone,
        channel: 'sms',
        purpose: 'registration'
      })
      console.log('Send OTP response:', response)
      if (!response.success) {
        throw new Error('OTP sending failed')
      }
    } catch (error: any) {
      console.error('Send OTP error:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'OTP sending failed'
      throw new Error(errorMessage)
    }
  },

  // Logout
  logout: async () => {
    try {
      // Call logout API (optional - to invalidate token on server)
      try {
        await authAPI.logoutAPI()
      } catch (error) {
        console.error('Error calling logout API:', error)
        // Continue with local logout even if API call fails
      }

      // Clear all tokens and user data from storage
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])

      // Clear state
      set({
        user: null,
        profile: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
      })
    } catch (error) {
      console.error('Error during logout:', error)
      // Still clear local state even if storage clear fails
      set({
        user: null,
        profile: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
      })
    }
  },

  // Restore session on app start
  restoreSession: async () => {
    try {
      set({ loading: true, initialized: false })

      // Get tokens and user from storage
      const [accessToken, refreshToken, userJson] = await AsyncStorage.multiGet([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_KEY,
      ])

      const storedAccessToken = accessToken[1]
      const storedRefreshToken = refreshToken[1]
      const storedUserJson = userJson[1]

      if (!storedAccessToken) {
        set({ loading: false, initialized: true })
        return
      }

      // Restore user from storage immediately for faster UI
      let user: User | null = null
      if (storedUserJson) {
        try {
          user = JSON.parse(storedUserJson)
          set({ user, accessToken: storedAccessToken, refreshToken: storedRefreshToken })
        } catch (e) {
          console.error('Error parsing stored user:', e)
        }
      }

      // Verify token and get fresh user data (non-blocking)
      try {
        const response = await authAPI.restoreSessionAPI()

        if (response.success && response.user) {
          // Update with fresh data
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user))
          set({
            user: response.user,
            profile: response.profile || null,
            accessToken: storedAccessToken,
            refreshToken: storedRefreshToken,
            loading: false,
            initialized: true,
          })

          // Fetch profile if not included in response (non-blocking)
          if (response.user && !response.profile) {
            profileAPI.getProfileAPI()
              .then((profile) => {
                set({ profile })
              })
              .catch((error: any) => {
                // Only log non-404 errors (404 means profile endpoint doesn't exist yet)
                if (error.response?.status !== 404) {
                  console.error('Error fetching profile during session restore:', error)
                }
              })
          }
        } else {
          // Invalid response, but keep user logged in if we have stored data
          // Only clear if we don't have stored user data
          if (!user) {
            await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])
            set({
              user: null,
              profile: null,
              accessToken: null,
              refreshToken: null,
              loading: false,
              initialized: true,
            })
          } else {
            // Keep user logged in with stored data
            set({
              user,
              accessToken: storedAccessToken,
              refreshToken: storedRefreshToken,
              loading: false,
              initialized: true,
            })
          }
        }
      } catch (error: any) {
        const statusCode = error.response?.status

        // Only clear tokens on 401 (Unauthorized) - token is invalid
        if (statusCode === 401) {
          console.warn('Session expired - logging out')
          await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])
          set({
            user: null,
            profile: null,
            accessToken: null,
            refreshToken: null,
            loading: false,
            initialized: true,
          })
        } else {
          // For other errors (404, network, etc.), keep user logged in if we have stored data
          // This allows the app to work even if the verification endpoint is temporarily unavailable
          // Only log non-404 errors to avoid noise
          if (statusCode !== 404) {
            console.warn('Session verification failed (non-critical):', error.message || error)
          }
          
          if (user && storedAccessToken) {
            // Keep user logged in with stored data
            set({
              user,
              accessToken: storedAccessToken,
              refreshToken: storedRefreshToken,
              loading: false,
              initialized: true,
            })
          } else {
            // No stored user data, clear everything
            await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])
            set({
              user: null,
              profile: null,
              accessToken: null,
              refreshToken: null,
              loading: false,
              initialized: true,
            })
          }
        }
      }
    } catch (error: any) {
      console.error('Error restoring session:', error)
      set({
        user: null,
        profile: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        initialized: true,
      })
    }
  },

  // Update profile
  updateProfile: async (updates: Partial<Profile>) => {
    try {
      const updatedProfile = await profileAPI.updateProfileAPI(updates)
      set({ profile: updatedProfile })
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Profile update failed'
      throw new Error(errorMessage)
    }
  },

  // Update contact
  updateContact: async (phoneOrEmail: string) => {
    try {
      await profileAPI.updateContactAPI(phoneOrEmail)
      // Optionally refresh profile after contact update
      const profile = await profileAPI.getProfileAPI()
      set({ profile })
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Contact update failed'
      throw new Error(errorMessage)
    }
  },

  // Update user state directly (for profile updates)
  updateUser: (updates: Partial<User>) => {
    const currentUser = get().user
    if (currentUser) {
      set({ user: { ...currentUser, ...updates } })
      console.log('User state updated directly:', updates)
    }
  },
}))

