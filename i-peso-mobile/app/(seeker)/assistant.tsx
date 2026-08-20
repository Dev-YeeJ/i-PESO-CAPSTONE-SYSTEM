import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { ChatTurn } from '@/services/chatbotService'
import { chatbotService } from '@/services/chatbotService'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, radii, spacing, typography } from '@/theme'

const GREETING = 'Kumusta po! Ako ang i-PESO assistant ng Urdaneta City PESO. Maaari po kayong magtanong tungkol sa registration, trabaho, job fairs, at government programs.'

const STARTER_CHIPS = [
  'Paano po mag-register?',
  'May trabaho po ba para sa welder?',
  'Kailan po ang susunod na job fair?',
  'Libre po ba ang i-PESO?',
]

interface DisplayMessage extends ChatTurn {
  id: string
  retryable?: boolean
}

export default function AssistantScreen() {
  const router = useRouter()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const listRef = useRef<FlatList<DisplayMessage>>(null)

  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMessage: DisplayMessage = { id: `${Date.now()}-user`, role: 'user', text: trimmed }
    const historyForRequest: ChatTurn[] = messages.map(({ role, text: t }) => ({ role, text: t }))

    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)

    const { reply, retryable } = await chatbotService.askAssistant(trimmed, historyForRequest)

    setMessages((current) => [...current, { id: `${Date.now()}-model`, role: 'model', text: reply, retryable }])
    setSending(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight + tabBarHeight}
    >
      <View style={styles.flex}>
        <ScreenHeader title="i-PESO Assistant" onBack={() => router.back()} />

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={styles.bubbleRow}>
              <View style={[styles.bubble, styles.modelBubble]}>
                <Text style={styles.modelText}>{GREETING}</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' && styles.bubbleRowUser]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.modelBubble]}>
                <Text style={item.role === 'user' ? styles.userText : styles.modelText}>{item.text}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <>
              {sending ? (
                <View style={styles.bubbleRow}>
                  <View style={[styles.bubble, styles.modelBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color={colors.info} />
                  </View>
                </View>
              ) : null}
              {messages.length === 0 && !sending ? (
                <View style={styles.chipGrid}>
                  {STARTER_CHIPS.map((chip) => (
                    <TouchableOpacity key={chip} style={styles.chip} onPress={() => sendMessage(chip)}>
                      <Text style={styles.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </>
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Magtanong po kayo…"
            placeholderTextColor={colors.subtle}
            maxLength={500}
            editable={!sending}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={sending || !input.trim()}
          >
            <MaterialIcons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>Sagot batay sa impormasyon ng PESO. Huwag pong maglagay ng personal na impormasyon dito.</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  messageList: { padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: radii.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modelBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radii.sm },
  userBubble: { backgroundColor: colors.secondary, borderBottomRightRadius: radii.sm },
  modelText: { color: colors.textPrimary, fontSize: typography.body, lineHeight: 20 },
  userText: { color: colors.white, fontSize: typography.body, lineHeight: 20 },
  typingBubble: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  chipGrid: { gap: spacing.sm, marginTop: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  chipText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.medium },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: typography.body, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  disclaimer: { color: colors.subtle, fontSize: 11, textAlign: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface },
})
