import { Platform } from 'react-native'
import type * as NotificationsTypes from 'expo-notifications'
import { isRunningInExpoGo } from 'expo'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { seekerService } from './seekerService'

const STORED_TOKEN_KEY = 'ipeso_push_token'

// Expo Go on Android dropped remote push in SDK 53, and merely importing expo-notifications
// there logs a red "Push notifications ... removed from Expo Go" console error on every boot.
// Load the module only where push works (development/production builds, and iOS Expo Go), so
// testing in Expo Go stays clean; everywhere else behaviour is unchanged.
export const pushNotificationsSupported = !(Platform.OS === 'android' && isRunningInExpoGo())

const Notifications: typeof NotificationsTypes | null = pushNotificationsSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Subscribes to taps on push notifications. Returns an unsubscribe function (a no-op when
 * push isn't supported in this runtime).
 */
export function addPushResponseListener(onData: (data: Record<string, unknown>) => void): () => void {
  if (!Notifications) return () => {}
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onData(response.notification.request.content.data as Record<string, unknown>)
  })
  return () => subscription.remove()
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Notifications) {
    console.log('ℹ️ Push notifications are unavailable in Expo Go on Android; use a development build to test them.')
    return null
  }

  if (!Device.isDevice) {
    console.log('⚠️ Push notifications require a physical device (not a simulator/emulator).')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('⚠️ Push notification permission was not granted.')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    })
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId

  if (!projectId) {
    console.log('⚠️ No EAS projectId configured; cannot fetch an Expo push token.')
    return null
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
    return data
  } catch (error) {
    console.log('⚠️ Could not get an Expo push token:', error)
    return null
  }
}

/**
 * Registers this device for push and sends the token to the backend. Safe to
 * call every time the app boots authenticated (or right after login) — the
 * backend upserts on token, so re-registering the same token is a no-op.
 */
export async function syncPushToken(): Promise<void> {
  try {
    const token = await getExpoPushToken()
    if (!token) return

    await seekerService.registerPushToken(
      token,
      Platform.OS === 'ios' ? 'ios' : 'android',
      Device.modelName ?? undefined,
    )
    await SecureStore.setItemAsync(STORED_TOKEN_KEY, token)
  } catch (error) {
    console.log('⚠️ Push token sync failed:', error)
  }
}

/** Call on logout so this device stops receiving pushes for the signed-out account. */
export async function clearPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(STORED_TOKEN_KEY)
    if (!token) return

    await seekerService.unregisterPushToken(token)
    await SecureStore.deleteItemAsync(STORED_TOKEN_KEY)
  } catch (error) {
    console.log('⚠️ Push token cleanup failed:', error)
  }
}

export interface PushNotificationData {
  type?: string
  application_id?: number | string
  program_id?: number | string
  job_fair_id?: number | string
  post_id?: number | string
  // Interview-specific — present when type === 'interview'.
  // interview_type distinguishes scheduled/updated/cancelled/reminder.
  interview_type?: string
  interview_id?: number | string
}

/**
 * Mirrors handleNotificationPress in app/(seeker)/notifications.tsx — same payload, same destinations.
 *
 * Interview notifications deep-link directly to the application detail screen so the Job Seeker
 * lands on the Interview Details section and can tap [Join Interview] immediately. Other
 * application notifications go to the applications list (the seeker may have many active ones
 * and listing them is a better landing experience than guessing which detail to open).
 */
export function routeForPushData(data: PushNotificationData): string | null {
  if (data.type === 'interview' && data.application_id) {
    return `/(seeker)/applications/${data.application_id}`
  }
  if (data.application_id) return '/(seeker)/applications'
  if (data.program_id) return `/(seeker)/government-programs/${data.program_id}`
  if (data.job_fair_id) return '/(seeker)/job-fairs'
  if (data.post_id) return `/(seeker)/jobs/${data.post_id}`
  return null
}
