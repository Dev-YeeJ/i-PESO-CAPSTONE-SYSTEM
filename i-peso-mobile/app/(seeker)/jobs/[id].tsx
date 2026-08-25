import { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import type { AxiosError } from 'axios'
import type { LearningResources, NearbyJob, NearbyJobsResponse } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useToggleSavedJob } from '@/hooks/use-toggle-saved-job'
import { useMotion } from '@/hooks/useMotion'
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
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { MatchRing } from '@/components/ui/MatchRing'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { SuccessSheet } from '@/components/ui/SuccessSheet'
import { ReportEmployerModal } from '@/components/ReportEmployerModal'
import { colors, gradients, radii, shadows, spacing, textStyles } from '@/theme'

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState(false)
  const [resourcesSkill, setResourcesSkill] = useState<string | null>(null)
  const [resources, setResources] = useState<LearningResources | null>(null)
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

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

  const toggleSavedMutation = useToggleSavedJob()

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Job Details" onBack={() => router.back()} />
        <SkeletonGroup label="Loading job details" style={styles.loadingWrap}>
          <Skeleton width="70%" height={26} />
          <Skeleton width="45%" height={16} style={styles.loadingGap} />
          <Skeleton width="100%" height={92} radius={radii.lg} style={styles.loadingBlock} />
          <Skeleton width="100%" height={180} radius={radii.lg} style={styles.loadingBlock} />
          <Skeleton width="100%" height={140} radius={radii.lg} style={styles.loadingBlock} />
        </SkeletonGroup>
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Job Details" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.notFoundTitle}>Job not found</Text>
          {error ? <AlertBox variant="warning" style={styles.notFoundAlert}>This job may no longer be active.</AlertBox> : null}
          <Button variant="outline" onPress={() => router.back()}>Go back</Button>
        </View>
      </View>
    )
  }

  const applied = Boolean(job.has_applied)
  // Deduped: a vacancy's skill lists can contain the same skill more than
  // once (e.g. entered separately during posting), which otherwise renders
  // the same tag twice and breaks React's key uniqueness for the tag list.
  const requiredSkills = Array.from(new Set(listFrom(job.required_skills)))
  const softSkills = Array.from(new Set(listFrom(job.soft_skills)))
  const matched = job.matched_skills ?? []
  const missing = job.missing_skills ?? []
  const breakdown = job.match_breakdown

  const confirmApply = () => {
    if (applied || applying) return
    Alert.alert(
      'Apply to this job?',
      `Your profile will be shared with ${jobCompany(job)}.`,
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

      setApplySuccess(true)
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* The identity block. Everything a seeker needs to decide "is this worth reading?"
            sits above the fold: title, employer, match, and pay. */}
        <LinearGradient
          colors={[...gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.headerTop}>
            <View style={styles.jobTitleWrap}>
              <Text style={styles.jobTitle}>{textFrom(job.job_title, 'Untitled job')}</Text>
              {job.employer?.employer_id ? (
                <TouchableOpacity
                  onPress={() => router.push(`/(seeker)/employers/${job.employer!.employer_id}`)}
                  accessibilityRole="link"
                >
                  <Text style={[styles.company, styles.companyLink]}>{jobCompany(job)}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.company}>{jobCompany(job)}</Text>
              )}
            </View>
            <View style={styles.ringWell}>
              <MatchRing
                percentage={job.match_percentage ?? job.match?.percentage ?? 0}
                size={72}
                strokeWidth={6}
                trackColor={colors.blue200}
              />
            </View>
          </View>

          {/* Salary in the serif face — with the match score, the number a seeker actually
              weighs. It was previously the second row of an eight-row table. */}
          <View style={styles.salaryBlock}>
            <Text style={styles.salaryLabel}>SALARY</Text>
            <Text style={styles.salaryValue} numberOfLines={2}>{formatSalary(job)}</Text>
          </View>

          <View style={styles.heroFacts}>
            <HeroFact icon="place" text={jobLocation(job)} />
            {job.distance_km ? <HeroFact icon="near-me" text={`${job.distance_km} km away`} /> : null}
            <HeroFact icon="business-center" text={titleCase(job.employment_type, 'Not listed')} />
          </View>
        </LinearGradient>

        <View style={styles.badgeRow}>
          {job.job_fair?.is_available_at_job_fair ? <Badge variant="warning">Available at Job Fair</Badge> : null}
          {job.upskill?.recommended ? <Badge variant="info">Upskill recommended</Badge> : null}
          {applied ? <Badge variant="info">{titleCase(job.application_status, 'Applied')}</Badge> : null}
        </View>

        {applyError ? <AlertBox variant="danger" style={styles.applyErrorBox}>{applyError}</AlertBox> : null}

        {breakdown ? (
          <>
            <Text style={styles.sectionTitle}>Why you match</Text>
            <Card padding="md" style={styles.infoCard}>
              <FactorBar label="Skills" percentage={breakdown.skills ?? 0} index={0} />
              <FactorBar label="Occupation" percentage={breakdown.occupation ?? 0} index={1} />
              <FactorBar label="Experience" percentage={breakdown.experience ?? 0} index={2} />
              <FactorBar label="Education" percentage={breakdown.education ?? 0} index={3} last />
            </Card>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{textFrom(job.job_description, 'No description provided.')}</Text>

        {requiredSkills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Required skills</Text>
            <View style={styles.tagRow}>
              {requiredSkills.map((skill) => (
                <View key={skill} style={[styles.tag, matched.includes(skill) && styles.tagMatched]}>
                  {matched.includes(skill) ? (
                    <MaterialIcons name="check" size={13} color={colors.success} />
                  ) : null}
                  <Text style={[styles.tagText, matched.includes(skill) && styles.tagTextMatched]}>{skill}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {missing.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Skills to build</Text>
            <View style={styles.tagRow}>
              {missing.map((gap) => (
                <PressableScale
                  key={gap.skill}
                  scaleTo="buttonPress"
                  ripple={null}
                  onPress={() => openResources(gap.skill)}
                  style={styles.tagMissing}
                  accessibilityRole="button"
                  accessibilityLabel={`See learning resources for ${gap.skill}`}
                >
                  <Text style={styles.tagMissingText}>{gap.skill}</Text>
                  <MaterialIcons name="north-east" size={13} color={colors.error} />
                </PressableScale>
              ))}
            </View>
            <Text style={styles.missingHint}>
              Tap a skill to see where to learn it, or check Government Programs for free training.
            </Text>
          </>
        )}

        {softSkills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Soft skills</Text>
            <View style={styles.tagRow}>
              {softSkills.map((skill) => (
                <View key={skill} style={styles.tagMuted}>
                  <Text style={styles.tagMutedText}>{skill}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Details</Text>
        <Card padding="md" style={styles.infoCard}>
          <Detail label="Deadline" value={formatDate(job.application_deadline)} />
          <Detail label="Vacancies" value={textFrom(job.vacancies_count, 'Not listed')} />
          <Detail label="Min. education" value={titleCase(job.minimum_education, 'Not listed')} />
          <Detail label="Min. experience" value={titleCase(job.experience_level, 'Not listed')} />
          {job.certificate_match ? (
            <Detail
              label="Certificates"
              value={`${job.certificate_match.matched_count ?? 0} of ${job.certificate_match.required_count ?? 0} on file`}
              last
            />
          ) : null}
        </Card>

        {job.employer?.employer_id ? (
          <TouchableOpacity style={styles.reportLink} onPress={() => setReportOpen(true)} accessibilityRole="button">
            <MaterialIcons name="flag" size={16} color={colors.textSecondary} />
            <Text style={styles.reportLinkText}>Report this employer</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          onPress={() => toggleSavedMutation.mutate(String(job.post_id))}
          disabled={toggleSavedMutation.isPending}
          scaleTo="buttonPress"
          ripple={null}
          style={[styles.saveBtn, job.is_saved && styles.saveBtnActive]}
          accessibilityRole="button"
          accessibilityLabel={job.is_saved ? 'Remove from saved jobs' : 'Save this job'}
          accessibilityState={{ selected: job.is_saved }}
        >
          <MaterialIcons
            name={job.is_saved ? 'bookmark' : 'bookmark-border'}
            size={22}
            color={job.is_saved ? colors.blue700 : colors.textSecondary}
          />
        </PressableScale>

        <Button
          variant={applied ? 'secondary' : 'primary'}
          size="lg"
          onPress={confirmApply}
          disabled={applied || applying}
          loading={applying}
          style={styles.applyBtn}
        >
          {applied ? `Applied · ${titleCase(job.application_status, 'Pending')}` : 'Apply now'}
        </Button>
      </View>

      <BottomSheet
        visible={Boolean(resourcesSkill)}
        onClose={() => setResourcesSkill(null)}
        title={resourcesSkill ? `Learn ${resourcesSkill}` : 'Learning resources'}
        heightRatio={0.7}
      >
        <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          {resourcesLoading ? (
            <SkeletonGroup label="Loading resources" style={styles.resourceLoading}>
              <Skeleton width="40%" height={14} />
              <Skeleton width="100%" height={12} style={styles.loadingGap} />
              <Skeleton width="80%" height={12} style={styles.loadingGap} />
              <Skeleton width="35%" height={14} style={styles.loadingBlock} />
              <Skeleton width="90%" height={12} style={styles.loadingGap} />
            </SkeletonGroup>
          ) : resources ? (
            <>
              {resources.online_courses ? (
                <View style={styles.resourceBlock}>
                  <Text style={styles.resourceLabel}>Online courses</Text>
                  <Text style={styles.resourceText}>{(resources.online_courses.platforms ?? []).join(', ')}</Text>
                  <Text style={styles.resourceMeta}>
                    {resources.online_courses.average_duration} · {resources.online_courses.cost_range}
                  </Text>
                </View>
              ) : null}
              {resources.certifications?.trending?.length ? (
                <View style={styles.resourceBlock}>
                  <Text style={styles.resourceLabel}>Trending certifications</Text>
                  <Text style={styles.resourceText}>{resources.certifications.trending.join(', ')}</Text>
                </View>
              ) : null}
              {resources.practice_sites ? (
                <View style={styles.resourceBlock}>
                  <Text style={styles.resourceLabel}>Practice sites</Text>
                  {resources.practice_sites.coding ? <Text style={styles.resourceText}>Coding: {resources.practice_sites.coding}</Text> : null}
                  {resources.practice_sites.general ? <Text style={styles.resourceText}>General: {resources.practice_sites.general}</Text> : null}
                </View>
              ) : null}
              {resources.estimated_learning_time ? (
                <View style={styles.resourceBlock}>
                  <Text style={styles.resourceLabel}>Estimated learning time</Text>
                  <Text style={styles.resourceText}>{resources.estimated_learning_time}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.modalEmptyText}>No resources available for this skill right now.</Text>
          )}
        </ScrollView>
      </BottomSheet>

      <SuccessSheet
        visible={applySuccess}
        title="Application submitted"
        message={`${jobCompany(job)} and PESO staff can now see your profile. You'll get a notification when the status changes.`}
        primaryLabel="Track it"
        onPrimary={() => {
          setApplySuccess(false)
          router.push('/(seeker)/applications')
        }}
        secondaryLabel="Keep browsing"
        onSecondary={() => setApplySuccess(false)}
      />

      <ReportEmployerModal
        visible={reportOpen}
        employerId={job.employer?.employer_id ?? null}
        employerName={jobCompany(job)}
        onClose={() => setReportOpen(false)}
      />
    </View>
  )
}

function HeroFact({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.heroFact}>
      <MaterialIcons name={icon} size={14} color={colors.blue200} />
      <Text style={styles.heroFactText} numberOfLines={1}>{text}</Text>
    </View>
  )
}

function Detail({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

function FactorBar({
  label,
  percentage,
  index,
  last = false,
}: {
  label: string
  percentage: number
  index: number
  last?: boolean
}) {
  const m = useMotion()
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)))
  const width = useSharedValue(0)

  // Bars fill in sequence so the breakdown reads as a short explanation rather than four
  // static rows appearing at once.
  useEffect(() => {
    width.value = withDelay(
      m.stagger(index),
      withTiming(clamped, { duration: m.duration('slow') }),
    )
  }, [clamped, index, width, m])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }))

  // Strength is carried by the bar's length and its stated percentage; colour only reinforces
  // it, so the meaning survives for colour-blind users.
  const color = clamped >= 70 ? colors.success : clamped >= 40 ? colors.blue600 : colors.textSecondary

  return (
    <View style={[styles.factorRow, last && styles.factorRowLast]}>
      <View style={styles.factorHeader}>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={[styles.factorValue, { color }]}>{clamped}%</Text>
      </View>
      <View style={styles.factorTrack}>
        <Animated.View style={[styles.factorFill, { backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  loadingWrap: { padding: spacing.lg },
  loadingGap: { marginTop: spacing.sm },
  loadingBlock: { marginTop: spacing.lg },
  notFoundTitle: { ...textStyles.title, color: colors.textPrimary },
  notFoundAlert: { marginVertical: spacing.md },

  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  jobTitleWrap: { flex: 1 },
  jobTitle: { ...textStyles.display, fontSize: 26, lineHeight: 32, color: colors.white },
  company: { ...textStyles.bodyMedium, color: colors.blue200, marginTop: spacing.xs },
  companyLink: { color: colors.white, textDecorationLine: 'underline' },
  ringWell: {
    padding: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  salaryBlock: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  salaryLabel: { ...textStyles.label, fontSize: 9, letterSpacing: 1.4, color: colors.blue200 },
  salaryValue: { ...textStyles.figure, fontSize: 26, lineHeight: 32, color: colors.white, marginTop: spacing.xs },
  heroFacts: { marginTop: spacing.lg, gap: spacing.sm },
  heroFact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroFactText: { flex: 1, ...textStyles.small, color: colors.blue200 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  applyErrorBox: { marginTop: spacing.lg },
  infoCard: { marginBottom: spacing.xs },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { ...textStyles.smallMedium, color: colors.textSecondary },
  detailValue: { ...textStyles.smallBold, color: colors.textPrimary, textAlign: 'right', flex: 1, marginLeft: spacing.md },

  factorRow: { marginBottom: spacing.lg },
  factorRowLast: { marginBottom: 0 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  factorLabel: { ...textStyles.smallBold, color: colors.textPrimary },
  factorValue: { ...textStyles.smallBold },
  factorTrack: { height: 8, borderRadius: radii.pill, backgroundColor: colors.sunken, overflow: 'hidden' },
  factorFill: { height: '100%', borderRadius: radii.pill },

  sectionTitle: { ...textStyles.title, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },
  description: { ...textStyles.body, color: colors.textSecondary, lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.blue50,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagMatched: { backgroundColor: colors.successBackground },
  tagText: { ...textStyles.smallMedium, color: colors.blue700 },
  tagTextMatched: { color: colors.success },
  tagMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorBackground,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagMissingText: { ...textStyles.smallMedium, color: colors.error },
  tagMuted: {
    backgroundColor: colors.sunken,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagMutedText: { ...textStyles.smallMedium, color: colors.muted },
  missingHint: { marginTop: spacing.md, ...textStyles.small, color: colors.textSecondary, lineHeight: 18 },

  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xxl, paddingVertical: spacing.md },
  reportLinkText: { ...textStyles.smallBold, color: colors.textSecondary },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  saveBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  saveBtnActive: { backgroundColor: colors.blue50, borderColor: colors.blue200 },
  applyBtn: { flex: 1, marginBottom: 0 },

  sheetBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  resourceLoading: { paddingVertical: spacing.sm },
  resourceBlock: { marginBottom: spacing.xl },
  resourceLabel: { ...textStyles.smallBold, color: colors.textPrimary, marginBottom: spacing.xs },
  resourceText: { ...textStyles.small, color: colors.textSecondary, lineHeight: 19 },
  resourceMeta: { ...textStyles.small, color: colors.subtle, marginTop: spacing.xs },
  modalEmptyText: { ...textStyles.body, color: colors.textSecondary, marginVertical: spacing.lg, textAlign: 'center' },
})
