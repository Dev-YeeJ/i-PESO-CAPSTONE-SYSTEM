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
}

const MAX_HISTORY_TURNS = 12

export const chatbotService = {
  async askAssistant(message: string, history: ChatTurn[] = []): Promise<ChatReply> {
    try {
      const { data } = await apiClient.post('/chat/public', {
        message,
        history: history.slice(-MAX_HISTORY_TURNS),
      })
      return { reply: data.reply, retryable: false, officeLocation: data.office_location ?? null }
    } catch (error: unknown) {
      const reply = (error as { response?: { data?: { reply?: string; retryable?: boolean } } }).response?.data?.reply
      if (reply) {
        return {
          reply,
          retryable: Boolean((error as { response?: { data?: { retryable?: boolean } } }).response?.data?.retryable),
          officeLocation: null,
        }
      }
      return {
        reply: 'Hindi po ako maka-connect ngayon. Pakicheck po ang inyong internet at subukan ulit.',
        retryable: true,
        officeLocation: null,
      }
    }
  },
}
