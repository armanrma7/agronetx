/**
 * Device Token Service
 * Collects device information and FCM token, then registers with backend
 */

import DeviceInfo from 'react-native-device-info'
import messaging from '@react-native-firebase/messaging'
import { Platform } from 'react-native'
import { registerDeviceTokenAPI, DeviceTokenRequest } from '../lib/api/device.api'

/**
 * Request notification permissions (required for FCM token)
 */
async function requestNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission()
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL

    return enabled
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

/**
 * Get FCM token
 */
async function getFCMToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission()
    if (!hasPermission) {
      console.warn('Notification permission not granted')
      return null
    }

    const token = await messaging().getToken()
    return token
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

/**
 * Collect all device information
 */
async function collectDeviceInfo(): Promise<Omit<DeviceTokenRequest, 'fcm_token'> | null> {
  try {
    const deviceId = await DeviceInfo.getUniqueId()
    const deviceType = Platform.OS === 'ios' ? 'ios' : 'android'
    const deviceModel = await DeviceInfo.getModel()
    const systemVersion = await DeviceInfo.getSystemVersion()
    const appVersion = DeviceInfo.getVersion()

    return {
      device_id: deviceId,
      device_type: deviceType,
      device_model: deviceModel,
      os_version: systemVersion,
      app_version: appVersion,
    }
  } catch (error) {
    console.error('Error collecting device info:', error)
    return null
  }
}

/**
 * Register device token with backend
 * This should be called when the app opens
 */
export async function registerDeviceToken(): Promise<void> {
  try {
    // Collect device info
    const deviceInfo = await collectDeviceInfo()
    if (!deviceInfo) {
      console.warn('Failed to collect device info')
      return
    }

    // Get FCM token
    const fcmToken = await getFCMToken()
    if (!fcmToken) {
      console.warn('Failed to get FCM token')
      return
    }

    // Register with backend
    await registerDeviceTokenAPI({
      ...deviceInfo,
      fcm_token: fcmToken,
    })

    console.log('Device token registered successfully')
  } catch (error: any) {
    // Don't throw - device registration failure shouldn't block app startup
    console.error('Error registering device token:', error)
  }
}

/**
 * Handle FCM token refresh
 */
export function setupTokenRefreshListener(): () => void {
  const unsubscribe = messaging().onTokenRefresh(async (token) => {
    try {
      const deviceInfo = await collectDeviceInfo()
      if (deviceInfo) {
        await registerDeviceTokenAPI({
          ...deviceInfo,
          fcm_token: token,
        })
        console.log('Device token refreshed and registered')
      }
    } catch (error) {
      console.error('Error refreshing device token:', error)
    }
  })

  return unsubscribe
}
