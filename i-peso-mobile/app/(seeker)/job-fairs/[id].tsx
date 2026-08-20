import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import type { JobFair } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, radii, spacing, typography } from '@/theme'

function statusVariant(status?: string | null): 'info' | 'success' | 'neutral' {
  const value = textFrom(status, '').toLowerCase()
  if (['published', 'accepting_employers', 'upcoming'].includes(value)) return 'info'
  if (['ongoing', 'active'].includes(value)) return 'success'
  return 'neutral'
}

export default function JobFairDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  // There is no single-fetch endpoint for job fairs (backend only exposes
  // GET /job-fairs), so the detail screen reads from the list's cache.
  const jobFairs = queryClient.getQueryData<JobFair[]>(['jobFairs'])
  const fair = useMemo(() => jobFairs?.find((f) => String(f.job_fair_id) === id), [jobFairs, id])

  if (!fair) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Job Fair" onBack={() => router.replace('/(seeker)/job-fairs')} />
        <View style={styles.center}>
          <Text style={styles.notFoundTitle}>Job fair not found</Text>
          <Text style={styles.notFoundSub}>
            This can happen if you opened a link before the job fairs list finished loading.
          </Text>
          <Button variant="outline" onPress={() => router.replace('/(seeker)/job-fairs')}>
            Back to Job Fairs
          </Button>
        </View>
      </View>
    )
  }

  const partnerAgencies = Array.isArray(fair.partner_agencies) ? fair.partner_agencies : []
  const employers = fair.participating_employers ?? []
  const vacancies = fair.published_vacancies ?? []

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Job Fair" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
      <AlertBox variant="info" style={styles.rsvpNotice}>
        This job fair is walk-in only. No digital RSVP, QR pass, or app check-in is required — just show up during the event dates below.
      </AlertBox>

      <View style={styles.header}>
        <Text style={styles.title}>{textFrom(fair.title, 'Untitled job fair')}</Text>
        <Badge variant={statusVariant(fair.status)} style={styles.statusBadge}>
          {titleCase(fair.status, 'Scheduled')}
        </Badge>
      </View>

      {fair.description ? (
        <Text style={styles.description}>{textFrom(fair.description, '')}</Text>
      ) : null}

      <Card padding="md" style={styles.infoCard}>
        <Detail label="Dates" value={`${formatDate(fair.start_date || fair.event_date)}${fair.end_date ? ` - ${formatDate(fair.end_date)}` : ''}`} />
        {(fair.start_time || fair.end_time) ? (
          <Detail label="Time" value={`${textFrom(fair.start_time, '')}${fair.end_time ? ` - ${textFrom(fair.end_time, '')}` : ''}`} />
        ) : null}
        <Detail label="Venue" value={textFrom(fair.venue, 'Not listed')} />
        {(fair.sector || fair.target_sector) ? (
          <Detail label="Target Sector" value={titleCase(fair.target_sector || fair.sector, 'Not listed')} />
        ) : null}
      </Card>

      {partnerAgencies.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Partner Agencies</Text>
          <View style={styles.tagRow}>
            {partnerAgencies.map((agency) => (
              <Text key={agency} style={styles.tag}>{agency}</Text>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Participating Employers ({employers.length})</Text>
      {employers.length > 0 ? (
        <Card padding="md" style={styles.listCard}>
          {employers.map((employer, index) => (
            <View key={String(employer.employer_id ?? index)} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
              <Text style={styles.listRowText}>{textFrom(employer.company_name, 'Employer')}</Text>
              {employer.status ? <Badge variant="neutral">{titleCase(employer.status, '')}</Badge> : null}
            </View>
          ))}
        </Card>
      ) : (
        <Text style={styles.emptyText}>No employers listed yet.</Text>
      )}

      <Text style={styles.sectionTitle}>Published Vacancies ({vacancies.length})</Text>
      {vacancies.length > 0 ? (
        <Card padding="md" style={styles.listCard}>
          {vacancies.map((vacancy, index) => (
            <View key={String(vacancy.post_id ?? index)} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
              <Text style={styles.listRowText}>{textFrom(vacancy.job_title, 'Untitled role')}</Text>
              <Text style={styles.listRowSub}>{textFrom(vacancy.vacancies_count, '0')} slot(s)</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Text style={styles.emptyText}>No vacancies published for this job fair yet.</Text>
      )}
      </ScrollView>
    </View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  notFoundTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold },
  notFoundSub: { color: colors.secondaryText, fontSize: typography.body, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  rsvpNotice: { marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  title: { flex: 1, color: colors.primary, fontSize: typography.heading, lineHeight: 30, fontFamily: typography.family.bold },
  statusBadge: { marginTop: spacing.xs },
  description: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 22, marginBottom: spacing.lg },
  infoCard: { marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  detailValue: { color: colors.primary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold, marginTop: spacing.lg, marginBottom: spacing.md },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontFamily: typography.family.bold },
  listCard: { gap: 0 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  listRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  listRowText: { color: colors.primary, fontSize: typography.body, fontFamily: typography.family.bold, flex: 1, marginRight: spacing.sm },
  listRowSub: { color: colors.secondaryText, fontSize: typography.small },
  emptyText: { color: colors.secondaryText, fontSize: typography.body },
})
