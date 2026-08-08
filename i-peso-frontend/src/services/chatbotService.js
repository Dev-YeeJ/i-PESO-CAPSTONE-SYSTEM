// src/services/chatbotService.js
// ============================================================
// Public assistant — landing, login, and registration pages.
// Talks to POST /api/chat/public, which is unauthenticated.
// ============================================================

import apiClient from './api'

/** Matches MAX_HISTORY_TURNS on PublicChatbotController. */
const MAX_HISTORY_TURNS = 12

export const chatbotService = {
  /**
   * Ask the assistant a question.
   *
   * The conversation is stateless server-side, so we resend the recent turns
   * with every request. Trimming here (not just on the server) keeps the
   * payload small on mobile data and avoids a 422 from the server's own cap.
   *
   * @param {string} message  The visitor's new message.
   * @param {Array<{role: 'user'|'model', text: string}>} history  Oldest first.
   * @returns {Promise<{ reply: string, retryable: boolean }>}
   */
  async askPublic(message, history = []) {
    try {
      const { data } = await apiClient.post('/chat/public', {
        message,
        history: history.slice(-MAX_HISTORY_TURNS),
      })

      return { reply: data.reply, retryable: false }
    } catch (error) {
      // The API returns a visitor-safe `reply` even on 429/503, so prefer it
      // over inventing our own wording here.
      const reply = error.response?.data?.reply
      if (reply) {
        return { reply, retryable: Boolean(error.response?.data?.retryable) }
      }

      // Network failure, timeout, or CORS — no response body to read.
      return {
        reply:
          'Hindi po ako maka-connect ngayon. Pakicheck po ang inyong internet at subukan ulit. ' +
          '(Could not reach the assistant — please check your connection.)',
        retryable: true,
      }
    }
  },
}

export default chatbotService
