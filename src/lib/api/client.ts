/**
 * Axios API Client
 * Centralized HTTP client with authentication and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG } from '../../config/api.config'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ACCESS_TOKEN_KEY = '@agronetx:access_token'
const REFRESH_TOKEN_KEY = '@agronetx:refresh_token'
const USER_KEY = '@agronetx:user'

type RefreshResult = { access_token: string; refresh_token: string }

// Single-flight token refresh (prevents multiple simultaneous /auth/refresh calls)
let refreshPromise: Promise<RefreshResult> | null = null

async function refreshTokensOrThrow(): Promise<RefreshResult> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) {
    throw new Error('Missing refresh token')
  }

  // Create a new axios instance for refresh to avoid circular dependency
  const refreshClient = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const refreshResponse = await refreshClient.post<RefreshResult>('/auth/refresh', {
    refresh_token: refreshToken,
  })

  const newAccessToken = refreshResponse.data.access_token
  const newRefreshToken = refreshResponse.data.refresh_token

  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, newAccessToken],
    [REFRESH_TOKEN_KEY, newRefreshToken],
  ])

  // Keep default header in sync for subsequent requests
  apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`

  return { access_token: newAccessToken, refresh_token: newRefreshToken }
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY)
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
    } catch (error) {
      console.error('Error getting token from storage:', error)
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle 401 errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Single-flight refresh: all 401s await the same refreshPromise
        if (!refreshPromise) {
          refreshPromise = refreshTokensOrThrow().finally(() => {
            refreshPromise = null
          })
        }

        const { access_token: newAccessToken } = await refreshPromise

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }

        return apiClient(originalRequest)
      } catch (storageError) {
        console.error('Token refresh failed:', storageError)
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY])
        console.warn('Session expired. Please login again.')
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient

