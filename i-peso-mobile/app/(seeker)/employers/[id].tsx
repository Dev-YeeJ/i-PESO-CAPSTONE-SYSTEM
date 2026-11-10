import { useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { textFrom, titleCase } from '@/utils/seekerView'
import { useMotion } from '@/hooks/useMotion'
import { Badge } from '@/components/ui/Badge'
import { EmployerPreferenceChip } from '@/components/ui/EmployerPreferenceChip'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { ReportEmployerModal } from '@/components/ReportEmployerModal'
import { CompanyReviews } from '@/components/reviews/CompanyReviews'
import { colors, radii, spacing, typography } from '@/theme'

// Display rules mirror i-peso-frontend's utils/employerProfile.js (shared by the web panel,
// full page and admin view) so a company reads the same on every surface. Each formatter
// returns null when there's nothing to show; the facts card renders that as "Not provided".

// Mirrors COMPANY_SIZE_OPTIONS in the employer registration form — the API stores the bare code.
const COMPANY_SIZE_LABELS: Record<string, string> = {
  micro: 'Micro (1–9 employees)',
  small: 'Small (10–99 employees)',
  medium: 'Medium (100–199 employees)',
  large: 'Large (200+ employees)',
}

// `industry` is cast to an array on the Employer model, but older rows hold a plain string.
function formatIndustry(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || null
  return value || null
}

function formatCompanySize(value: string | null | undefined): string | null {
  if (!value) return null
  return COMPANY_SIZE_LABELS[value] ?? titleCase(value.replaceAll('_', ' '))
}

function formatEmploymentType(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.replaceAll('_', ' ').trim().toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function formatVacancySalary(job: { hide_salary?: boolean; salary_min?: number | string | null; salary_max?: number | string | null }) {
  if (job.hide_salary) return null
  const min = Number(job.salary_min) || null
  const max = Number(job.salary_max) || null
  if (!min && !max) return null
  const peso = (amount: number) => `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
  if (min !== null && max !== null && min !== max) return `${peso(min)}–${peso(max)} a month`
  const amount = min ?? max
  if (amount === null) return null
  return `${peso(amount)} a month`
}

function formatPostedDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 7) return `Posted ${days} days ago`
  return `Posted ${date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function formatMemberSince(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

// Seekers recognise the brand they'd walk into (trade name); the registered business name
// is secondary and only worth showing when it differs.
function employerDisplayName(employer: { trade_name?: string | null; company_name?: string | null }) {
  return employer.trade_name || employer.company_name || 'This employer'
}

function employerRegisteredName(employer: { trade_name?: string | null; company_name?: string | null }) {
  const { trade_name: trade, company_name: legal } = employer
  return trade && legal && trade !== legal ? legal : null
}

const httpStatus = (caught: unknown) => (caught as AxiosError | null)?.response?.status

// Where the header's back button should land, since employers/[id] is a flat sibling in the
// Tabs navigator (see jobs/[id].tsx's backTargetFor for the same reasoning) — plain
// router.back() has no real history to pop and always falls through to the first tab (Home).
function backTargetFor(from: string | undefined, fromId: string | undefined): string {
  if (from === 'job' && fromId) return `/(seeker)/jobs/${fromId}`
  if (from === 'application' && fromId) return `/(seeker)/applications/${fromId}`
  if (from === 'poster') return '/(seeker)/employer-posters'
  if (from === 'feed') return '/(seeker)/jobs'
  return '/(seeker)'
}

export default function EmployerProfileScreen() {
  const { id, from, fromId } = useLocalSearchParams<{ id: string; from?: string; fromId?: string }>()
  const router = useRouter()
  const backTarget = backTargetFor(from, fromId)
  const [reportOpen, setReportOpen] = useState(false)
  const m = useMotion()

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['employerProfile', id],
    queryFn: () => seekerService.getEmployerProfile(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    // A 404 (employer not verified, or removed) won't change on retry — show it right away.
    retry: (count, caught) => httpStatus(caught) !== 404 && count < 2,
  })

  const header = <ScreenHeader title="Employer Profile" onBack={() => router.replace(backTarget as never)} />

  if (isLoading) {
    return (
      <View style={styles.flex}>
        {header}
        <ScreenSkeleton label="Loading employer profile" />
      </View>
    )
  }

  if (error || !data?.employer) {
    // The endpoint only returns PESO-verified employers; anything else is a 404.
    const notFound = httpStatus(error) === 404
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.center}>
          {notFound ? (
            <EmptyState
              icon="verified-user"
              title="This company profile isn't available"
              message="The employer may still be under PESO review, or their profile was removed."
              action={<Button variant="outline" onPress={() => router.replace('/(seeker)/jobs')}>Browse jobs</Button>}
            />
          ) : (
            <EmptyState
              icon="cloud-off"
              title="Couldn't load this company"
              message="Check your connection, then try again."
              action={<Button variant="outline" onPress={() => refetch()} loading={isRefetching}>Try again</Button>}
            />
          )}
        </View>
      </View>
    )
  }

  const { employer, vacancies = [] } = data
  const name = employerDisplayName(employer)
  const registeredName = employerRegisteredName(employer)
  const industry = formatIndustry(employer.industry)

  return (
    <View style={styles.flex}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {employer.company_logo_url ? (
              <Image source={{ uri: employer.company_logo_url }} style={styles.logo} accessibilityLabel={`${name} logo`} />
            ) : (
              <MaterialIcons name="business" size={36} color={colors.subtle} />
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={2}>{name}</Text>
            {registeredName ? <Text style={styles.registeredName}>Registered as {registeredName}</Text> : null}
            <View style={styles.badgeRow}>
              <Badge variant="success">Verified by PESO</Badge>
              {industry ? <Text style={styles.industry}>{industry}</Text> : null}
            </View>
          </View>
        </View>

        <Card padding="md" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About the company</Text>
          {employer.company_description ? (
            <Text style={styles.description}>{employer.company_description}</Text>
          ) : (
            <Text style={styles.mutedText}>This employer hasn&apos;t added a description yet.</Text>
          )}
        </Card>

        <View style={styles.jobsHeader}>
          <Text style={[styles.sectionTitle, styles.jobsTitle]}>Open jobs</Text>
          <Text style={styles.openingsCount}>{vacancies.length} {vacancies.length === 1 ? 'opening' : 'openings'}</Text>
        </View>
        {vacancies.length > 0 ? (
          <>
            <Text style={styles.jobsSubtitle}>Select a job to see the full details and apply.</Text>
            {vacancies.map((job, index) => {
              const employmentType = formatEmploymentType(job.employment_type)
              const salary = formatVacancySalary(job)
              const posted = formatPostedDate(job.created_at)
              return (
                <Animated.View
                  key={String(job.post_id)}
                  entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(240) : undefined}
                >
                  <PressableScale
                    scaleTo="cardPress"
                    ripple={null}
                    onPress={() => router.push(`/(seeker)/jobs/${job.post_id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${textFrom(job.job_title, 'job')} details`}
                  >
                    <Card padding="md" style={styles.jobCard}>
                      <View style={styles.jobRow}>
                        <View style={styles.jobBody}>
                          <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                          <View style={styles.jobMetaRow}>
                            {job.location ? (
                              <View style={styles.jobMetaItem}>
                                <MaterialIcons name="place" size={14} color={colors.subtle} />
                                <Text style={styles.jobMeta}>{job.location}</Text>
                              </View>
                            ) : null}
                            {employmentType ? (
                              <View style={styles.jobMetaItem}>
                                <MaterialIcons name="work" size={14} color={colors.subtle} />
                                <Text style={styles.jobMeta}>{employmentType}</Text>
                              </View>
                            ) : null}
                            {salary ? (
                              <View style={styles.jobMetaItem}>
                                <MaterialIcons name="payments" size={14} color={colors.subtle} />
                                <Text style={styles.jobMeta}>{salary}</Text>
                              </View>
                            ) : null}
                          </View>
                          <EmployerPreferenceChip job={job} style={styles.preferenceChip} />
                          {posted ? <Text style={styles.jobMetaPosted}>{posted}</Text> : null}
                        </View>
                        <MaterialIcons name="chevron-right" size={22} color={colors.subtle} />
                      </View>
                    </Card>
                  </PressableScale>
                </Animated.View>
              )
            })}
          </>
        ) : (
          <Card padding="md" style={styles.sectionCard}>
            <EmptyState
              icon="work-off"
              title="No open jobs right now"
              message="New postings from this company will show up here."
              action={<Button variant="outline" onPress={() => router.replace('/(seeker)/jobs')}>Browse other jobs</Button>}
            />
          </Card>
        )}

        <Card padding="md" style={[styles.sectionCard, styles.afterJobs]}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Reviews</Text>
          <Text style={styles.reviewsSubtitle}>From people who applied or worked here through i-PESO.</Text>
          <CompanyReviews employerId={employer.employer_id} />
        </Card>

        <Card padding="md" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Company facts</Text>
          <Fact icon="track-changes" label="Industry" value={industry} />
          <Fact icon="groups" label="Company size" value={formatCompanySize(employer.company_size)} />
          <Fact icon="place" label="Location" value={employer.full_address || null} />
          <Fact icon="calendar-today" label="On i-PESO since" value={formatMemberSince(employer.created_at)} last />
        </Card>

        <Card padding="md" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How to apply</Text>
          <Text style={styles.description}>
            Open a job above and apply from its details. Your application goes straight to this employer through i-PESO.
          </Text>
          <View style={styles.safetyBox}>
            <MaterialIcons name="verified-user" size={18} color={colors.info} />
            <Text style={styles.safetyText}>
              PESO checked this employer&apos;s business documents before letting them post jobs. If anyone asks you to pay to apply, report them.
            </Text>
          </View>
        </Card>

        <PressableScale scaleTo="buttonPress" ripple={null} style={styles.reportLink} onPress={() => setReportOpen(true)} accessibilityRole="button">
          <MaterialIcons name="flag" size={16} color={colors.error} />
          <Text style={styles.reportLinkText}>Report this employer</Text>
        </PressableScale>
      </ScrollView>

      <ReportEmployerModal
        visible={reportOpen}
        employerId={employer.employer_id}
        employerName={name}
        onClose={() => setReportOpen(false)}
      />
    </View>
  )
}

/** One company fact. A missing value reads "Not provided" in a muted tone rather than
 *  disappearing, so the seeker can tell the employer left it blank. */
function Fact({ icon, label, value, last = false }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string | null; last?: boolean }) {
  return (
    <View style={[styles.factRow, last && styles.factRowLast]}>
      <View style={styles.factIcon}>
        <MaterialIcons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.factBody}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={value ? styles.factValue : styles.factValueMissing}>{value || 'Not provided'}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  logoWrap: { width: 64, height: 64, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%', resizeMode: 'contain' },
  headerText: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold },
  registeredName: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  industry: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  sectionCard: { marginBottom: spacing.lg },
  afterJobs: { marginTop: spacing.sm },
  reviewsSubtitle: { color: colors.textSecondary, fontSize: typography.small, marginTop: -spacing.xs, marginBottom: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  description: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20 },
  mutedText: { color: colors.subtle, fontSize: typography.body, lineHeight: 20 },
  jobsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  jobsTitle: { marginBottom: 0 },
  openingsCount: { color: colors.subtle, fontSize: typography.small, fontFamily: typography.family.bold },
  jobsSubtitle: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs, marginBottom: spacing.md },
  jobCard: { marginBottom: spacing.sm },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  jobBody: { flex: 1 },
  jobTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  jobMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobMeta: { color: colors.textSecondary, fontSize: typography.small },
  preferenceChip: { marginTop: spacing.sm },
  jobMetaPosted: { color: colors.subtle, fontSize: typography.small, marginTop: spacing.sm },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  factRowLast: { marginBottom: 0 },
  factIcon: { width: 32, height: 32, borderRadius: radii.md, backgroundColor: colors.infoBackground, alignItems: 'center', justifyContent: 'center' },
  factBody: { flex: 1 },
  factLabel: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  factValue: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: 2 },
  factValueMissing: { color: colors.subtle, fontSize: typography.small, marginTop: 2 },
  safetyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  safetyText: { flex: 1, color: colors.info, fontSize: typography.small, lineHeight: 18 },
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingVertical: spacing.md },
  reportLinkText: { color: colors.error, fontSize: typography.small, fontFamily: typography.family.bold },
})
