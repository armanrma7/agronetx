/**
 * Device Token Service
 * Collects device information and FCM token, then registers with backend
 */

import DeviceInfo from 'react-native-device-info'
import messaging from '@react-native-firebase/messaging'
import { Platform } from 'react-native'
// Try to load Notifee; if native module is missing we gracefully fall back.
let notifee: any | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@notifee/react-native')
  // Some bundlers expose Notifee under default export.
  notifee = mod?.default ?? mod
} catch {
  notifee = null
}
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
 * Unregister device from FCM and clear local token.
 * Call this on logout so this device stops receiving pushes for the logged-out user.
 */
export async function unregisterDeviceToken(): Promise<void> {
  try {
    // Best-effort delete of the current FCM token on this device
    await messaging().deleteToken()
    console.log('FCM token deleted locally on logout')
    // Optionally, backend can also clean up tokens per user/device if needed.
  } catch (error) {
    console.error('Error deleting FCM token on logout:', error)
  }
}

/**
 * Handle FCM messages when app is in foreground.
 * We use Notifee to show a normal notification (status bar) instead of an Alert.
 */
export function setupForegroundMessageHandler(): () => void {
  // Ensure we have a default Android channel for notifications
  const ensureAndroidChannel = async () => {
    if (!notifee) return
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default',
        importance: notifee.AndroidImportance?.HIGH ?? 4,
      })
    }
  }

  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? remoteMessage.data?.title ?? 'Notification'
    const body = remoteMessage.notification?.body ?? remoteMessage.data?.body ?? ''

    try {
      if (notifee) {
        await ensureAndroidChannel()
        await notifee.displayNotification(
          Platform.OS === 'android'
            ? {
                title,
                body,
                android: {
                  channelId: 'default',
                  importance: notifee.AndroidImportance?.HIGH ?? 4,
                  pressAction: { id: 'default' },
                },
              }
            : {
                title,
                body,
              }
        )
      } else {
        // Fallback: show nothing or log; avoid crashing when Notifee is not available
        console.log('Foreground FCM message (Notifee not available):', title, body)
      }
    } catch (error) {
      console.error('Error displaying foreground notification with Notifee:', error)
    }
  })
  return unsubscribe
}

// Same notification type logic as NotificationsPage — used when user opens app from push (background/quit)
const APPLICATION_TYPES = [
  'application_created',
  'application_approved',
  'application_rejected',
  'application_closed',
  'application_canceled',
]
const ANNOUNCEMENT_TYPES = [
  'announcement_published',
  'announcement_closed',
  'announcement_blocked',
  'announcement_canceled',
  'announcement_created',
  'announcement_edited',
  'announcement_expiring_soon',
  'announcement_auto_closed',
]

/**
 * Resolve navigation target from FCM push message data (when user taps notification).
 * Returns { screen, params } or null. Used for both getInitialNotification and onNotificationOpenedApp.
 */
export function getNotificationTargetFromFCMData(data: Record<string, string> | undefined): { screen: string; params: object } | null {
  if (!data) return null
  const type = (data.type || '').toLowerCase().trim()
  const announcementId = data.announcement_id || data.announcementId
  const applicationId = data.application_id || data.applicationId
  const quantityUnit = data.quantity_unit || data.quantityUnit || ''

  if (APPLICATION_TYPES.includes(type) && announcementId && applicationId) {
    return { screen: 'ApplicationDetail', params: { announcementId, appId: applicationId, quantityUnit } }
  }
  if (ANNOUNCEMENT_TYPES.includes(type) && announcementId) {
    return { screen: 'AnnouncementDetail', params: { announcementId } }
  }
  if (type === 'account_status_changed') {
    return { screen: 'Profile', params: {} }
  }
  return null
}

/**
 * Handle push notification opened (user tapped notification).
 * - Call handleInitial() when navigation is ready (e.g. from NavigationContainer onReady) for cold start.
 * - onNotificationOpenedApp is registered here for when app was in background.
 * Returns { handleInitial, unsubscribe } so caller can run handleInitial on ready and unsubscribe on unmount.
 */
export function setupNotificationOpenedHandler(navigate: (screen: string, params: object) => void): {
  handleInitial: () => Promise<void>
  unsubscribe: () => void
} {
  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    const target = getNotificationTargetFromFCMData(remoteMessage?.data as any)
    if (target) navigate(target.screen, target.params)
  })

  const handleInitial = async () => {
    try {
      const remoteMessage = await messaging().getInitialNotification()
      const target = getNotificationTargetFromFCMData(remoteMessage?.data as any)
      if (target) navigate(target.screen, target.params)
    } catch (_) {}
  }

  return { handleInitial, unsubscribe }
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
