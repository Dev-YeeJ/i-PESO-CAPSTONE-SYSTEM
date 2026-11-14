import apiClient from './api'

export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

export interface OfficeLocation {
  address: string
}

export interface ChatReply {
  reply: string
  retryable: boolean
  officeLocation: OfficeLocation | null
  toolResults?: Record<string, any>
}

const MAX_HISTORY_TURNS = 12

/** Languages the Translate button offers — the ones ACE understands (same as the website). */
export const TRANSLATE_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'filipino', label: 'Filipino' },
  { value: 'pangasinan', label: 'Pangasinan' },
  { value: 'ilocano', label: 'Ilocano' },
] as const

export type TranslateLanguage = (typeof TRANSLATE_LANGUAGES)[number]['value']

export const chatbotService = {
  /** Translate one of ACE's replies. Throws an Error with a visitor-safe message. */
  async translate(text: string, language: TranslateLanguage): Promise<string> {
    try {
      const { data } = await apiClient.post('/chat/translate', { text, language })
      return data.translation as string
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      throw new Error(message ?? 'Could not translate right now. Please check your connection and try again.')
    }
  },

  async askAssistant(message: string, history: ChatTurn[] = []): Promise<ChatReply> {
    try {
      const { data } = await apiClient.post('/chat/public', {
        message,
        history: history.slice(-MAX_HISTORY_TURNS),
      })
      return {
        reply: data.reply,
        retryable: false,
        officeLocation: data.office_location ?? null,
        toolResults: data.tool_results ?? {},
      }
    } catch (error: unknown) {
      const reply = (error as { response?: { data?: { reply?: string; retryable?: boolean } } }).response?.data?.reply
      if (reply) {
        return {
          reply,
          retryable: Boolean((error as { response?: { data?: { retryable?: boolean } } }).response?.data?.retryable),
          officeLocation: null,
          toolResults: {},
        }
      }
      return {
        reply: 'Hindi po ako maka-connect ngayon. Pakicheck po ang inyong internet at subukan ulit.',
        retryable: true,
        officeLocation: null,
        toolResults: {},
      }
    }
  },
}
