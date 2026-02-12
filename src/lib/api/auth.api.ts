/**
 * Authentication API
 * Handles all authentication-related API calls
 */

import apiClient from './client'
import { Profile } from '../../types'

export interface LoginRequest {
  phone: string
  password: string
}

export interface LoginResponse {
  success?: boolean
  access_token?: string
  refresh_token?: string
  token?: string // Backward compatibility
  user?: {
    id: string
    email?: string
    phone?: string
    username?: string
  }
  profile?: Profile
  data?: {
    access_token: string
    refresh_token: string
    user: {
      id: string
      email?: string
      phone?: string
      username?: string
    }
    profile?: Profile
  }
}

export interface RegisterRequest {
  user_type: string // 'farmer' | 'organization' (required)
  full_name: string // (required)
  phone: string // (required)
  password: string // (required)
}

export interface RegisterResponse {
  success: boolean
  requiresVerification: boolean
  message?: string
}

export interface VerifyOTPRequest {
  phone: string
  code: string
  purpose: string
}

export interface VerifyOTPResponse {
  success?: boolean
  access_token?: string
  refresh_token?: string
  token?: string // Backward compatibility
  user?: {
    id: string
    email?: string
    phone?: string
    username?: string
  }
  profile?: Profile
  data?: {
    access_token: string
    refresh_token: string
    user: {
      id: string
      email?: string
      phone?: string
      username?: string
    }
    profile?: Profile
  }
}

export interface SendOTPRequest {
  phone: string
  channel: string // 'sms' | 'whatsapp' | 'call'
  purpose: string // 'registration' | 'login' | 'password_reset'
}

export interface SendOTPResponse {
  success: boolean
  message?: string
}

export interface RestoreSessionResponse {
  success: boolean
  user: {
    id: string
    email?: string
    phone?: string
    username?: string
  }
  profile?: Profile
}

/**
 * Login with phone and password
 */
export async function loginAPI(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', data)
  return response.data
}

/**
 * Register a new user
 */
export async function registerAPI(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data)
  return response.data
}

/**
 * Verify OTP code
 */
export async function verifyOTPAPI(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
  const response = await apiClient.post<VerifyOTPResponse>('/auth/verify-otp', data)
  return response.data
}

/**
 * Send OTP code
 */
export async function sendOTPAPI(data: SendOTPRequest): Promise<SendOTPResponse> {
  console.info('Sending OTP with:', data)
  const response = await apiClient.post<SendOTPResponse>('/auth/send-otp', data)
  return response.data
}

/**
 * Restore session using stored token
 */
export async function restoreSessionAPI(): Promise<RestoreSessionResponse> {
  const response = await apiClient.get<RestoreSessionResponse>('/auth/me')
  return response.data
}

/**
 * Refresh access token using refresh token
 */
export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  user?: {
    id: string
    email?: string
    phone?: string
    username?: string
  }
}

export async function refreshTokenAPI(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', data)
  return response.data
}

/**
 * Logout (invalidate token on server)
 */
export async function logoutAPI(): Promise<void> {
  await apiClient.post('/auth/logout')
}

/**
 * Forgot password - Send OTP
 */
export interface ForgotPasswordRequest {
  phoneOrEmail: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message?: string
}

export async function forgotPasswordAPI(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data)
  return response.data
}

