import { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { GovernmentProgram } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { useMotion } from '@/hooks/useMotion'
import { EligibilityBadge } from '@/components/EligibilityBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { JobCardSkeleton } from '@/components/ui/Skeleton'
import { apiErrorMessage } from '@/utils/apiError'
import { colors, radii, shadows, spacing, textStyles, typography } from '@/theme'

// Redesigned Programs tab (Superdesign draft "16 — Programs"). Postings only — PESO handles
// applications in person, so there is deliberately no apply action anywhere here.

type IconName = React.ComponentProps<typeof MaterialIcons>['name']

const CATEGORY_LABELS: Record<string, string> = {
  job_fair: 'Job Fair',
  spes: 'SPES',
  tupad: 'TUPAD',
  gip: 'GIP',
  ofw_assistance: 'OFW Assistance',
  livelihood_program: 'Livelihood',
  tech_voc_training: 'Tech-Voc Training',
  career_guidance: 'Career Guidance',
  other: 'Other',
}
const CATEGORIES = Object.keys(CATEGORY_LABELS)
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'completed', label: 'Completed' },
  { value: '', label: 'Any status' },
]

function categoryLabel(category?: string | null) {
  if (!category) return 'Program'
  return CATEGORY_LABELS[category] || titleCase(category)
}

function statusVariant(status?: string | null): 'success' | 'info' | 'neutral' {
  const value = textFrom(status, '').toLowerCase()
  if (value === 'open') return 'success'
  if (value === 'completed') return 'info'
  return 'neutral'
}

function slotsLabel(program: GovernmentProgram) {
  if (!program.total_slots || program.total_slots <= 0) return 'Open slots'
  return `${program.total_slots} slots`
}

export default function GovernmentProgramsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string>('open')
  const [page, setPage] = useState(1)
  const [programItems, setProgramItems] = useState<GovernmentProgram[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const m = useMotion()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category, status])

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['governmentPrograms', debouncedSearch, category, status, page],
    queryFn: () => seekerService.getGovernmentPrograms({ search: debouncedSearch || undefined, category, status: status || undefined, page }),
  })

  useEffect(() => {
    if (!data) return
    setProgramItems((prev) => {
      if (page === 1) return data.programs.data
      const existingIds = new Set(prev.map((p) => String(p.program_id)))
      const newOnes = data.programs.data.filter((p) => !existingIds.has(String(p.program_id)))
      return [...prev, ...newOnes]
    })
  }, [data, page])

  const onRefresh = async () => {
    setRefreshing(true)
    setPage(1)
    await refetch()
    setRefreshing(false)
  }

  const submitSearch = () => {
    setPage(1)
    setDebouncedSearch(search.trim())
  }

  const errorMessage = error ? apiErrorMessage(error, 'Unable to load government programs. Please try again.') : ''
  const hasMore = data ? page < data.programs.last_page : false
  const total = data?.programs.total

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xs }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} colors={[colors.secondary]} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>PESO PROGRAMS CENTER</Text>
        <Text style={styles.title} accessibilityRole="header">Government programs</Text>
        <Text style={styles.subtitle}>
          SPES, TUPAD, GIP, livelihood, training and OFW help. Your profile gives an eligibility estimate; PESO confirms it in person.
        </Text>

        <View style={styles.search}>
          <MaterialIcons name="search" size={22} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            accessibilityLabel="Search government programs"
            placeholder="Search programs by title or keyword"
            placeholderTextColor={colors.subtle}
          />
          {search ? (
            <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => setSearch('')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear search">
              <MaterialIcons name="close" size={18} color={colors.subtle} />
            </PressableScale>
          ) : null}
        </View>

        {/* PESO bulletin shortcuts */}
        <View style={styles.bulletinRow}>
          <BulletinTile
            icon="event"
            title="Job Fair Bulletin"
            sub="Upcoming PESO job fairs"
            onPress={() => router.push({ pathname: '/(seeker)/job-fairs', params: { from: 'government-programs' } })}
          />
          <BulletinTile
            icon="photo-library"
            title="Employer Posters"
            sub="PESO-approved hiring posters"
            onPress={() => router.push('/(seeker)/employer-posters')}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          <Chip label="All" selected={!category} onPress={() => setCategory(undefined)} />
          {CATEGORIES.map((key) => (
            <Chip
              key={key}
              label={data?.categories?.[key] ? `${CATEGORY_LABELS[key]} · ${data.categories[key]}` : CATEGORY_LABELS[key]}
              selected={category === key}
              onPress={() => setCategory(key)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.chipScrollTight} contentContainerStyle={styles.chipRow}>
          {STATUS_OPTIONS.map((option) => (
            <Chip key={option.value || 'any'} label={option.label} soft={status !== option.value} selected={status === option.value} onPress={() => setStatus(option.value)} />
          ))}
        </ScrollView>

        <View style={styles.countRow}>
          <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.countText}>
            {typeof total === 'number' ? <Text style={styles.countStrong}>{total} program{total === 1 ? '' : 's'} · </Text> : null}
            postings only, apply at the PESO office
          </Text>
        </View>

        {isLoading && page === 1 ? (
          <View style={styles.list}>
            <JobCardSkeleton />
            <JobCardSkeleton />
          </View>
        ) : errorMessage && !programItems.length ? (
          <EmptyState
            art="cloud"
            title="Couldn't load programs"
            message={errorMessage}
            action={<Button variant="outline" size="sm" icon="refresh" onPress={() => refetch()}>Try again</Button>}
          />
        ) : !programItems.length ? (
          <EmptyState
            art="search"
            title="No programs found"
            message="Try another word, category or status."
            action={
              category || status !== 'open' || search ? (
                <Button variant="outline" size="sm" onPress={() => { setCategory(undefined); setStatus('open'); setSearch('') }}>Clear filters</Button>
              ) : undefined
            }
          />
        ) : (
          <View style={styles.list}>
            {programItems.map((program, index) => (
              <Animated.View key={String(program.program_id)} entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(m.duration('normal')) : undefined}>
                <PressableScale
                  scaleTo="cardPress"
                  ripple={null}
                  onPress={() => router.push(`/(seeker)/government-programs/${program.program_id}`)}
                  style={styles.card}
                  accessibilityRole="button"
                  accessibilityLabel={`${textFrom(program.title, 'Program')}, ${titleCase(program.status, 'Open')}. View details`}
                >
                  <View style={styles.badgeRow}>
                    <Badge variant="info">{categoryLabel(program.category)}</Badge>
                    <Badge variant={statusVariant(program.status)}>{titleCase(program.status, 'Open')}</Badge>
                    <EligibilityBadge eligibility={program.eligibility} />
                  </View>
                  <Text style={styles.programTitle} numberOfLines={2}>{textFrom(program.title, 'Untitled program')}</Text>
                  {program.description ? <Text style={styles.programDescription} numberOfLines={2}>{program.description}</Text> : null}
                  {program.location_address || program.venue ? (
                    <View style={styles.metaRow}>
                      <MaterialIcons name="place" size={15} color={colors.iconBlue} />
                      <Text style={styles.metaText} numberOfLines={1}>{program.location_address || program.venue}</Text>
                    </View>
                  ) : null}
                  <View style={styles.cardFoot}>
                    <View style={styles.metaRow}>
                      <MaterialIcons name="event" size={15} color={colors.iconBlue} />
                      <Text style={styles.metaText}>Until {formatDate(program.application_deadline)} · {slotsLabel(program)}</Text>
                    </View>
                    <View style={styles.detailsLink}>
                      <Text style={styles.detailsText}>Details</Text>
                      <MaterialIcons name="chevron-right" size={18} color={colors.link} />
                    </View>
                  </View>
                </PressableScale>
              </Animated.View>
            ))}

            {hasMore ? (
              <Button variant="outline" onPress={() => setPage((p) => p + 1)} loading={isFetching} style={styles.loadMoreBtn}>
                Load more
              </Button>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function BulletinTile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.bulletin} accessibilityRole="button" accessibilityLabel={`${title}: ${sub}`}>
      <View style={styles.bulletinIcon}>
        <MaterialIcons name={icon} size={22} color={colors.iconBlue} />
      </View>
      <Text style={styles.bulletinTitle}>{title}</Text>
      <Text style={styles.bulletinSub}>{sub}</Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { ...textStyles.label, color: colors.link },
  title: { ...textStyles.display, color: colors.textPrimary, marginTop: 2 },
  subtitle: { ...textStyles.body, color: colors.textSecondary, marginTop: spacing.xs },

  search: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.sunken,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, fontFamily: typography.family.medium, paddingVertical: 0 },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  bulletinRow: { flexDirection: 'row', gap: spacing.md - 2, marginTop: spacing.lg },
  bulletin: { flex: 1, minHeight: 120, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  bulletinIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  bulletinTitle: { ...textStyles.bodyBold, color: colors.textPrimary, marginTop: spacing.md - 2 },
  bulletinSub: { ...textStyles.small, color: colors.subtle, marginTop: 2 },

  chipScroll: { marginHorizontal: -spacing.lg, marginTop: spacing.lg },
  chipScrollTight: { marginHorizontal: -spacing.lg, marginTop: spacing.sm },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.md },
  countText: { ...textStyles.small, color: colors.textSecondary, flexShrink: 1 },
  countStrong: { fontFamily: typography.family.bold, color: colors.textPrimary },

  list: { gap: spacing.md, marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, ...shadows.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  programTitle: { ...textStyles.bodyBold, fontSize: 16, lineHeight: 22, color: colors.textPrimary, marginTop: spacing.md - 2 },
  programDescription: { ...textStyles.small, lineHeight: 18, color: colors.textSecondary, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs + 2, flexShrink: 1 },
  metaText: { ...textStyles.small, color: colors.textSecondary, flexShrink: 1 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  detailsLink: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  detailsText: { ...textStyles.smallBold, fontSize: 13, color: colors.link },
  loadMoreBtn: { marginTop: spacing.xs },
})
