/**
 * AuthContext (Backward Compatibility Wrapper)
 * Wraps Zustand auth store to maintain existing component API
 * This allows gradual migration - components can still use useAuth() hook
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAuthStore } from '../store/auth/useAuthStore'
import { Profile } from '../types'
import type { User } from '../store/auth/useAuthStore'

interface AuthContextType {
  user: User | null
  session: { user: User } | null // Backward compatibility - wraps user
  profile: Profile | null
  loading: boolean
  initialized: boolean // Whether auth state has been initialized
  error: string | null
  register: (
    phone: string,
    password: string,
    fullname: string,
    accountType: string
  ) => Promise<{ success: boolean; phone: string; requiresVerification: boolean }>
  login: (phone: string, password: string) => Promise<void>
  verifyOTP: (phone: string, token: string) => Promise<void>
  sendOTP: (phone: string) => Promise<void>
  logout: () => Promise<void>
  updateContact: (phoneOrEmail: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  restoreSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    profile,
    accessToken,
    loading,
    initialized,
    login: loginStore,
    register: registerStore,
    verifyOTP: verifyOTPStore,
    sendOTP: sendOTPStore,
    logout: logoutStore,
    updateProfile: updateProfileStore,
    updateContact: updateContactStore,
    restoreSession,
  } = useAuthStore()

  // Restore session on mount
  useEffect(() => {
    if (!initialized) {
      restoreSession()
    }
  }, [initialized, restoreSession])

  // Wrapper functions that match the old API
  const login = async (phone: string, password: string) => {
    await loginStore(phone, password)
  }

  const register = async (
    phone: string,
    password: string,
    fullname: string,
    accountType: string
  ) => {
    return await registerStore(phone, password, fullname, accountType)
  }

  const verifyOTP = async (phone: string, token: string) => {
    await verifyOTPStore(phone, token)
  }

  const sendOTP = async (phone: string) => {
    await sendOTPStore(phone)
  }

  const logout = async () => {
    await logoutStore()
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    await updateProfileStore(updates)
  }

  const updateContact = async (phoneOrEmail: string) => {
    await updateContactStore(phoneOrEmail)
  }

  // Create session object for backward compatibility
  const session = user ? { user } : null

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    initialized,
    error: null, // Errors are now thrown, not stored in state
    register,
    login,
    verifyOTP,
    sendOTP,
    logout,
    updateContact,
    updateProfile,
    restoreSession: restoreSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
