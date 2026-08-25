import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { ChatTurn, OfficeLocation } from '@/services/chatbotService'
import { chatbotService } from '@/services/chatbotService'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, radii, spacing, typography } from '@/theme'

/** Matches a bare URL or email address inside otherwise plain chat text. */
const URL_OR_EMAIL = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g

/**
 * Turns bare URLs and email addresses in the assistant's plain-text reply
 * into tappable links, mirroring the website's linkifyText() — React Native
 * has no HTML rendering, so nested <Text onPress> is the equivalent here.
 */
function renderLinkedText(text: string, baseStyle: TextStyle) {
  return text.split(URL_OR_EMAIL).map((part, index) => {
    if (!part) return null

    const isUrl = /^https?:\/\//.test(part)
    const isEmail = !isUrl && /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)
    if (!isUrl && !isEmail) {
      return part
    }

    // The model often leaves the match butted up against sentence
    // punctuation, e.g. "...facebook.com/page. Maaari" — that trailing
    // punctuation is not part of the link.
    const trailing = part.match(/[.,)\]]+$/)?.[0] ?? ''
    const clean = trailing ? part.slice(0, part.length - trailing.length) : part
    const href = isUrl ? clean : `mailto:${clean}`

    return (
      <Text key={index}>
        <Text style={[baseStyle, styles.inlineLink]} onPress={() => Linking.openURL(href)}>
          {clean}
        </Text>
        {trailing}
      </Text>
    )
  })
}

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
  officeLocation?: OfficeLocation | null
}

export default function AssistantScreen() {
  const router = useRouter()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const listRef = useRef<FlatList<DisplayMessage>>(null)

  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const lastUserTextRef = useRef('')

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMessage: DisplayMessage = { id: `${Date.now()}-user`, role: 'user', text: trimmed }
    const historyForRequest: ChatTurn[] = messages.map(({ role, text: t }) => ({ role, text: t }))
    lastUserTextRef.current = trimmed

    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)

    const { reply, retryable, officeLocation } = await chatbotService.askAssistant(trimmed, historyForRequest)

    setMessages((current) => [...current, { id: `${Date.now()}-model`, role: 'model', text: reply, retryable, officeLocation }])
    setSending(false)
  }

  const retryLastMessage = () => sendMessage(lastUserTextRef.current)

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
              <View style={styles.bubbleColumn}>
                <View style={[styles.bubble, styles.modelBubble]}>
                  <Text style={styles.modelText}>{GREETING}</Text>
                </View>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const textStyle = item.role === 'user' ? styles.userText : styles.modelText
            return (
              <View style={[styles.bubbleRow, item.role === 'user' && styles.bubbleRowUser]}>
                <View style={styles.bubbleColumn}>
                  <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.modelBubble]}>
                    <Text style={textStyle}>{renderLinkedText(item.text, textStyle)}</Text>
                    {item.retryable ? (
                      <TouchableOpacity onPress={retryLastMessage} disabled={sending} style={styles.retryBtn}>
                        <MaterialIcons name="refresh" size={14} color={colors.info} />
                        <Text style={styles.retryText}>Subukan ulit</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {item.officeLocation ? <OfficeLocationCard address={item.officeLocation.address} /> : null}
                </View>
              </View>
            )
          }}
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

/**
 * Shown right in the chat log when the visitor asked a "where" question and
 * the reply gave the office's on-record address (see office_location on the
 * API response). React Native has no <iframe>, so instead of an embedded
 * map this hands off to the device's Maps app — the standard mobile pattern
 * for a single static address, and it needs no geocoding on our side.
 */
function OfficeLocationCard({ address }: { address: string }) {
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapCardHeader}>
        <MaterialIcons name="place" size={14} color={colors.info} />
        <Text style={styles.mapCardLabel}>PESO Urdaneta City</Text>
      </View>
      <Text style={styles.mapCardAddress}>{address}</Text>
      <TouchableOpacity style={styles.mapCardButton} onPress={() => Linking.openURL(directionsUrl)}>
        <MaterialIcons name="map" size={15} color={colors.white} />
        <Text style={styles.mapCardButtonText}>Buksan sa Google Maps</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  messageList: { padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleColumn: { maxWidth: '85%' },
  bubble: { borderRadius: radii.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modelBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radii.sm },
  userBubble: { backgroundColor: colors.secondary, borderBottomRightRadius: radii.sm },
  modelText: { color: colors.textPrimary, fontSize: typography.body, lineHeight: 20 },
  userText: { color: colors.white, fontSize: typography.body, lineHeight: 20 },
  inlineLink: { fontFamily: typography.family.bold, textDecorationLine: 'underline' },
  typingBubble: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs, alignSelf: 'flex-start' },
  retryText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  mapCard: { marginTop: spacing.xs, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  mapCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  mapCardLabel: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  mapCardAddress: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 16, paddingHorizontal: spacing.md, paddingTop: 2, paddingBottom: spacing.sm },
  mapCardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.secondary, paddingVertical: spacing.sm },
  mapCardButtonText: { color: colors.white, fontSize: typography.small, fontFamily: typography.family.bold },
  chipGrid: { gap: spacing.sm, marginTop: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  chipText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.medium },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: typography.body, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  disclaimer: { color: colors.subtle, fontSize: 11, textAlign: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface },
})
