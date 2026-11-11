import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UnifiedChatWidget from '../UnifiedChatWidget'

const { askPublic } = vi.hoisted(() => ({ askPublic: vi.fn() }))

vi.mock('@/services/chatbotService', () => ({
  chatbotService: { askPublic },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => selector({ user: null }),
}))

class MockSpeechRecognition {
  constructor() {
    MockSpeechRecognition.instances.push(this)
  }

  start() {
    this.onstart?.()
  }

  stop() {
    this.onend?.()
  }

  abort() {
    this.onend?.()
  }
}

MockSpeechRecognition.instances = []

describe('UnifiedChatWidget voice controls', () => {
  beforeEach(() => {
    askPublic.mockReset()
    MockSpeechRecognition.instances = []
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), speak: vi.fn() },
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        constructor(text) {
          this.text = text
        }
      },
    })
  })

  it('puts a recognized transcript in the composer without sending it', () => {
    askPublic.mockResolvedValue({
      reply: 'Here are some job opportunities.',
      officeLocation: null,
      retryable: false,
      toolResults: {},
    })
    render(<UnifiedChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Ask ACE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }))

    const [recognition] = MockSpeechRecognition.instances
    expect(recognition).toBeDefined()
    act(() => {
      recognition.onresult({
        results: [{ 0: { transcript: 'Find me a job' } }],
      })
    })

    expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveValue('Find me a job')
    expect(askPublic).not.toHaveBeenCalled()
    act(() => recognition.onend())
    expect(screen.getByText('Voice message draft · Not sent')).toBeInTheDocument()
    expect(screen.getByText('Find me a job')).toBeInTheDocument()
    expect(askPublic).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'Find me a job in Urdaneta' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    return waitFor(() => expect(askPublic).toHaveBeenCalledWith('Find me a job in Urdaneta', []))
  })

  it('asks the user to type or try again when microphone permission is denied', () => {
    render(<UnifiedChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Ask ACE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }))

    const [recognition] = MockSpeechRecognition.instances
    act(() => recognition.onerror({ error: 'not-allowed' }))
    act(() => recognition.onend())
    expect(screen.getByRole('status')).toHaveTextContent('Microphone access was denied')
  })

  it('reads an assistant reply aloud and lets the user stop playback', async () => {
    askPublic.mockResolvedValue({
      reply: 'Your application is being reviewed.',
      officeLocation: null,
      retryable: false,
      toolResults: {},
    })
    render(<UnifiedChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Ask ACE' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'What is my application status?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await screen.findByText('Your application is being reviewed.')
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Read reply aloud' }))

    const utterance = window.speechSynthesis.speak.mock.calls[0][0]
    expect(utterance.text).toBe('Your application is being reviewed.')
    expect(utterance.lang).toBe('fil-PH')
    fireEvent.click(screen.getByRole('button', { name: 'Stop speaking reply' }))
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})
