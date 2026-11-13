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
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
  })

  it('sends a spoken question as soon as the speaker stops', async () => {
    askPublic.mockResolvedValue({
      reply: 'Here are some job opportunities.',
      officeLocation: null,
      retryable: false,
      toolResults: {},
    })
    render(<UnifiedChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Ask ACE' }))
    expect(screen.queryByLabelText('Speech language')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }))

    const [recognition] = MockSpeechRecognition.instances
    expect(recognition).toBeDefined()
    act(() => {
      recognition.onresult({
        results: [{ 0: { transcript: 'Find me a job' } }],
      })
    })

    // While still speaking: shown live in the box, not sent yet.
    expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveValue('Find me a job')
    expect(askPublic).not.toHaveBeenCalled()

    act(() => recognition.onend())

    await waitFor(() => expect(askPublic).toHaveBeenCalledWith('Find me a job', []))
    expect(askPublic).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Here are some job opportunities.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your question' })).toHaveValue('')
  })

  it('adds speech to what was already typed and sends both', async () => {
    askPublic.mockResolvedValue({ reply: 'Okay.', officeLocation: null, retryable: false, toolResults: {} })
    render(<UnifiedChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Ask ACE' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), { target: { value: 'Paano po' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }))

    const [recognition] = MockSpeechRecognition.instances
    act(() => recognition.onresult({ results: [{ 0: { transcript: 'mag-register sa job fair' } }] }))
    act(() => recognition.onend())

    await waitFor(() => expect(askPublic).toHaveBeenCalledWith('Paano po mag-register sa job fair', []))
  })

  it('sends nothing when no speech was heard', () => {
    render(<UnifiedChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Ask ACE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }))

    const [recognition] = MockSpeechRecognition.instances
    act(() => recognition.onend())

    expect(askPublic).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('couldn’t understand that')
  })

  it('keeps the microphone actionable and explains when recognition is unsupported', () => {
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: undefined,
    })
    render(<UnifiedChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Ask ACE' }))
    const microphone = screen.getByRole('button', { name: 'Start voice input' })
    expect(microphone).toBeEnabled()
    fireEvent.click(microphone)

    expect(screen.getByRole('status')).toHaveTextContent('not supported by this browser')
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
    expect(utterance.lang).toBe(navigator.languages?.[0] || navigator.language || 'fil-PH')
    fireEvent.click(screen.getByRole('button', { name: 'Stop speaking reply' }))
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})
