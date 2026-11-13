import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { Faq, OfficeInfo } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { openInBrowser, openPortalLink } from '@/utils/links'
import { useMotion } from '@/hooks/useMotion'
import { FaqAnswer } from '@/components/help/FaqAnswer'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/pages/shared/HelpPage.jsx, components/site-content/HelpCenter.jsx
// and OfficeContactCard.jsx (job seeker view).

export const HELP_KEY = ['help', 'seeker'] as const

/** Every word of the search must appear in the question or answer (as on the website). */
function matches(faq: Faq, term: string) {
  const haystack = `${faq.question} ${faq.answer}`.toLowerCase()
  return term.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word))
}

function backTargetFor(from: string | undefined): string {
  if (from === 'home') return '/(seeker)'
  return '/(seeker)/profile'
}

export default function HelpScreen() {
  const router = useRouter()
  const m = useMotion()
  // A link can open one question directly as faq=12 (the website's #faq-12).
  const { faq: faqParam, from } = useLocalSearchParams<{ faq?: string; from?: string }>()

  const help = useQuery({ queryKey: HELP_KEY, queryFn: () => seekerService.help(), staleTime: 5 * 60_000 })
  const faqs = useMemo(() => help.data?.faqs ?? [], [help.data])
  const office = help.data?.office ?? null

  const [term, setTerm] = useState('')
  const [topic, setTopic] = useState('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const [requestedId, setRequestedId] = useState<string | null>(null)
  const [missingNotice, setMissingNotice] = useState(false)
  const [votes, setVotes] = useState<Record<number, 'yes' | 'no'>>({})

  const scrollRef = useRef<ScrollView>(null)
  const listY = useRef(0)
  const itemY = useRef<Record<number, number>>({})

  // Take the faq param once, then clear it so it doesn't reopen on its own.
  useEffect(() => {
    if (!faqParam) return
    setRequestedId(faqParam)
    router.setParams({ faq: undefined })
  }, [faqParam, router])

  // Open (and scroll to) the requested question once the list is loaded.
  useEffect(() => {
    if (!requestedId || help.isLoading || help.isError) return
    const target = faqs.find((faq) => String(faq.id) === requestedId)
    if (target) {
      setTerm('')
      setTopic('all')
      setOpenId(target.id)
      setTimeout(() => {
        const y = itemY.current[target.id]
        if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, listY.current + y - spacing.lg), animated: m.enabled })
      }, 150)
    } else {
      setMissingNotice(true)
    }
    setRequestedId(null)
  }, [requestedId, faqs, help.isLoading, help.isError, m.enabled])

  const topicsInUse = useMemo(() => [...new Set(faqs.map((faq) => faq.topic))]
    .map((value) => ({ value, label: faqs.find((faq) => faq.topic === value)?.topic_label ?? 'Other questions' })), [faqs])

  const visible = useMemo(() => faqs.filter((faq) => (topic === 'all' || faq.topic === topic) && (!term.trim() || matches(faq, term.trim()))), [faqs, topic, term])

  // With no search and "All topics", group under topic headings.
  const groups = useMemo(() => {
    if (term.trim() || topic !== 'all') return [{ value: 'results', label: null as string | null, items: visible }]
    return topicsInUse.map((t) => ({ value: t.value, label: t.label as string | null, items: visible.filter((faq) => faq.topic === t.value) }))
      .filter((group) => group.items.length)
  }, [visible, topicsInUse, term, topic])

  // A search that finds nothing tells PESO which FAQ to write next: reported once per wording,
  // after the reader pauses typing; never blocks the screen.
  const reported = useRef(new Set<string>())
  const trimmed = term.trim()
  const noResults = !help.isLoading && !help.isError && faqs.length > 0 && trimmed.length >= 3 && visible.length === 0
  useEffect(() => {
    if (!noResults) return undefined
    const key = trimmed.toLowerCase()
    const timer = setTimeout(() => {
      if (reported.current.has(key)) return
      reported.current.add(key)
      seekerService.reportHelpSearchMiss(trimmed).catch(() => undefined)
    }, 1500)
    return () => clearTimeout(timer)
  }, [noResults, trimmed])

  const vote = (faqId: number, helpful: boolean) => {
    setVotes((current) => ({ ...current, [faqId]: helpful ? 'yes' : 'no' }))
    seekerService.voteFaq(faqId, helpful).catch(() => undefined) // best-effort, as on the website
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Help & FAQs" onBack={() => router.replace(backTargetFor(from) as never)} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={help.isRefetching} onRefresh={() => help.refetch()} tintColor={colors.info} />}
      >
        <Text style={styles.kicker}>PESO Urdaneta</Text>
        <Text style={styles.intro}>
          Answers from the PESO office to the questions job seekers ask most. Can&apos;t find yours? The office contact details are at the bottom.
        </Text>

        {missingNotice ? (
          <AlertBox
            variant="info"
            style={styles.notice}
            action={<Button variant="ghost" size="sm" onPress={() => setMissingNotice(false)}>Dismiss</Button>}
          >
            That question is no longer available. Try searching below.
          </AlertBox>
        ) : null}

        {help.isLoading ? (
          <ScreenSkeleton label="Loading questions" />
        ) : help.isError ? (
          <AlertBox
            variant="danger"
            title="Help is unavailable right now"
            style={styles.notice}
            action={<Button variant="outline" size="sm" onPress={() => help.refetch()}>Retry</Button>}
          >
            {apiErrorMessage(help.error, 'The questions could not be loaded. You can still contact the PESO office below.')}
          </AlertBox>
        ) : (
          <>
            {faqs.length > 0 ? (
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={20} color={colors.subtle} />
                <TextInput
                  style={styles.searchInput}
                  value={term}
                  onChangeText={setTerm}
                  placeholder="Search questions, e.g. “requirements” or “password”"
                  placeholderTextColor={colors.subtle}
                  returnKeyType="search"
                  accessibilityLabel="Search questions"
                />
                {term ? (
                  <Pressable onPress={() => setTerm('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                    <MaterialIcons name="close" size={18} color={colors.subtle} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {topicsInUse.length >= 2 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel="Filter by topic">
                {[{ value: 'all', label: 'All topics' }, ...topicsInUse].map((t) => {
                  const selected = topic === t.value
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setTopic(t.value)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t.label}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            ) : null}

            {faqs.length === 0 ? (
              <Text style={styles.empty}>No questions have been published yet. Contact the PESO office below for help.</Text>
            ) : visible.length === 0 ? (
              <Text style={styles.empty}>No questions match “{trimmed}”. Try other words, or contact the office below.</Text>
            ) : (
              <View onLayout={(event) => { listY.current = event.nativeEvent.layout.y }}>
                {groups.map((group) => (
                  <View key={group.value} style={styles.group}>
                    {group.label ? <Text style={styles.groupTitle} accessibilityRole="header">{group.label}</Text> : null}
                    <Card padding="sm" style={styles.groupCard}>
                      {group.items.map((faq, index) => {
                        const open = openId === faq.id
                        return (
                          <View
                            key={faq.id}
                            style={[styles.item, index > 0 && styles.itemDivider]}
                            onLayout={(event) => { itemY.current[faq.id] = event.nativeEvent.layout.y }}
                          >
                            <Pressable
                              onPress={() => setOpenId(open ? null : faq.id)}
                              style={styles.question}
                              accessibilityRole="button"
                              accessibilityState={{ expanded: open }}
                            >
                              <Text style={[styles.questionText, styles.flex]}>{faq.question}</Text>
                              <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={colors.textSecondary} />
                            </Pressable>
                            {open ? (
                              <Animated.View entering={m.enabled ? FadeIn.duration(m.duration('quick')) : undefined} style={styles.answer}>
                                <FaqAnswer text={faq.answer} office={office} />
                                {faq.link_url ? (
                                  <Button variant="outline" size="sm" onPress={() => openPortalLink(faq.link_url, router)} style={styles.faqLink}>
                                    {faq.link_label || 'Learn more'}
                                  </Button>
                                ) : null}
                                <View style={styles.voteRow}>
                                  <Text style={styles.voteText}>
                                    {votes[faq.id] === 'yes' ? 'Thanks — glad it helped.' : votes[faq.id] === 'no' ? 'Thanks — PESO will improve this answer.' : 'Was this helpful?'}
                                  </Text>
                                  {(['yes', 'no'] as const).map((value) => {
                                    const active = votes[faq.id] === value
                                    return (
                                      <Pressable
                                        key={value}
                                        onPress={() => vote(faq.id, value === 'yes')}
                                        style={[styles.voteBtn, active && styles.voteBtnActive]}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                      >
                                        <MaterialIcons name={value === 'yes' ? 'thumb-up-off-alt' : 'thumb-down-off-alt'} size={14} color={colors.textSecondary} />
                                        <Text style={styles.voteBtnText}>{value === 'yes' ? 'Yes' : 'No'}</Text>
                                      </Pressable>
                                    )
                                  })}
                                </View>
                              </Animated.View>
                            ) : null}
                          </View>
                        )
                      })}
                    </Card>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* The contact card shows even when the questions failed to load. */}
        <OfficeContactCard office={office} />
      </ScrollView>
    </View>
  )
}

/** Only fields PESO filled in; null means "not on record" and is never shown. No employer-only rows. */
function OfficeContactCard({ office }: { office: OfficeInfo | null }) {
  const mapLink = office?.map_url || (office?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}` : null)
  const rows: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string; linkLabel?: string; href?: string | null }[] = []
  if (office?.address) rows.push({ icon: 'place', label: 'Address', value: office.address, linkLabel: 'Get directions', href: mapLink })
  if (office?.hours) rows.push({ icon: 'schedule', label: 'Office hours', value: office.hours })
  if (office?.phone) rows.push({ icon: 'phone', label: 'Phone', value: office.phone, href: `tel:${office.phone.replace(/[^\d+]/g, '')}` })
  if (office?.email) rows.push({ icon: 'mail-outline', label: 'Email', value: office.email, href: `mailto:${office.email}` })
  if (office?.facebook) rows.push({ icon: 'public', label: 'Facebook', value: 'PESO Urdaneta City', href: office.facebook })
  if (office?.fees_policy) rows.push({ icon: 'account-balance-wallet', label: 'Fees', value: office.fees_policy })

  return (
    <Card padding="md" style={styles.contactCard}>
      <Text style={styles.contactKicker}>Still need help?</Text>
      <Text style={styles.contactTitle} accessibilityRole="header">{office?.office_name || 'PESO Urdaneta City'}</Text>
      {rows.length === 0 ? (
        <Text style={styles.contactValue}>Visit the PESO office of Urdaneta City.</Text>
      ) : (
        rows.map((row) => {
          const content = (
            <>
              <MaterialIcons name={row.icon} size={18} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.contactLabel}>{row.label}</Text>
                <Text style={styles.contactValue}>{row.value}</Text>
                {row.href && row.linkLabel ? <Text style={styles.contactLink}>{row.linkLabel}</Text> : null}
              </View>
            </>
          )
          return row.href ? (
            <Pressable
              key={row.label}
              onPress={() => openInBrowser(row.href as string)}
              style={styles.contactRow}
              accessibilityRole="link"
              accessibilityLabel={`${row.label}: ${row.value}${row.linkLabel ? `. ${row.linkLabel}` : ''}`}
            >
              {content}
            </Pressable>
          ) : (
            <View key={row.label} style={styles.contactRow}>{content}</View>
          )
        })
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { ...textStyles.label, color: colors.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  intro: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.md },
  notice: { marginBottom: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, paddingHorizontal: spacing.md, minHeight: 48 },
  searchInput: { ...textStyles.body, flex: 1, color: colors.textPrimary, paddingVertical: spacing.sm },
  chips: { gap: spacing.sm, paddingVertical: spacing.md },
  chip: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...textStyles.smallBold, color: colors.textSecondary },
  chipTextSelected: { color: colors.white },
  empty: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginVertical: spacing.lg },
  group: { marginTop: spacing.md },
  groupTitle: { ...textStyles.smallBold, color: colors.textPrimary, marginBottom: spacing.sm },
  groupCard: {},
  item: { paddingHorizontal: spacing.sm },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  question: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingVertical: spacing.sm },
  questionText: { ...textStyles.bodyBold, color: colors.textPrimary, backgroundColor: 'transparent' },
  answer: { paddingBottom: spacing.md, gap: spacing.md },
  faqLink: { alignSelf: 'flex-start' },
  voteRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  voteText: { ...textStyles.small, color: colors.textSecondary },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md },
  voteBtnActive: { borderColor: colors.borderStrong, backgroundColor: colors.sunken },
  voteBtnText: { ...textStyles.smallBold, color: colors.textSecondary },
  contactCard: { marginTop: spacing.xl },
  contactKicker: { ...textStyles.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactTitle: { ...textStyles.title, color: colors.textPrimary, marginTop: spacing.xs, marginBottom: spacing.sm },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  contactLabel: { ...textStyles.label, color: colors.subtle, textTransform: 'uppercase' },
  contactValue: { ...textStyles.small, color: colors.textPrimary, lineHeight: 18 },
  contactLink: { ...textStyles.smallBold, color: colors.secondary, marginTop: 2 },
})
