import { useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { textFrom, titleCase } from '@/utils/seekerView'
import { apiErrorMessage } from '@/utils/apiError'
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
import { colors, radii, spacing, typography } from '@/theme'

const COMPANY_SIZE_LABELS: Record<string, string> = {
  micro: 'Micro (1–9 employees)',
  small: 'Small (10–99 employees)',
  medium: 'Medium (100–199 employees)',
  large: 'Large (200+ employees)',
}

function industryLabel(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || 'Not provided'
  return textFrom(value, 'Not provided')
}

function companySizeLabel(value: string | null | undefined) {
  if (!value) return 'Not provided'
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

function formatMemberSince(value: string | null | undefined) {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not provided'
    : date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['employerProfile', id],
    queryFn: () => seekerService.getEmployerProfile(id as string),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Employer Profile" onBack={() => router.replace(backTarget as never)} />
        <ScreenSkeleton label="Loading employer profile" />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Employer Profile" onBack={() => router.replace(backTarget as never)} />
        <View style={styles.center}>
          <EmptyState
            icon="business"
            title="Employer Not Found"
            message={error ? apiErrorMessage(error, 'Unable to load this employer profile.') : 'Unable to load this employer profile.'}
            action={<Button variant="outline" onPress={() => router.replace(backTarget as never)}>Go Back</Button>}
          />
        </View>
      </View>
    )
  }

  const { employer, vacancies } = data
  const employerName = employer.trade_name || employer.company_name
  const registeredName = employer.trade_name && employer.company_name !== employer.trade_name
    ? employer.company_name
    : null
  const industry = industryLabel(employer.industry)

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Employer Profile" onBack={() => router.replace(backTarget as never)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {employer.company_logo_url ? (
              <Image source={{ uri: employer.company_logo_url }} style={styles.logo} />
            ) : (
              <MaterialIcons name="business" size={36} color={colors.subtle} />
            )}
          </View>
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>{textFrom(employerName, 'Employer')}</Text>
              {employer.verification_status === 'verified' ? (
                <Badge variant="success">Verified by PESO</Badge>
              ) : null}
            </View>
            {registeredName ? <Text style={styles.registeredName}>Registered as {registeredName}</Text> : null}
            {industry !== 'Not provided' ? <Text style={styles.industry}>{industry}</Text> : null}
          </View>
        </View>

        <Card padding="md" style={styles.infoCard}>
          <Text style={styles.sectionTitle}>About the Company</Text>
          <Text style={styles.description}>{textFrom(employer.company_description, 'No description provided.')}</Text>

          <View style={styles.detailGrid}>
            <Detail label="Industry" value={industry} />
            <Detail label="Company Size" value={companySizeLabel(employer.company_size)} />
          </View>
          <Detail label="Location" value={textFrom(employer.full_address, 'Not provided')} />
          <Detail label="On i-PESO Since" value={formatMemberSince(employer.created_at)} />
        </Card>

        <View style={styles.trustBox}>
          <MaterialIcons name="verified-user" size={20} color={colors.info} />
          <Text style={styles.trustText}>
            {employer.verification_status === 'verified'
              ? 'This employer has been verified by the PESO Office and is an authorized job provider.'
              : 'This employer has not been verified by PESO yet.'}
          </Text>
        </View>

        <Card padding="md" style={styles.howToApplyCard}>
          <Text style={styles.sectionTitle}>How to Apply</Text>
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

        <Text style={styles.sectionTitle}>Open Jobs</Text>
        {vacancies.length > 0 ? (
          vacancies.map((job, index) => {
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
                          <MaterialIcons name="attach-money" size={14} color={colors.subtle} />
                          <Text style={styles.jobMeta}>{salary}</Text>
                        </View>
                      ) : null}
                    </View>
                    {posted ? <Text style={styles.jobMetaPosted}>{posted}</Text> : null}
                    <EmployerPreferenceChip job={job} style={styles.preferenceChip} />
                  </Card>
                </PressableScale>
              </Animated.View>
            )
          })
        ) : (
          <EmptyState
            icon="work-off"
            title="No open jobs right now"
            message="New postings from this company will show up here."
            action={<Button variant="outline" onPress={() => router.replace('/(seeker)/jobs')}>Browse other jobs</Button>}
          />
        )}

        <PressableScale scaleTo="buttonPress" ripple={null} style={styles.reportLink} onPress={() => setReportOpen(true)} accessibilityRole="button">
          <MaterialIcons name="flag" size={16} color={colors.error} />
          <Text style={styles.reportLinkText}>Report this employer</Text>
        </PressableScale>
      </ScrollView>

      <ReportEmployerModal
        visible={reportOpen}
        employerId={employer.employer_id}
        employerName={employer.company_name}
        onClose={() => setReportOpen(false)}
      />
    </View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold, flexShrink: 1 },
  registeredName: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs },
  industry: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs },
  infoCard: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  description: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.md },
  detailGrid: { flexDirection: 'row', gap: spacing.md },
  detailItem: { flex: 1, marginBottom: spacing.sm },
  detailLabel: { color: colors.subtle, fontSize: 11, fontFamily: typography.family.bold, textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.medium },
  howToApplyCard: { marginBottom: spacing.lg },
  safetyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  safetyText: { flex: 1, color: colors.info, fontSize: typography.small, lineHeight: 18 },
  trustBox: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  trustText: { flex: 1, color: colors.info, fontSize: typography.small, lineHeight: 18 },
  jobCard: { marginBottom: spacing.sm },
  jobTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  preferenceChip: { marginTop: spacing.sm },
  jobMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobMeta: { color: colors.textSecondary, fontSize: typography.small },
  jobMetaPosted: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.sm },
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl, paddingVertical: spacing.md },
  reportLinkText: { color: colors.error, fontSize: typography.small, fontFamily: typography.family.bold },
})
