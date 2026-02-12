/**
 * Profile API
 * Handles user profile-related API calls
 */

import apiClient from './client'
import { Profile } from '../../types'

export interface Region {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_ru?: string
}

export interface Village {
  id: string
  name: string
  name_en?: string
  name_hy?: string
  name_ru?: string
  region_id: string
}

/**
 * Get user profile
 */
export async function getProfileAPI(): Promise<Profile> {
  const response = await apiClient.get<Profile>('/profile')
  return response.data
}

/**
 * Update user profile
 */
export async function updateProfileAPI(updates: Partial<Profile>): Promise<Profile> {
  const response = await apiClient.patch<Profile>('/profile', updates)
  return response.data
}

/**
 * Update contact (phone or email)
 */
export async function updateContactAPI(phoneOrEmail: string): Promise<void> {
  await apiClient.patch('/profile/contact', { phoneOrEmail })
}

/**
 * Get all regions
 */
export async function getRegionsAPI(): Promise<Region[]> {
  const response = await apiClient.get<Region[]>('/regions')
  return response.data
}

/**
 * Get villages by region ID
 */
export async function getVillagesByRegionAPI(regionId: string): Promise<Village[]> {
  const response = await apiClient.get<Village[]>(`/villages/region/${regionId}`)
  return response.data
}

/**
 * Get villages by multiple region IDs
 */
export async function getVillagesByRegionsAPI(regionIds: string[]): Promise<Village[]> {
  if (regionIds.length === 0) return []
  const regionIdsParam = regionIds.join(',')
  const response = await apiClient.get<Village[]>(`/villages?regionIds=${regionIdsParam}`)
  return response.data
}

/**
 * Update user data
 */
export interface UpdateUserRequest {
  full_name?: string
  phones?: string[]
  emails?: string[]
  profile_picture?: string
  region_id?: string
  village_id?: string
}

export interface UpdateUserResponse {
  success: boolean
  message?: string
  user?: {
    id: string
    full_name?: string
    phone?: string
    phones?: string[]
    emails?: string[]
    user_type?: string
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
}

export async function updateUserAPI(userId: string, data: UpdateUserRequest): Promise<UpdateUserResponse> {
  const response = await apiClient.put<UpdateUserResponse>(`/auth/users/${userId}`, data)
  return response.data
}

