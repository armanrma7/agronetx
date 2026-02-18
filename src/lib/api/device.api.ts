/**
 * Device API
 * Handles device token registration
 */

import apiClient from './client'

export interface DeviceTokenRequest {
  fcm_token: string
  device_id: string
  device_type: 'ios' | 'android'
  device_model: string
  os_version: string
  app_version: string
}

/**
 * Register device token with backend
 */
export async function registerDeviceTokenAPI(data: DeviceTokenRequest): Promise<void> {
  await apiClient.post('/device-tokens', data)
}
