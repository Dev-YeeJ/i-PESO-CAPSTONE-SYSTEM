import { Alert, Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { StorageAccessFramework } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as SecureStore from 'expo-secure-store'
import apiClient from '@/services/api'

async function authHeader(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('ipeso_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let result = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    result += BASE64_CHARS[bytes[i] >> 2]
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)]
    result += BASE64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)]
    result += BASE64_CHARS[bytes[i + 2] & 63]
  }
  const remaining = bytes.length - i
  if (remaining === 1) {
    result += BASE64_CHARS[bytes[i] >> 2]
    result += BASE64_CHARS[(bytes[i] & 3) << 4]
    result += '=='
  } else if (remaining === 2) {
    result += BASE64_CHARS[bytes[i] >> 2]
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)]
    result += BASE64_CHARS[(bytes[i + 1] & 15) << 2]
    result += '='
  }
  return result
}

/** Downloads an authenticated GET file endpoint (image/PDF) to local cache and opens the share sheet. */
export async function downloadAndShare(url: string, fileName: string) {
  const headers = await authHeader()
  const target = `${FileSystem.cacheDirectory}${safeFileName(fileName)}`
  const result = await FileSystem.downloadAsync(url, target, { headers })

  if (result.status && result.status >= 400) {
    throw new Error(`Unable to download file (status ${result.status}).`)
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri)
  }

  return result.uri
}

/**
 * Lets the user pick a real folder (e.g. Downloads) via Android's Storage Access Framework and
 * writes the file there directly. Returns whether a folder was actually picked and the file
 * saved — the picker can be dismissed without choosing anything.
 */
async function saveToDeviceStorage(base64: string, fileName: string, mimeType: string): Promise<boolean> {
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync()
  if (!permissions.granted) return false

  const fileUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, mimeType)
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 })
  return true
}

/**
 * POSTs a JSON body and saves the binary (e.g. PDF) response to local cache, then lets the user
 * choose between the share sheet and saving straight to a device folder via the file manager.
 * On Android, the share sheet alone doesn't reliably surface a plain "save to file manager"
 * destination on every device/launcher — Storage Access Framework does that directly. iOS's
 * share sheet already has a first-class "Save to Files" action, so it's used as-is there.
 */
export async function postAndDownload(path: string, body: Record<string, unknown>, fileName: string) {
  const res = await apiClient.post(path, body, { responseType: 'arraybuffer' })
  const base64 = arrayBufferToBase64(res.data as ArrayBuffer)
  const cleanName = safeFileName(fileName)
  const target = `${FileSystem.cacheDirectory}${cleanName}`
  await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 })

  const share = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(target)
    }
  }

  if (Platform.OS === 'android') {
    await new Promise<void>((resolve) => {
      Alert.alert(
        'Resume ready',
        'Save this resume to a folder on your device, or share it to another app.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          { text: 'Share', onPress: () => share().finally(resolve) },
          {
            text: 'Save to device',
            onPress: () =>
              saveToDeviceStorage(base64, cleanName, 'application/pdf')
                .then((saved) => {
                  if (!saved) Alert.alert('Save cancelled', 'No folder was selected, so the resume was not saved.')
                })
                .catch(() => Alert.alert('Save failed', 'Unable to save the resume to that folder. Try again or use Share instead.'))
                .finally(resolve),
          },
        ],
        { cancelable: true, onDismiss: () => resolve() },
      )
    })
  } else {
    await share()
  }

  return target
}
