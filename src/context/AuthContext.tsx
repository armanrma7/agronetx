/**
 * Auth Context
 * Manages authentication session (tokens + user) using plain React state.
 * No Zustand — auth state is local/persistent, not server state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { unregisterDeviceToken } from '../services/deviceToken.service'
import { Profile } from '../types'
import * as authAPI from '../lib/api/auth.api'
import * as profileAPI from '../lib/api/profile.api'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface AuthContextType {
  user: User | null
  session: { user: User } | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  error: string | null
  login: (phone: string, password: string) => Promise<void>
  register: (
    phone: string,
    password: string,
    fullname: string,
    accountType: string,
  ) => Promise<{ success: boolean; phone: string; requiresVerification: boolean }>
  verifyOTP: (phone: string, token: string) => Promise<void>
  sendOTP: (phone: string) => Promise<void>
  logout: () => Promise<void>
  updateContact: (phoneOrEmail: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateUser: (updates: Partial<User>) => void
  restoreSession: () => Promise<void>
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = '@agronetx:access_token'
const REFRESH_TOKEN_KEY = '@agronetx:refresh_token'
const USER_KEY = '@agronetx:user'

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // ── Session restore ──────────────────────────────────────────────────────────

  const restoreSession = useCallback(async () => {
    try {
      setLoading(true)
      setInitialized(false)

      const [[, storedAccessToken], [, storedRefreshToken], [, userJson]] =
        await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])

      if (!storedAccessToken) {
        setInitialized(true)
        setLoading(false)
        return
      }

      // Show stored user immediately for faster UI
      let storedUser: User | null = null
      if (userJson) {
        try {
          storedUser = JSON.parse(userJson)
          setUser(storedUser)
        } catch {
          // ignore parse errors
        }
      }

      // Verify token with server
      try {
        const response = await authAPI.restoreSessionAPI()
        if (response.success && response.user) {
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user))
          setUser(response.user)
          setProfile(response.profile ?? null)

          if (response.user && !response.profile) {
            profileAPI.getProfileAPI().then(setProfile).catch(() => {})
          }
        } else if (!storedUser) {
          await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])
          setUser(null)
          setProfile(null)
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])
          setUser(null)
          setProfile(null)
        }
        // For other errors keep stored user logged in
      }
    } catch {
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  // ── Login ────────────────────────────────────────────────────────────────────

  const login = useCallback(async (phone: string, password: string) => {
    setLoading(true)
    try {
      const response = await authAPI.loginAPI({ phone, password })

      const accessToken = response.access_token || response.data?.access_token || response.token
      const refreshToken = response.refresh_token || response.data?.refresh_token
      const userData = response.user || response.data?.user
      const profileData = response.profile || response.data?.profile

      if (!accessToken || !userData) throw new Error('Invalid login response')

      const items: Array<[string, string]> = [
        [ACCESS_TOKEN_KEY, accessToken],
        [USER_KEY, JSON.stringify(userData)],
      ]
      if (refreshToken) items.push([REFRESH_TOKEN_KEY, refreshToken])
      await AsyncStorage.multiSet(items)

      setUser(userData)
      setProfile(profileData ?? null)
      setLoading(false)

      if (userData && !profileData) {
        profileAPI.getProfileAPI().then(setProfile).catch(() => {})
      }
    } catch (error: any) {
      setLoading(false)
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Սխալ մուտքանուն կամ գաղտնաբառ'
      throw new Error(msg)
    }
  }, [])

  // ── Register ─────────────────────────────────────────────────────────────────

  const register = useCallback(
    async (phone: string, password: string, fullname: string, accountType: string) => {
      setLoading(true)
      try {
        if (!accountType?.trim()) throw new Error('Օգտագործողի տեսակը պարտադիր է')
        if (!fullname?.trim()) throw new Error('Անուն Ազգանուն դաշտը պարտադիր է')
        if (!/^\+?[0-9]{10,}$/.test(phone?.replace(/\s/g, '') ?? ''))
          throw new Error('Սխալ հեռախոսահամար')

        const response = await authAPI.registerAPI({
          user_type: accountType.trim(),
          full_name: fullname.trim(),
          phone: phone.trim(),
          password,
        })
        setLoading(false)
        return { success: response.success, phone, requiresVerification: response.requiresVerification ?? false }
      } catch (error: any) {
        setLoading(false)
        if (error.response?.status === 409) throw new Error('Հեռախոսահամարը արդեն գրանցված է')
        throw new Error(error.response?.data?.message || error.message || 'Գրանցման սխալ')
      }
    },
    [],
  )

  // ── Verify OTP ───────────────────────────────────────────────────────────────

  const verifyOTP = useCallback(async (phone: string, code: string) => {
    setLoading(true)
    try {
      const response = await authAPI.verifyOTPAPI({ phone, code, purpose: 'registration' })

      const accessToken = response.access_token || response.data?.access_token || response.token
      const refreshToken = response.refresh_token || response.data?.refresh_token
      const userData = response.user || response.data?.user
      const profileData = response.profile || response.data?.profile

      if (!accessToken || !userData) throw new Error('Կոդի հաստատման սխալ')

      const items: Array<[string, string]> = [
        [ACCESS_TOKEN_KEY, accessToken],
        [USER_KEY, JSON.stringify(userData)],
      ]
      if (refreshToken) items.push([REFRESH_TOKEN_KEY, refreshToken])
      await AsyncStorage.multiSet(items)

      setUser(userData)
      setProfile(profileData ?? null)
      setLoading(false)

      if (userData && !profileData) {
        profileAPI.getProfileAPI().then(setProfile).catch(() => {})
      }
    } catch (error: any) {
      setLoading(false)
      throw new Error(
        error.response?.data?.message || error.response?.data?.error || error.message || 'Կոդի հաստատման սխալ',
      )
    }
  }, [])

  // ── Send OTP ─────────────────────────────────────────────────────────────────

  const sendOTP = useCallback(async (phone: string) => {
    try {
      const response = await authAPI.sendOTPAPI({ phone, channel: 'sms', purpose: 'registration' })
      if (!response.success) throw new Error('OTP sending failed')
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'OTP sending failed')
    }
  }, [])

  // ── Logout ───────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await unregisterDeviceToken()
    } catch {
      // ignore FCM cleanup errors
    }
    try {
      await authAPI.logoutAPI()
    } catch {
      // server logout is best-effort
    }
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])
    setUser(null)
    setProfile(null)
  }, [])

  // ── Update profile ────────────────────────────────────────────────────────────

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      const updated = await profileAPI.updateProfileAPI(updates)
      setProfile(updated)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Profile update failed')
    }
  }, [])

  // ── Update contact ────────────────────────────────────────────────────────────

  const updateContact = useCallback(async (phoneOrEmail: string) => {
    try {
      await profileAPI.updateContactAPI(phoneOrEmail)
      const fresh = await profileAPI.getProfileAPI()
      setProfile(fresh)
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Contact update failed')
    }
  }, [])

  // ── Update user directly ──────────────────────────────────────────────────────

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev)
  }, [])

  // ── Context value ─────────────────────────────────────────────────────────────

  const value: AuthContextType = {
    user,
    session: user ? { user } : null,
    profile,
    loading,
    initialized,
    error: null,
    login,
    register,
    verifyOTP,
    sendOTP,
    logout,
    updateContact,
    updateProfile,
    updateUser,
    restoreSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
