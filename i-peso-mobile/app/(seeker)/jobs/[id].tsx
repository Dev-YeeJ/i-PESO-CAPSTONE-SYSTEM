import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import type { LearningResources, NearbyJob, NearbyJobsResponse } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import {
  formatDate,
  formatSalary,
  jobCompany,
  jobLocation,
  listFrom,
  textFrom,
  titleCase,
} from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { MatchRing } from '@/components/ui/MatchRing'
import { colors, radii, spacing, typography } from '@/theme'

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [resourcesSkill, setResourcesSkill] = useState<string | null>(null)
  const [resources, setResources] = useState<LearningResources | null>(null)
  const [resourcesLoading, setResourcesLoading] = useState(false)

  const openResources = async (skill: string) => {
    setResourcesSkill(skill)
    setResources(null)
    setResourcesLoading(true)
    try {
      const data = await seekerService.getLearningResources(skill)
      setResources(data)
    } catch {
      setResources(null)
    } finally {
      setResourcesLoading(false)
    }
  }

  const cachedJob = useMemo(() => {
    const queries = queryClient.getQueriesData<NearbyJobsResponse>({ queryKey: ['jobs'] })
    for (const [, data] of queries) {
      const found = data?.jobs?.find((j) => String(j.post_id) === id)
      if (found) return found
    }
    return null
  }, [id, queryClient])

  const { data: fetchedJob, isLoading, error } = useQuery({
    queryKey: ['jobDetail', id],
    queryFn: () => seekerService.getJobById(id as string),
    enabled: !cachedJob && Boolean(id),
  })

  const job = cachedJob ?? fetchedJob ?? null

  const toggleSavedMutation = useMutation({
    mutationFn: (jobId: string) => seekerService.toggleSavedJob(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    onError: () => Alert.alert('Error', 'Failed to update saved job status. Please try again.'),
  })

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Job Details" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.info} />
        </View>
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Job Details" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.title}>Job Not Found</Text>
          {error ? <AlertBox variant="warning" style={{ marginVertical: spacing.md }}>Unable to load this job. It may no longer be active.</AlertBox> : null}
          <Button variant="outline" onPress={() => router.back()}>Go Back</Button>
        </View>
      </View>
    )
  }

  const applied = Boolean(job.has_applied)
  const requiredSkills = listFrom(job.required_skills)
  const softSkills = listFrom(job.soft_skills)
  const matched = job.matched_skills ?? []
  const missing = job.missing_skills ?? []
  const breakdown = job.match_breakdown

  const confirmApply = () => {
    if (applied || applying) return
    Alert.alert(
      'Confirm Application',
      `Apply to ${textFrom(job.job_title, 'this job')} at ${jobCompany(job)}? Your profile will be shared with the employer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', style: 'default', onPress: applyToJob },
      ]
    )
  }

  const applyToJob = async () => {
    const jobId = String(job.post_id)
    setApplying(true)
    setApplyError('')
    try {
      const data = await seekerService.applyToJob(job.post_id)

      const patch = (item: NearbyJob) => (String(item.post_id) === jobId
        ? { ...item, has_applied: true, application_id: data.application?.apply_id ?? item.application_id, application_status: data.application?.status ?? 'pending' }
        : item)

      queryClient.getQueriesData<NearbyJobsResponse>({ queryKey: ['jobs'] }).forEach(([key, data2]) => {
        if (!data2?.jobs) return
        queryClient.setQueryData(key, { ...data2, jobs: data2.jobs.map(patch) })
      })
      queryClient.invalidateQueries({ queryKey: ['applications'] })

      Alert.alert('Application submitted', 'Your application is now visible to the employer and PESO admin.')
    } catch (caught: unknown) {
      const body = (caught as AxiosError<{ message?: string; errors?: Record<string, string[]> }>).response?.data
      const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
      setApplyError(firstError || body?.message || 'Unable to submit your application. Check your backend connection.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Job Details" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.jobTitleWrap}>
              <Text style={styles.jobTitle}>{textFrom(job.job_title, 'Untitled job')}</Text>
              <Text style={styles.company}>{jobCompany(job)}</Text>
            </View>
            <MatchRing percentage={job.match_percentage ?? job.match?.percentage ?? 0} size={72} strokeWidth={6} label="Match" />
          </View>
          <View style={styles.badgeRow}>
            {job.job_fair?.is_available_at_job_fair ? <Badge variant="warning">Available at Job Fair</Badge> : null}
            {job.upskill?.recommended ? <Badge variant="info">Upskill recommended</Badge> : null}
          </View>
        </View>

        {applyError ? <AlertBox variant="danger" style={{ marginBottom: spacing.lg }}>{applyError}</AlertBox> : null}

        <Card padding="md" style={styles.infoCard}>
          <Detail label="Location" value={jobLocation(job)} />
          <Detail label="Salary" value={formatSalary(job)} />
          <Detail label="Type" value={titleCase(job.employment_type, 'Not listed')} />
          {job.distance_km ? <Detail label="Distance" value={`${job.distance_km} km away`} /> : null}
          <Detail label="Deadline" value={formatDate(job.application_deadline)} />
          <Detail label="Vacancies" value={textFrom(job.vacancies_count, 'Not listed')} />
          <Detail label="Min. Education" value={titleCase(job.minimum_education, 'Not listed')} />
          <Detail label="Min. Experience" value={titleCase(job.experience_level, 'Not listed')} />
        </Card>

        {breakdown ? (
          <>
            <Text style={styles.sectionTitle}>Match Breakdown</Text>
            <Card padding="md" style={styles.infoCard}>
              <FactorBar label="Skills" percentage={breakdown.skills ?? 0} />
              <FactorBar label="Occupation" percentage={breakdown.occupation ?? 0} />
              <FactorBar label="Experience" percentage={breakdown.experience ?? 0} />
              <FactorBar label="Education" percentage={breakdown.education ?? 0} last />
            </Card>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{textFrom(job.job_description, 'No description provided.')}</Text>

        {requiredSkills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Required Skills</Text>
            <View style={styles.tagRow}>
              {requiredSkills.map((skill) => (
                <Text key={skill} style={[styles.tag, matched.includes(skill) && styles.tagMatched]}>{skill}</Text>
              ))}
            </View>
          </>
        )}

        {missing.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Missing Skills</Text>
            <View style={styles.tagRow}>
              {missing.map((gap) => (
                <TouchableOpacity key={gap.skill} onPress={() => openResources(gap.skill)}>
                  <Text style={styles.tagMissing}>{gap.skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.missingHint}>Tap a missing skill to see learning resources, or explore related Upskill Hub programs to improve your match.</Text>
          </>
        )}

        {softSkills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Soft Skills</Text>
            <View style={styles.tagRow}>
              {softSkills.map((skill) => (
                <Text key={skill} style={styles.tagMuted}>{skill}</Text>
              ))}
            </View>
          </>
        )}

        {job.certificate_match ? (
          <>
            <Text style={styles.sectionTitle}>Certificate Match</Text>
            <Text style={styles.description}>
              {job.certificate_match.matched_count ?? 0} of {job.certificate_match.required_count ?? 0} required certificates on file.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={() => toggleSavedMutation.mutate(String(job.post_id))}
          disabled={toggleSavedMutation.isPending}
          style={styles.saveBtn}
        >
          {job.is_saved ? 'Unsave' : 'Save'}
        </Button>
        <Button
          variant={applied ? 'secondary' : 'success'}
          onPress={confirmApply}
          disabled={applied || applying}
          style={styles.applyBtn}
        >
          {applied ? `Applied: ${titleCase(job.application_status, 'Pending')}` : applying ? 'Submitting...' : 'Apply Now'}
        </Button>
      </View>

      <Modal visible={Boolean(resourcesSkill)} animationType="slide" transparent onRequestClose={() => setResourcesSkill(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Learning Resources</Text>
            <Text style={styles.modalSkill}>{resourcesSkill}</Text>

            {resourcesLoading ? (
              <ActivityIndicator color={colors.info} style={styles.modalLoading} />
            ) : resources ? (
              <ScrollView style={styles.modalScroll}>
                {resources.online_courses ? (
                  <View style={styles.resourceBlock}>
                    <Text style={styles.resourceLabel}>Online Courses</Text>
                    <Text style={styles.resourceText}>{(resources.online_courses.platforms ?? []).join(', ')}</Text>
                    <Text style={styles.resourceMeta}>
                      {resources.online_courses.average_duration} · {resources.online_courses.cost_range}
                    </Text>
                  </View>
                ) : null}
                {resources.certifications?.trending?.length ? (
                  <View style={styles.resourceBlock}>
                    <Text style={styles.resourceLabel}>Trending Certifications</Text>
                    <Text style={styles.resourceText}>{resources.certifications.trending.join(', ')}</Text>
                  </View>
                ) : null}
                {resources.practice_sites ? (
                  <View style={styles.resourceBlock}>
                    <Text style={styles.resourceLabel}>Practice Sites</Text>
                    {resources.practice_sites.coding ? <Text style={styles.resourceText}>Coding: {resources.practice_sites.coding}</Text> : null}
                    {resources.practice_sites.general ? <Text style={styles.resourceText}>General: {resources.practice_sites.general}</Text> : null}
                  </View>
                ) : null}
                {resources.estimated_learning_time ? (
                  <View style={styles.resourceBlock}>
                    <Text style={styles.resourceLabel}>Estimated Learning Time</Text>
                    <Text style={styles.resourceText}>{resources.estimated_learning_time}</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : (
              <Text style={styles.modalEmptyText}>No resources available right now.</Text>
            )}

            <Button variant="outline" onPress={() => setResourcesSkill(null)} style={styles.modalCloseBtn}>Close</Button>
          </View>
        </View>
      </Modal>
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

function FactorBar({ label, percentage, last = false }: { label: string; percentage: number; last?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)))
  const color = clamped >= 70 ? colors.success : clamped >= 40 ? colors.accent : colors.danger
  return (
    <View style={[styles.factorRow, last && styles.factorRowLast]}>
      <View style={styles.factorHeader}>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={[styles.factorValue, { color }]}>{clamped}%</Text>
      </View>
      <View style={styles.factorTrack}>
        <View style={[styles.factorFill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { marginBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: colors.primary, fontSize: typography.heading, lineHeight: 32, fontWeight: typography.bold },
  company: { color: colors.secondaryText, fontSize: typography.title, fontWeight: typography.semibold, marginTop: spacing.xs },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  title: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold },
  infoCard: { marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold },
  detailValue: { color: colors.primary, fontSize: typography.small, fontWeight: typography.semibold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  factorRow: { marginBottom: spacing.md },
  factorRowLast: { marginBottom: 0 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  factorLabel: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold },
  factorValue: { fontSize: typography.small, fontFamily: typography.family.bold },
  factorTrack: { height: 6, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: radii.pill },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginTop: spacing.lg, marginBottom: spacing.md },
  description: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 24 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontWeight: typography.semibold },
  tagMatched: { backgroundColor: colors.successBackground, color: colors.success },
  tagMissing: { backgroundColor: colors.dangerBackground, color: colors.danger, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontWeight: typography.semibold },
  tagMuted: { backgroundColor: colors.background, color: colors.muted, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontWeight: typography.semibold },
  missingHint: { marginTop: spacing.sm, color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  footer: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  saveBtn: { flex: 1, marginBottom: 0 },
  applyBtn: { flex: 2, marginBottom: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, maxHeight: '75%' },
  modalTitle: { color: colors.primary, fontSize: typography.heading, fontWeight: typography.bold },
  modalSkill: { color: colors.info, fontSize: typography.body, fontWeight: typography.semibold, marginTop: spacing.xs, marginBottom: spacing.md },
  modalLoading: { marginVertical: spacing.xl },
  modalScroll: { maxHeight: 320 },
  modalEmptyText: { color: colors.secondaryText, fontSize: typography.body, marginVertical: spacing.lg },
  resourceBlock: { marginBottom: spacing.md },
  resourceLabel: { color: colors.primary, fontSize: typography.small, fontWeight: typography.bold, marginBottom: spacing.xs },
  resourceText: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  resourceMeta: { color: colors.subtle, fontSize: typography.small, marginTop: spacing.xs },
  modalCloseBtn: { marginTop: spacing.lg, marginBottom: 0 },
})
