import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SeekerApplicationsResponse } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { formatDate, formatSalary, jobCompany, jobLocation, textFrom, titleCase } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, spacing, typography } from '@/theme'

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [withdrawError, setWithdrawError] = useState('')

  const { data: application, isLoading, error } = useQuery({
    queryKey: ['application', id],
    queryFn: () => seekerService.getApplication(id as string),
    enabled: Boolean(id),
  })

  const withdrawMutation = useMutation({
    mutationFn: () => seekerService.withdrawApplication(id as string),
    onSuccess: ({ application: withdrawn }) => {
      setWithdrawError('')
      queryClient.setQueryData(['application', id], withdrawn)
      queryClient.setQueryData<SeekerApplicationsResponse>(['applications'], (current) =>
        current
          ? {
              ...current,
              applications: (current.applications ?? []).map((application) =>
                application.apply_id === withdrawn.apply_id ? withdrawn : application
              ),
            }
          : current
      )
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (caught: unknown) => {
      setWithdrawError(apiErrorMessage(caught, 'Unable to withdraw this application.'))
    },
  })

  const confirmWithdraw = () => {
    Alert.alert('Withdraw application?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate() },
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Application Details" onBack={() => router.back()} />
        <ScreenSkeleton label="Loading application details" />
      </View>
    )
  }

  if (!application || error) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Application Details" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.notFoundTitle}>Application Not Found</Text>
          <Button variant="outline" onPress={() => router.back()}>Go Back</Button>
        </View>
      </View>
    )
  }

  const job = application.job

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Application Details" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {withdrawError ? <AlertBox variant="danger" style={styles.alertBox}>{withdrawError}</AlertBox> : null}

        <Text style={styles.jobTitle}>{textFrom(job?.job_title, 'Untitled job')}</Text>
        {job?.employer?.employer_id ? (
          <TouchableOpacity onPress={() => router.push(`/(seeker)/employers/${job.employer!.employer_id}`)}>
            <Text style={[styles.company, styles.companyLink]}>{jobCompany(job)}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.company}>{job ? jobCompany(job) : 'Employer not listed'}</Text>
        )}
        <Badge variant={statusVariant(application.status)} style={styles.statusBadge}>
          {application.status_label ?? titleCase(application.status)}
        </Badge>

        <Card padding="md" style={styles.infoCard}>
          {job ? <Detail label="Location" value={jobLocation(job)} /> : null}
          {job ? <Detail label="Salary" value={formatSalary(job)} /> : null}
          <Detail label="Applied" value={formatDate(application.applied_at)} />
          <Detail label="Match at time of applying" value={`${Math.round(Number(application.match_percentage ?? 0))}%`} />
          <Detail label="Last update" value={formatDate(application.status_changed_at)} />
        </Card>

        {application.timeline?.length ? (
          <>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            <Card padding="md" style={styles.timelineCard}>
              {application.timeline.map((entry, index) => (
                <View key={index} style={styles.timelineRow}>
                  <View style={styles.timelineDotColumn}>
                    <View style={styles.timelineDot} />
                    {index < application.timeline!.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineTextColumn}>
                    <Text style={styles.timelineTitle}>{entry.title}</Text>
                    {entry.description ? <Text style={styles.timelineDescription}>{entry.description}</Text> : null}
                    {entry.timestamp ? <Text style={styles.timelineTimestamp}>{formatDate(entry.timestamp)}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {application.interview ? (
          <>
            <Text style={styles.sectionTitle}>Interview Information</Text>
            <Card padding="md" style={styles.warningCard}>
              <Detail label="Mode" value={titleCase(application.interview.mode_of_interview, 'Not set')} />
              <Detail label="Schedule" value={formatDate(application.interview.schedule)} />
              <Detail label="Venue / Link" value={textFrom(application.interview.venue_or_link, 'To follow')} />
              {application.interview.instructions ? (
                <Text style={styles.instructionsText}>{application.interview.instructions}</Text>
              ) : null}
            </Card>
          </>
        ) : null}

        {application.placement ? (
          <>
            <Text style={styles.sectionTitle}>Placement Information</Text>
            <Card padding="md" style={styles.successCard}>
              <Detail label="Start Date" value={formatDate(application.placement.start_date)} />
              <Detail label="Salary" value={`PHP ${Number(application.placement.salary ?? 0).toLocaleString()}`} />
            </Card>
          </>
        ) : null}

        {application.employer_remarks ? (
          <>
            <Text style={styles.sectionTitle}>Employer Remarks</Text>
            <Card padding="md">
              <Text style={styles.remarksText}>{application.employer_remarks}</Text>
            </Card>
          </>
        ) : null}
      </ScrollView>

      {application.can_withdraw ? (
        <View style={styles.footer}>
          <Button variant="danger" fullWidth onPress={confirmWithdraw} disabled={withdrawMutation.isPending}>
            {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Application'}
          </Button>
        </View>
      ) : null}
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

function statusVariant(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'hired') return 'success'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  if (status === 'interview' || status === 'shortlisted') return 'warning'
  if (status === 'pending' || status === 'reviewed') return 'info'
  return 'neutral'
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  notFoundTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  alertBox: { marginBottom: spacing.lg },
  jobTitle: { color: colors.primary, fontSize: typography.heading, lineHeight: 30, fontFamily: typography.family.bold },
  company: { color: colors.secondaryText, fontSize: typography.title, fontFamily: typography.family.bold, marginTop: spacing.xs },
  companyLink: { color: colors.info, textDecorationLine: 'underline' },
  statusBadge: { alignSelf: 'flex-start', marginTop: spacing.md },
  infoCard: { marginTop: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  detailValue: { color: colors.primary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold, marginTop: spacing.lg, marginBottom: spacing.md },
  timelineCard: {},
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineDotColumn: { alignItems: 'center', width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.info, marginTop: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  timelineTextColumn: { flex: 1, paddingBottom: spacing.lg },
  timelineTitle: { color: colors.primary, fontSize: typography.body, fontFamily: typography.family.bold },
  timelineDescription: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginTop: spacing.xs },
  timelineTimestamp: { color: colors.subtle, fontSize: 11, marginTop: spacing.xs },
  warningCard: { marginTop: 0, backgroundColor: colors.warningBackground, borderColor: colors.warningBorder },
  successCard: { marginTop: 0, backgroundColor: colors.successBackground, borderColor: colors.successBorder },
  instructionsText: { marginTop: spacing.sm, color: colors.warning, fontSize: typography.small, lineHeight: 18 },
  remarksText: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20 },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
})
