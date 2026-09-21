import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { LinearGradient } from 'expo-linear-gradient'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import type { ChatTurn, OfficeLocation } from '@/services/chatbotService'
import { chatbotService } from '@/services/chatbotService'
import { useAuthStore } from '@/stores/authStore'
import { useMotion } from '@/hooks/useMotion'
import { AceMascot, type AceState } from '@/components/chat/AceMascot'
import { AceAvatarMark } from '@/components/chat/AceAvatarMark'
import { TypingDots } from '@/components/chat/TypingDots'
import { PressableScale } from '@/components/ui/PressableScale'
import { colors, gradients, radii, shadows, spacing, typography } from '@/theme'

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

// Holds the greeting bubble on a typing beat before the text swaps in, timed to land as Ace's
// greeting wave plays — mirrors i-peso-frontend's UnifiedChatWidget GREETING_REVEAL_DELAY, so
// the greeting reads as something Ace is actively saying rather than static text that was
// just there on open.
const GREETING_REVEAL_DELAY = 1450

type StarterIcon = React.ComponentProps<typeof MaterialIcons>['name']

const SEEKER_STARTERS: { icon: StarterIcon; text: string }[] = [
  { icon: 'work-outline', text: 'May bagong job match po ba para sa akin?' },
  { icon: 'check-circle-outline', text: 'Paano ko malalaman kung na-shortlist ako?' },
  { icon: 'manage-accounts', text: 'Paano mag-update ng aking profile o resume?' },
  { icon: 'event', text: 'Kailan po ang susunod na job fair?' },
]

function greetingFor(firstName?: string) {
  const hello = `Kumusta po${firstName ? ` ${firstName}` : ''}!`
  return (
    `${hello} Ako si Ace, ang inyong Assistant for Career and Employment. ` +
    'Tanungin mo ako tungkol sa job matches, application status, o job fairs — paano kita matutulungan ngayon?'
  )
}

interface DisplayMessage extends ChatTurn {
  id: string
  retryable?: boolean
  officeLocation?: OfficeLocation | null
}

export default function AssistantScreen() {
  const router = useRouter()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const m = useMotion()
  const user = useAuthStore((state) => state.user)
  const listRef = useRef<FlatList<DisplayMessage>>(null)

  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [greetingVisible, setGreetingVisible] = useState(false)
  const [aceState, setAceState] = useState<AceState>('greeting')
  const lastUserTextRef = useRef('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setGreetingVisible(true)
      setAceState('idle')
    }, GREETING_REVEAL_DELAY)
    return () => clearTimeout(timer)
  }, [])

  const greetingText = greetingFor(user?.first_name)

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMessage: DisplayMessage = { id: `${Date.now()}-user`, role: 'user', text: trimmed }
    const historyForRequest: ChatTurn[] = messages.map(({ role, text: t }) => ({ role, text: t }))
    lastUserTextRef.current = trimmed

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)
    setAceState('thinking')

    const { reply, retryable, officeLocation } = await chatbotService.askAssistant(trimmed, historyForRequest)

    setMessages((current) => [...current, { id: `${Date.now()}-model`, role: 'model', text: reply, retryable, officeLocation }])
    setSending(false)
    setAceState(retryable ? 'error' : 'success')
    Haptics.notificationAsync(retryable ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success)
    // Ace holds the success/error pose briefly, then settles back to idle — mirrors the
    // one-shot ONE_SHOT_DURATIONS timing on the web rig.
    setTimeout(() => setAceState((current) => (current === 'thinking' ? current : 'idle')), 1300)
  }

  const retryLastMessage = () => sendMessage(lastUserTextRef.current)

  const onInputFocus = () => { if (!sending) setAceState('listening') }
  const onInputBlur = () => { if (!sending) setAceState('idle') }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight + tabBarHeight}
    >
      <View style={styles.flex}>
        {/* ── Hero header with Ace ── */}
        <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          {/* router.replace, not router.back(): assistant is a flat sibling in the Tabs
              navigator (see job-fairs.tsx for the same reasoning) — back() only happens
              to land on Home today because Home is assistant's one entry point. */}
          <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => router.replace('/(seeker)')} hitSlop={12} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={22} color={colors.white} />
          </PressableScale>

          <View style={styles.heroContent}>
            <View style={styles.mascotWrap}>
              <AceMascot state={aceState} size={72} />
            </View>
            <View style={styles.heroText}>
              <View style={styles.heroNameRow}>
                <MaterialIcons name="auto-awesome" size={14} color={colors.blue200} />
                <Text style={styles.heroName}>Ace</Text>
              </View>
              <Text style={styles.heroRole}>Assistant for Career and Employment</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online — Urdaneta City PESO</Text>
          </View>
        </LinearGradient>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={styles.bubbleRow}>
              <AceAvatarMark size={26} />
              <View style={styles.bubbleColumn}>
                {greetingVisible ? (
                  <Animated.View entering={m.enabled ? FadeInUp.duration(260) : undefined} style={[styles.bubble, styles.modelBubble]}>
                    <Text style={styles.modelText}>{greetingText}</Text>
                  </Animated.View>
                ) : (
                  <View style={[styles.bubble, styles.modelBubble, styles.typingBubble]}>
                    <TypingDots />
                  </View>
                )}
              </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const textStyle = item.role === 'user' ? styles.userText : styles.modelText
            return (
              <Animated.View
                entering={m.enabled ? FadeInUp.delay(m.stagger(Math.min(index, 3))).duration(240) : undefined}
                style={[styles.bubbleRow, item.role === 'user' && styles.bubbleRowUser]}
              >
                {item.role !== 'user' ? <AceAvatarMark size={26} /> : null}
                <View style={styles.bubbleColumn}>
                  <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.modelBubble]}>
                    <Text style={textStyle}>{renderLinkedText(item.text, textStyle)}</Text>
                    {item.retryable ? (
                      <PressableScale scaleTo="buttonPress" ripple={null} onPress={retryLastMessage} disabled={sending} style={styles.retryBtn} accessibilityRole="button">
                        <MaterialIcons name="refresh" size={14} color={colors.info} />
                        <Text style={styles.retryText}>Subukan ulit</Text>
                      </PressableScale>
                    ) : null}
                  </View>
                  {item.officeLocation ? <OfficeLocationCard address={item.officeLocation.address} /> : null}
                </View>
              </Animated.View>
            )
          }}
          ListFooterComponent={
            <>
              {sending ? (
                <Animated.View entering={m.enabled ? FadeInDown.duration(200) : undefined} style={styles.bubbleRow}>
                  <AceAvatarMark size={26} />
                  <View style={[styles.bubble, styles.modelBubble, styles.typingBubble]}>
                    <TypingDots />
                  </View>
                </Animated.View>
              ) : null}
              {messages.length === 0 && !sending && greetingVisible ? (
                <Animated.View entering={m.enabled ? FadeInUp.delay(150).duration(280) : undefined} style={styles.chipGrid}>
                  <Text style={styles.chipGridLabel}>Mga Madalas Itanong</Text>
                  {SEEKER_STARTERS.map((chip) => (
                    <PressableScale key={chip.text} scaleTo="buttonPress" ripple={null} style={styles.chip} onPress={() => sendMessage(chip.text)} accessibilityRole="button">
                      <MaterialIcons name={chip.icon} size={16} color={colors.info} />
                      <Text style={styles.chipText}>{chip.text}</Text>
                    </PressableScale>
                  ))}
                </Animated.View>
              ) : null}
            </>
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="Magtanong kay Ace…"
            placeholderTextColor={colors.subtle}
            maxLength={500}
            editable={!sending}
            multiline
          />
          <PressableScale
            onPress={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            scaleTo="buttonPress"
            ripple={null}
            style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <MaterialIcons name="send" size={20} color={colors.white} />
          </PressableScale>
        </View>
        <Text style={styles.footerBrand}>Powered by iChitech</Text>
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
      <PressableScale scaleTo="buttonPress" ripple={null} style={styles.mapCardButton} onPress={() => Linking.openURL(directionsUrl)} accessibilityRole="button">
        <MaterialIcons name="map" size={15} color={colors.white} />
        <Text style={styles.mapCardButtonText}>Buksan sa Google Maps</Text>
      </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  hero: { paddingTop: spacing.xxl, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, ...shadows.md },
  backBtn: { position: 'absolute', top: spacing.xxl, left: spacing.lg, zIndex: 1, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.heroChip, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, paddingLeft: spacing.xxl + spacing.md },
  mascotWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroName: { color: colors.white, fontSize: typography.heading, fontFamily: typography.family.bold },
  heroRole: { color: colors.blue200, fontSize: typography.small, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.success },
  statusText: { color: colors.blue100, fontSize: 11, fontFamily: typography.family.medium },

  messageList: { padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.sm },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleColumn: { maxWidth: '82%' },
  bubble: { borderRadius: radii.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modelBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radii.sm },
  userBubble: { backgroundColor: colors.secondary, borderBottomRightRadius: radii.sm },
  modelText: { color: colors.textPrimary, fontSize: typography.body, lineHeight: 20 },
  userText: { color: colors.white, fontSize: typography.body, lineHeight: 20 },
  inlineLink: { fontFamily: typography.family.bold, textDecorationLine: 'underline' },
  typingBubble: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs, alignSelf: 'flex-start' },
  retryText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  mapCard: { marginTop: spacing.xs, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  mapCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  mapCardLabel: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  mapCardAddress: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 16, paddingHorizontal: spacing.md, paddingTop: 2, paddingBottom: spacing.sm },
  mapCardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.secondary, paddingVertical: spacing.sm },
  mapCardButtonText: { color: colors.white, fontSize: typography.small, fontFamily: typography.family.bold },
  chipGrid: { gap: spacing.sm, marginTop: spacing.md },
  chipGridLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  chipText: { flex: 1, color: colors.info, fontSize: typography.small, fontFamily: typography.family.medium },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: typography.body, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  footerBrand: { color: colors.subtle, fontSize: 10, textAlign: 'center', paddingTop: spacing.xs, backgroundColor: colors.surface, fontFamily: typography.family.medium },
  disclaimer: { color: colors.subtle, fontSize: 11, textAlign: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface },
})
