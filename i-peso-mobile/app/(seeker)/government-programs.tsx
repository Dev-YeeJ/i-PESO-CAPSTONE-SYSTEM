import { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { GovernmentProgram } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { EligibilityBadge } from '@/components/EligibilityBadge'
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
  const available = program.available_slots ?? 0
  return `${available}/${program.total_slots} slots`
}

export default function GovernmentProgramsScreen() {
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
    queryKey: ['governmentPrograms', debouncedSearch, category, page],
    queryFn: () => seekerService.getGovernmentPrograms({ search: debouncedSearch || undefined, category, page }),
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
        Browse SPES, TUPAD, livelihood, and training programs available through PESO.
      </Text>


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

      <Card padding="md" style={styles.bulletinCard}>
        <View style={styles.bulletinRow}>
          <MaterialIcons name="event" size={22} color={colors.info} />
          <View style={styles.bulletinText}>
            <Text style={styles.bulletinTitle}>Job Fair Bulletin</Text>
            <Text style={styles.bulletinSub}>Browse upcoming PESO job fairs</Text>
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
            onPress={() => router.push(`/(seeker)/government-programs/${program.program_id}`)}
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
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: typography.body, marginBottom: spacing.md },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.lg },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
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
  loadMoreBtn: { marginTop: spacing.sm },
})
