import { useState } from 'react'
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SeekerApplicationsResponse } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { applicationNextStep, applicationStatusVariant, formatDate, formatInterviewMode, formatInterviewTime, formatSalary, interviewPhase, interviewPhaseText, interviewPhaseVariant, jobCompany, jobLocation, textFrom, titleCase } from '@/utils/seekerView'
import { useNow } from '@/hooks/useNow'
import { LiveDot } from '@/components/interview/LiveDot'
import { useToast } from '@/stores/toastStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { ApplicationReviewActions } from '@/components/reviews/ApplicationReviewActions'
import { CompanyLogo } from '@/components/seeker/CompanyLogo'
import { ReportConcernSheet } from '@/components/safety/ReportConcernSheet'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, radii, spacing, typography } from '@/theme'

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const insets = useSafeAreaInsets()
  const [withdrawError, setWithdrawError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  // Re-checked every 30 seconds so the interview label flips Upcoming → Happening now → Call ended.
  const now = useNow()

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
      showToast('Application withdrawn.', 'success')
    },
    onError: (caught: unknown) => {
      setWithdrawError(apiErrorMessage(caught, 'Unable to withdraw this application.'))
    },
  })

  const confirmWithdraw = () => {
    Alert.alert(
      'Withdraw application?',
      `This will withdraw your application for ${textFrom(application?.job?.job_title, 'this job')}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate() },
      ]
    )
  }

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Application Details" onBack={() => router.replace('/(seeker)/applications')} />
        <ScreenSkeleton label="Loading application details" />
      </View>
    )
  }

  if (!application || error) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Application Details" onBack={() => router.replace('/(seeker)/applications')} />
        <View style={styles.center}>
          <EmptyState
            icon="search-off"
            title="Application Not Found"
            message="This application may no longer be available."
            action={<Button variant="outline" onPress={() => router.replace('/(seeker)/applications')}>Go Back</Button>}
          />
        </View>
      </View>
    )
  }

  const job = application.job

  return (
    <View style={styles.flex}>
      {/* router.replace, not router.back(): applications/[id] is a flat sibling in the
          Tabs navigator (see job-fairs.tsx for the same reasoning), so back() falls
          through to the first tab (Home) instead of returning to Applications. */}
      <ScreenHeader title="Application Details" onBack={() => router.replace('/(seeker)/applications')} />

      <ScrollView contentContainerStyle={styles.content}>
        {withdrawError ? <AlertBox variant="danger" style={styles.alertBox}>{withdrawError}</AlertBox> : null}

        {/* Summary (redesign "15 — Application details") */}
        <Card padding="md">
          <View style={styles.titleRow}>
            <CompanyLogo uri={job?.employer?.company_logo_url} name={job ? jobCompany(job) : null} size={48} />
            <View style={styles.titleTextWrap}>
              <Text style={styles.jobTitle} accessibilityRole="header">{textFrom(job?.job_title, 'Untitled job')}</Text>
              {job?.employer?.employer_id ? (
                <PressableScale
                  scaleTo="buttonPress"
                  ripple={null}
                  onPress={() => router.push({ pathname: '/(seeker)/employers/[id]', params: { id: String(job.employer!.employer_id), from: 'application', fromId: String(id) } })}
                  style={styles.companyLinkRow}
                  accessibilityRole="link"
                  accessibilityLabel={`${jobCompany(job)}, open employer profile`}
                >
                  <Text style={styles.companyLink}>{jobCompany(job)}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.link} />
                </PressableScale>
              ) : (
                <Text style={styles.company}>{job ? jobCompany(job) : 'Employer not listed'}</Text>
              )}
            </View>
            <Badge variant={applicationStatusVariant(application.status)}>
              {application.status_label ?? titleCase(application.status)}
            </Badge>
          </View>
          <View style={styles.tiles}>
            <Tile label="Applied" value={formatDate(application.applied_at)} />
            <Tile label="Match then" value={`${Math.round(Number(application.match_percentage ?? 0))}%`} figure />
            {job ? <Tile label="Salary" value={formatSalary(job)} figure /> : null}
          </View>
          <View style={styles.metaLine}>
            {job ? (
              <View style={styles.metaItem}>
                <MaterialIcons name="place" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText} numberOfLines={1}>{jobLocation(job)}</Text>
              </View>
            ) : null}
            <Text style={styles.metaText}>Last update {formatDate(application.status_changed_at)}</Text>
          </View>
        </Card>

        {applicationNextStep(application.status, application.interview, now) ? (
          <View style={styles.nextStepCard}>
            <MaterialIcons name="info-outline" size={20} color={colors.link} />
            <View style={styles.titleTextWrap}>
              <Text style={styles.nextStepTitle}>What happens next</Text>
              <Text style={styles.nextStepText}>{applicationNextStep(application.status, application.interview, now)}</Text>
            </View>
          </View>
        ) : null}

        {application.timeline?.length ? (
          <>
            <Text style={styles.sectionTitle}>Status timeline</Text>
            <Card padding="md" style={styles.timelineCard}>
              {application.timeline.map((entry, index) => {
                // Every entry is a step already taken; the newest one is "where you are now".
                const latest = index === application.timeline!.length - 1
                return (
                <View key={index} style={styles.timelineRow}>
                  <View style={styles.timelineDotColumn}>
                    {latest ? (
                      <View style={styles.timelineNow} accessibilityLabel="Current step" />
                    ) : (
                      <View style={styles.timelineDone}>
                        <MaterialIcons name="check" size={14} color={colors.white} />
                      </View>
                    )}
                    {!latest ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineTextColumn}>
                    <Text style={styles.timelineTitle}>{entry.title}</Text>
                    {entry.description ? <Text style={styles.timelineDescription}>{entry.description}</Text> : null}
                    {entry.timestamp ? <Text style={styles.timelineTimestamp}>{formatDate(entry.timestamp)}</Text> : null}
                  </View>
                </View>
                )
              })}
            </Card>
          </>
        ) : null}

        {application.interview ? (
          <>
            <View style={styles.interviewCard}>
              <View style={styles.interviewHead}>
                <MaterialIcons name="event-available" size={22} color={colors.link} />
                <Text style={styles.interviewTitle}>{interviewPhase(application.interview, now) === 'in_progress' ? 'Interview happening now' : 'Interview'}</Text>
                <View style={styles.interviewPhaseRow}>
                  {interviewPhase(application.interview, now) === 'in_progress' ? <LiveDot /> : null}
                  <Badge variant={interviewPhaseVariant(application.interview, now)} style={interviewPhaseVariant(application.interview, now) === 'success' ? undefined : styles.interviewPhase}>{interviewPhaseText(application.interview, now)}</Badge>
                </View>
              </View>
              <IconRow icon="schedule" label="Date and time" value={formatInterviewTime(application.interview.schedule)} />
              <IconRow icon="person-pin-circle" label="Mode" value={formatInterviewMode(application.interview.mode_of_interview)} />
              {application.interview.mode_of_interview !== 'online' ? (
                <IconRow icon="place" label="Venue" value={textFrom(application.interview.venue_or_link, 'To follow')} />
              ) : null}

              {application.interview.instructions ? (
                <Text style={styles.instructionsText}>{application.interview.instructions}</Text>
              ) : null}

              {application.interview.mode_of_interview === 'online' ? (
                <View style={styles.joinActionWrap}>
                  {interviewPhase(application.interview, now) === 'cancelled' ? (
                    <Text style={styles.noLinkText}>Interview Cancelled</Text>
                  ) : interviewPhase(application.interview, now) === 'ended' ? (
                    <Text style={styles.noLinkText}>Call ended. The employer will update your application with their decision.</Text>
                  ) : application.interview.venue_or_link && application.interview.venue_or_link.startsWith('http') ? (
                    <Button
                      variant="primary"
                      fullWidth
                      onPress={() => Linking.openURL(application.interview!.venue_or_link!)}
                    >
                      Join Interview
                    </Button>
                  ) : (
                    <Text style={styles.noLinkText}>Meeting link not available yet.</Text>
                  )}
                </View>
              ) : null}
            </View>
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

        {/* Rate buttons / "You reviewed this employer" — renders nothing when neither applies. */}
        <ApplicationReviewActions applicationId={application.apply_id} />

        {/* Kept quiet, as on the website: reporting never competes with the main actions. */}
        {job?.employer?.employer_id ? (
          <PressableScale scaleTo="buttonPress" ripple={null} style={styles.reportLink} onPress={() => setReportOpen(true)} accessibilityRole="button">
            <MaterialIcons name="flag" size={16} color={colors.textSecondary} />
            <Text style={styles.reportLinkText}>Report a concern</Text>
          </PressableScale>
        ) : null}
      </ScrollView>

      {job?.employer?.employer_id ? (
        <ReportConcernSheet
          visible={reportOpen}
          target={{
            subjectId: job.employer.employer_id,
            subjectName: jobCompany(job),
            postId: job.post_id,
            postTitle: job.job_title,
            applicationId: application.apply_id,
          }}
          onClose={() => setReportOpen(false)}
        />
      ) : null}

      {application.can_withdraw ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Outlined red, not a solid fill: a destructive option, never the screen's primary action. */}
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={confirmWithdraw}
            disabled={withdrawMutation.isPending}
            style={styles.withdrawBtn}
            textStyle={styles.withdrawText}
          >
            {withdrawMutation.isPending ? 'Withdrawing…' : 'Withdraw application'}
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

/** Summary tile; `figure` sets salary / match in the serif (the two figures allowed it). */
function Tile({ label, value, figure = false }: { label: string; value: string; figure?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
      <Text style={figure ? styles.tileFigure : styles.tileValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

function IconRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }) {
  return (
    <View style={styles.iconRow}>
      <MaterialIcons name={icon} size={20} color={colors.iconBlue} />
      <View style={styles.titleTextWrap}>
        <Text style={styles.iconRowLabel}>{label}</Text>
        <Text style={styles.iconRowValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  alertBox: { marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleTextWrap: { flex: 1 },
  jobTitle: { color: colors.textPrimary, fontSize: typography.title, lineHeight: 24, fontFamily: typography.family.bold },
  company: { color: colors.secondaryText, fontSize: typography.body, fontFamily: typography.family.medium, marginTop: 2 },
  companyLinkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32, alignSelf: 'flex-start' },
  companyLink: { color: colors.link, fontSize: typography.body, fontFamily: typography.family.bold },
  tiles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  tile: { flex: 1, backgroundColor: colors.sunken, borderRadius: radii.md, padding: spacing.md - 2 },
  tileLabel: { color: colors.subtle, fontSize: typography.label, lineHeight: 14, fontFamily: typography.family.bold, letterSpacing: 0.4 },
  tileValue: { color: colors.textPrimary, fontSize: typography.body, lineHeight: 20, fontFamily: typography.family.bold, marginTop: 2 },
  tileFigure: { color: colors.figure, fontSize: 18, lineHeight: 22, fontFamily: typography.family.display, marginTop: 2 },
  metaLine: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { color: colors.subtle, fontSize: typography.small, lineHeight: 16 },
  nextStepCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, backgroundColor: colors.infoBackground, borderColor: colors.infoBorder },
  nextStepTitle: { color: colors.iconBlue, fontSize: typography.small, fontFamily: typography.family.bold },
  nextStepText: { color: colors.textPrimary, fontSize: typography.small, lineHeight: 18, marginTop: 2 },
  interviewCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.tintBorder, backgroundColor: colors.tint, gap: spacing.md - 2 },
  interviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  interviewTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  interviewPhase: { backgroundColor: colors.surface },
  interviewPhaseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 },
  iconRowLabel: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 16 },
  iconRowValue: { color: colors.textPrimary, fontSize: typography.body, lineHeight: 20, fontFamily: typography.family.bold },
  withdrawBtn: { borderColor: colors.errorBorder },
  withdrawText: { color: colors.error },
  infoCard: { marginTop: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  detailValue: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginTop: spacing.lg, marginBottom: spacing.md },
  timelineCard: {},
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineDotColumn: { alignItems: 'center', width: 24 },
  timelineDone: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  timelineNow: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.secondary },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.secondary, marginVertical: 2 },
  timelineTextColumn: { flex: 1, paddingBottom: spacing.lg },
  timelineTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  timelineDescription: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginTop: spacing.xs },
  timelineTimestamp: { color: colors.subtle, fontSize: 11, marginTop: spacing.xs },
  warningCard: { marginTop: 0, backgroundColor: colors.warningBackground, borderColor: colors.warningBorder },
  successCard: { marginTop: 0, backgroundColor: colors.successBackground, borderColor: colors.successBorder },
  instructionsText: { color: colors.figure, fontSize: typography.small, lineHeight: 18, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md },
  joinActionWrap: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.tintBorder },
  noLinkText: { color: colors.secondaryText, fontSize: typography.body, fontFamily: typography.family.medium, textAlign: 'center', marginVertical: spacing.sm },
  remarksText: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20 },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl, minHeight: 44 },
  reportLinkText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
})
