import { useEffect, useRef, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { GovernmentProgram } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { useMotion } from '@/hooks/useMotion'
import { EligibilityBadge } from '@/components/EligibilityBadge'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PressableScale } from '@/components/ui/PressableScale'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { apiErrorMessage } from '@/utils/apiError'
import { colors, radii, spacing, typography } from '@/theme'

const CATEGORY_LABELS: Record<string, string> = {
  job_fair: 'Job Fair',
  spes: 'SPES',
  tupad: 'TUPAD',
  gip: 'GIP',
  ofw_assistance: 'OFW Assistance',
  livelihood_program: 'Livelihood',
  tech_voc_training: 'Tech-Voc Training',
  career_guidance: 'Career Guidance',
  citizen_charter: 'Citizen Charter',
  other: 'Other',
}
const CATEGORIES = Object.keys(CATEGORY_LABELS)

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
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string>('open')
  const [page, setPage] = useState(1)
  const [programItems, setProgramItems] = useState<GovernmentProgram[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const m = useMotion()

  const statusScrollRef = useRef<ScrollView>(null)
  const categoryScrollRef = useRef<ScrollView>(null)
  const statusLayouts = useRef<Record<string, number>>({})
  const categoryLayouts = useRef<Record<string, number>>({})

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

  const { data: charterItems = [], error: charterError } = useQuery({
    queryKey: ['citizenCharter'],
    queryFn: () => seekerService.getCitizenCharter(),
    select: (items) => items.slice(0, 3),
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

  const handleStatusPress = (val: string) => {
    setStatus(val)
    const x = statusLayouts.current[val]
    if (x !== undefined) {
      statusScrollRef.current?.scrollTo({ x: Math.max(0, x - spacing.lg), animated: true })
    }
  }

  const handleCategoryPress = (key: string | undefined) => {
    setCategory(key)
    const k = key ?? 'all'
    const x = categoryLayouts.current[k]
    if (x !== undefined) {
      categoryScrollRef.current?.scrollTo({ x: Math.max(0, x - spacing.lg), animated: true })
    }
  }

  const errorMessage = error ? apiErrorMessage(error, 'Unable to load Government Programs. Please try again.') : ''

  const hasMore = data ? page < data.programs.last_page : false

  return (
    <View style={styles.flex}>
    <ScreenHeader title="Government Programs" onBack={() => router.back()} />
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>PESO Programs Center</Text>
      <Text style={styles.subtitle}>
        Browse DOLE and PESO programs — SPES, TUPAD, GIP, livelihood, training, and OFW assistance. Your profile shows a preliminary eligibility estimate; PESO confirms eligibility in person.
      </Text>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search programs by title or keyword"
        placeholderTextColor={colors.subtle}
      />

      {/* Status filter chips */}
      <View style={styles.chipWrapper}>
        <ScrollView
          ref={statusScrollRef}
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          <CategoryChip
            label="Open"
            active={status === 'open'}
            onPress={() => handleStatusPress('open')}
            onLayout={(x) => { statusLayouts.current['open'] = x }}
          />
          <CategoryChip
            label="Closed"
            active={status === 'closed'}
            onPress={() => handleStatusPress('closed')}
            onLayout={(x) => { statusLayouts.current['closed'] = x }}
          />
          <CategoryChip
            label="Completed"
            active={status === 'completed'}
            onPress={() => handleStatusPress('completed')}
            onLayout={(x) => { statusLayouts.current['completed'] = x }}
          />
          <CategoryChip
            label="Any Status"
            active={status === ''}
            onPress={() => handleStatusPress('')}
            onLayout={(x) => { statusLayouts.current[''] = x }}
          />
        </ScrollView>
      </View>

      {/* Category filter chips */}
      <View style={styles.chipWrapper}>
        <ScrollView
          ref={categoryScrollRef}
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          <CategoryChip
            label="All Categories"
            active={!category}
            onPress={() => handleCategoryPress(undefined)}
            onLayout={(x) => { categoryLayouts.current['all'] = x }}
          />
          {CATEGORIES.map((key) => (
            <CategoryChip
              key={key}
              label={data?.categories?.[key] ? `${CATEGORY_LABELS[key]} (${data.categories[key]})` : CATEGORY_LABELS[key]}
              active={category === key}
              onPress={() => handleCategoryPress(key)}
              onLayout={(x) => { categoryLayouts.current[key] = x }}
            />
          ))}
        </ScrollView>
      </View>

      {errorMessage ? (
        <AlertBox variant="warning" style={styles.alertBox}>
          {errorMessage}
        </AlertBox>
      ) : null}

      <Card padding="md" style={styles.bulletinCard}>
        <View style={styles.bulletinRow}>
          <MaterialIcons name="event" size={22} color={colors.info} />
          <View style={styles.bulletinText}>
            <Text style={styles.bulletinTitle}>Job Fair Bulletin</Text>
            <Text style={styles.bulletinSub}>Browse upcoming PESO job fairs</Text>
          </View>
        </View>
        <Button variant="secondary" onPress={() => router.push({ pathname: '/(seeker)/job-fairs', params: { from: 'government-programs' } })} style={styles.bulletinBtn}>
          View Job Fairs
        </Button>
      </Card>

      <Card padding="md" style={styles.bulletinCard}>
        <View style={styles.bulletinRow}>
          <MaterialIcons name="collections" size={22} color={colors.info} />
          <View style={styles.bulletinText}>
            <Text style={styles.bulletinTitle}>Employer Posters</Text>
            <Text style={styles.bulletinSub}>Browse PESO-approved employer job fair posters</Text>
          </View>
        </View>
        <Button variant="secondary" onPress={() => router.push('/(seeker)/employer-posters')} style={styles.bulletinBtn}>
          View Employer Posters
        </Button>
      </Card>

      <SectionHeader title="All Programs" />

      <QueryState
        isLoading={isLoading && page === 1}
        isEmpty={!errorMessage && !programItems.length}
        emptyIcon="school"
        emptyTitle="No programs found"
        emptyMessage="Try a different search term or category."
      >
        {programItems.map((program, index) => (
          <Animated.View
            key={String(program.program_id)}
            entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(240) : undefined}
          >
            <PressableScale
              scaleTo="cardPress"
              ripple={null}
              onPress={() => router.push(`/(seeker)/government-programs/${program.program_id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View ${textFrom(program.title, 'program')} details`}
            >
              <Card padding="md" style={styles.programCard}>
                <View style={styles.programHeader}>
                  <Text style={styles.programTitle} numberOfLines={2}>{textFrom(program.title, 'Untitled program')}</Text>
                  <Badge variant={statusVariant(program.status)}>{titleCase(program.status, 'Open')}</Badge>
                </View>
                <View style={styles.badgeRow}>
                  <Badge variant="neutral" style={styles.categoryBadge}>{categoryLabel(program.category)}</Badge>
                  <EligibilityBadge eligibility={program.eligibility} />
                </View>
                {program.description ? (
                  <Text style={styles.programDescription} numberOfLines={2}>{program.description}</Text>
                ) : null}
                <View style={styles.programMetaRow}>
                  <Text style={styles.programMeta}>Deadline: {formatDate(program.application_deadline)}</Text>
                  <Text style={styles.programMeta}>{slotsLabel(program)}</Text>
                </View>
                {(program.location_address || program.venue) ? (
                  <Text style={styles.programLocation} numberOfLines={1}>
                    <MaterialIcons name="place" size={13} color={colors.info} /> {program.location_address || program.venue}
                  </Text>
                ) : null}
              </Card>
            </PressableScale>
          </Animated.View>
        ))}

        {hasMore ? (
          <Button
            variant="outline"
            onPress={() => setPage((p) => p + 1)}
            disabled={isFetching}
            style={styles.loadMoreBtn}
          >
            {isFetching ? 'Loading...' : 'Load more'}
          </Button>
        ) : null}
      </QueryState>

      {charterError ? (
        <AlertBox variant="warning" style={styles.alertBox}>
          {apiErrorMessage(charterError, 'Unable to load PESO Citizen Charter services.')}
        </AlertBox>
      ) : null}

      {charterItems.length > 0 ? (
        <View style={styles.charterSection}>
          <Text style={styles.charterTitle}>PESO Citizen Charter</Text>
          <Text style={styles.charterDescription}>
            Service requirements, processing commitments, and responsible offices to guide your walk-in applications.
          </Text>
          {charterItems.map((service) => (
            <Card key={String(service.service_id)} padding="md" style={styles.charterCard}>
              <Text style={styles.charterServiceTitle}>{service.service_name}</Text>
              {service.description ? <Text style={styles.charterServiceDescription}>{service.description}</Text> : null}
              <View style={styles.charterDetails}>
                <View style={styles.charterDetail}>
                  <Text style={styles.charterDetailLabel}>Processing</Text>
                  <Text style={styles.charterDetailValue}>{textFrom(service.processing_time, 'Not specified')}</Text>
                </View>
                <View style={styles.charterDetail}>
                  <Text style={styles.charterDetailLabel}>Fees</Text>
                  <Text style={styles.charterDetailValue}>{textFrom(service.fees, 'None')}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </ScrollView>
    </View>
  )
}

function CategoryChip({
  label,
  active,
  onPress,
  onLayout,
}: {
  label: string
  active: boolean
  onPress: () => void
  onLayout?: (x: number) => void
}) {
  return (
    <PressableScale
      scaleTo="buttonPress"
      ripple={null}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.x)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: typography.body, marginBottom: spacing.md },
  chipWrapper: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  chipScrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  chipTextActive: { color: colors.white },
  alertBox: { marginBottom: spacing.lg },
  bulletinCard: { marginTop: spacing.xl, gap: spacing.md },
  bulletinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulletinText: { flex: 1 },
  bulletinTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  bulletinSub: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs },
  bulletinBtn: { marginBottom: 0 },
  programCard: { marginBottom: spacing.md },
  programHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  programTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.title, lineHeight: 22, fontFamily: typography.family.bold },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  categoryBadge: { alignSelf: 'flex-start' },
  programDescription: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18, marginTop: spacing.sm },
  programMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  programMeta: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  programLocation: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.sm },
  loadMoreBtn: { marginTop: spacing.sm },
  charterSection: { marginTop: spacing.xl },
  charterTitle: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold, textAlign: 'center' },
  charterDescription: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  charterCard: { marginBottom: spacing.sm },
  charterServiceTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  charterServiceDescription: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20, marginTop: spacing.sm },
  charterDetails: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  charterDetail: { flex: 1 },
  charterDetailLabel: { color: colors.subtle, fontSize: typography.small, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  charterDetailValue: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.medium },
})
