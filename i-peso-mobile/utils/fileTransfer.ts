import * as FileSystem from 'expo-file-system/legacy'
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

/** POSTs a JSON body and saves the binary (e.g. PDF) response to local cache, then opens the share sheet. */
export async function postAndDownload(path: string, body: Record<string, unknown>, fileName: string) {
  const res = await apiClient.post(path, body, { responseType: 'arraybuffer' })
  const base64 = arrayBufferToBase64(res.data as ArrayBuffer)
  const target = `${FileSystem.cacheDirectory}${safeFileName(fileName)}`
  await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 })

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(target)
  }

  return target
}
