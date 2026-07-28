import { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { GovernmentProgram } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { apiErrorMessage } from '@/utils/apiError'
import { colors, radii, spacing, typography } from '@/theme'

const CATEGORY_LABELS: Record<string, string> = {
  job_fair: 'Job Fair',
  spes: 'SPES',
  tupad: 'TUPAD',
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
  const available = program.available_slots ?? 0
  return `${available}/${program.total_slots} slots`
}

export default function UpskillHubScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [programItems, setProgramItems] = useState<GovernmentProgram[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category])

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['upskillHub', debouncedSearch, category, page],
    queryFn: () => seekerService.getUpskillHub({ search: debouncedSearch || undefined, category, page }),
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

  const errorMessage = error ? apiErrorMessage(error, 'Unable to load the Upskill Hub. Please try again.') : ''

  const hasMore = data ? page < data.programs.last_page : false
  const recommended = data?.recommended ?? []
  const jobFairs = data?.job_fairs ?? []

  return (
    <View style={styles.flex}>
    <ScreenHeader title="Upskill Hub" onBack={() => router.back()} />
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.kicker}>Government Programs</Text>
      <Text style={styles.subtitle}>
        Browse SPES, TUPAD, livelihood, and training programs available through PESO.
      </Text>

      <Button variant="outline" onPress={() => router.push('/(seeker)/program-applications')} style={styles.myAppsBtn}>
        My Applications
      </Button>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search programs by title or keyword"
        placeholderTextColor={colors.subtle}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <CategoryChip label="All" active={!category} onPress={() => setCategory(undefined)} />
        {CATEGORIES.map((key) => (
          <CategoryChip
            key={key}
            label={data?.categories?.[key] ? `${CATEGORY_LABELS[key]} (${data.categories[key]})` : CATEGORY_LABELS[key]}
            active={category === key}
            onPress={() => setCategory(key)}
          />
        ))}
      </ScrollView>

      {errorMessage ? (
        <AlertBox variant="warning" style={styles.alertBox}>
          {errorMessage}
        </AlertBox>
      ) : null}

      {recommended.length > 0 && (
        <>
          <SectionHeader title="Recommended for you" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendedRow}>
            {recommended.map((program) => (
              <TouchableOpacity
                key={String(program.program_id)}
                activeOpacity={0.9}
                onPress={() => router.push(`/(seeker)/upskill-hub/${program.program_id}`)}
                style={styles.recommendedCardWrap}
              >
                <Card padding="md" style={styles.recommendedCard}>
                  <Badge variant="info">{categoryLabel(program.category)}</Badge>
                  <Text style={styles.recommendedTitle} numberOfLines={2}>{textFrom(program.title, 'Untitled program')}</Text>
                  {program.recommendation_reason ? (
                    <Text style={styles.recommendedReason} numberOfLines={2}>{program.recommendation_reason}</Text>
                  ) : null}
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Card padding="md" style={styles.bulletinCard}>
        <View style={styles.bulletinRow}>
          <MaterialIcons name="event" size={22} color={colors.info} />
          <View style={styles.bulletinText}>
            <Text style={styles.bulletinTitle}>Job Fair Bulletin</Text>
            <Text style={styles.bulletinSub}>{jobFairs.length} job fair{jobFairs.length === 1 ? '' : 's'} posted by PESO</Text>
          </View>
        </View>
        <Button variant="secondary" onPress={() => router.push('/(seeker)/job-fairs')} style={styles.bulletinBtn}>
          View Job Fairs
        </Button>
      </Card>

      <Card padding="md" style={styles.bulletinCard}>
        <View style={styles.bulletinRow}>
          <MaterialIcons name="fact-check" size={22} color={colors.info} />
          <View style={styles.bulletinText}>
            <Text style={styles.bulletinTitle}>PESO Citizen Charter</Text>
            <Text style={styles.bulletinSub}>Requirements, fees, and steps for frontline services</Text>
          </View>
        </View>
        <Button variant="secondary" onPress={() => router.push('/(seeker)/citizen-charter')} style={styles.bulletinBtn}>
          View Citizen Charter
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
        {programItems.map((program) => (
          <TouchableOpacity
            key={String(program.program_id)}
            activeOpacity={0.9}
            onPress={() => router.push(`/(seeker)/upskill-hub/${program.program_id}`)}
          >
            <Card padding="md" style={styles.programCard}>
              <View style={styles.programHeader}>
                <Text style={styles.programTitle} numberOfLines={2}>{textFrom(program.title, 'Untitled program')}</Text>
                <Badge variant={statusVariant(program.status)}>{titleCase(program.status, 'Open')}</Badge>
              </View>
              <Badge variant="neutral" style={styles.categoryBadge}>{categoryLabel(program.category)}</Badge>
              {program.short_description ? (
                <Text style={styles.programDescription} numberOfLines={2}>{program.short_description}</Text>
              ) : null}
              <View style={styles.programMetaRow}>
                <Text style={styles.programMeta}>Deadline: {formatDate(program.application_deadline)}</Text>
                <Text style={styles.programMeta}>{slotsLabel(program)}</Text>
              </View>
            </Card>
          </TouchableOpacity>
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
    </ScrollView>
    </View>
  )
}

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  myAppsBtn: { marginBottom: spacing.lg },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.subtle, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.primary, fontSize: typography.body, marginBottom: spacing.md },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.lg },
  chip: { borderWidth: 1, borderColor: colors.subtle, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  chipActive: { backgroundColor: colors.info, borderColor: colors.info },
  chipText: { color: colors.muted, fontSize: typography.small, fontWeight: typography.bold },
  chipTextActive: { color: colors.white },
  alertBox: { marginBottom: spacing.lg },
  recommendedRow: { gap: spacing.md, paddingBottom: spacing.sm },
  recommendedCardWrap: { width: 220 },
  recommendedCard: { minHeight: 110, gap: spacing.xs },
  recommendedTitle: { color: colors.primary, fontSize: typography.body, fontWeight: typography.bold, marginTop: spacing.xs },
  recommendedReason: { color: colors.secondaryText, fontSize: typography.small, marginTop: spacing.xs },
  bulletinCard: { marginTop: spacing.xl, gap: spacing.md },
  bulletinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulletinText: { flex: 1 },
  bulletinTitle: { color: colors.primary, fontSize: typography.body, fontWeight: typography.bold },
  bulletinSub: { color: colors.secondaryText, fontSize: typography.small, marginTop: spacing.xs },
  bulletinBtn: { marginBottom: 0 },
  programCard: { marginBottom: spacing.md },
  programHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  programTitle: { flex: 1, color: colors.primary, fontSize: typography.title, lineHeight: 22, fontWeight: typography.bold },
  categoryBadge: { alignSelf: 'flex-start', marginTop: spacing.sm },
  programDescription: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginTop: spacing.sm },
  programMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  programMeta: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold },
  loadMoreBtn: { marginTop: spacing.sm },
})
