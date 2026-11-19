import { useEffect, useMemo, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import { EmployerPreferenceChip } from '@/components/ui/EmployerPreferenceChip'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { MatchRing, STRONG_MATCH } from '@/components/ui/MatchRing'
import { CompanyLogo } from '@/components/seeker/CompanyLogo'
import { LeafletMap } from '@/components/seeker/LeafletMap'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { SuccessSheet } from '@/components/ui/SuccessSheet'
import { ReportConcernSheet } from '@/components/safety/ReportConcernSheet'
import { CompanyRatingSummary } from '@/components/reviews/CompanyRatingSummary'
import { colors, gradients, radii, shadows, spacing, textStyles } from '@/theme'

// Where the header's back button should land, since jobs/[id] is a flat sibling in the
// Tabs navigator (not nested under any of these screens' own stack) — plain router.back()
// has no real history to pop and always falls through to the first tab (Home). Callers pass
// `from` (and `fromId` for the employer profile, which needs the id back) to say where they
// actually opened this screen from; unset defaults to Home.
function backTargetFor(from: string | undefined, fromId: string | undefined): string {
  if (from === 'jobs') return '/(seeker)/jobs'
  if (from === 'job-map') return '/(seeker)/job-map'
  if (from === 'notifications') return '/(seeker)/notifications'
  if (from === 'employer' && fromId) return `/(seeker)/employers/${fromId}`
  if (from === 'booth' && fromId) {
    const [jobFairId, employerId] = fromId.split(':')
    if (jobFairId && employerId) return `/(seeker)/job-fairs/booth?jobFairId=${jobFairId}&employerId=${employerId}`
  }
  return '/(seeker)'
}

export default function JobDetailsScreen() {
  const { id, from, fromId } = useLocalSearchParams<{ id: string; from?: string; fromId?: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const backTarget = backTargetFor(from, fromId)
  const insets = useSafeAreaInsets()

  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState(false)
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false)
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
        <ScreenHeader title="Job Details" onBack={() => router.replace(backTarget as never)} />
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
        <ScreenHeader title="Job Details" onBack={() => router.replace(backTarget as never)} />
        <View style={styles.center}>
          <EmptyState
            icon="search-off"
            title="Job not found"
            message={error ? 'This job may no longer be active.' : undefined}
            action={<Button variant="outline" onPress={() => router.replace(backTarget as never)}>Go back</Button>}
          />
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
  const matchValue = Math.round(Number(job.match_percentage ?? job.match?.percentage ?? 0))
  const strongMatch = matchValue >= STRONG_MATCH
  const lat = Number(job.latitude)
  const lng = Number(job.longitude)
  const coords = job.latitude != null && job.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
    ? { latitude: lat, longitude: lng }
    : null
  const openDirections = () => {
    if (!coords) return
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`).catch(() => undefined)
  }

  const confirmApply = () => {
    if (applied || applying) return
    setApplyConfirmOpen(true)
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
      <ScreenHeader title="Job Details" onBack={() => router.replace(backTarget as never)} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity on white (redesign "11 — Job details"): what the job is and who's hiring. */}
        <View style={styles.identity}>
          <CompanyLogo uri={job.employer?.company_logo_url} name={jobCompany(job)} size={60} />
          <View style={styles.jobTitleWrap}>
            <Text style={styles.jobTitle} accessibilityRole="header">{textFrom(job.job_title, 'Untitled job')}</Text>
            {job.employer?.employer_id ? (
              <PressableScale
                scaleTo="buttonPress"
                ripple={null}
                onPress={() => router.push({ pathname: '/(seeker)/employers/[id]', params: { id: String(job.employer!.employer_id), from: 'job', fromId: String(id) } })}
                style={styles.companyLinkRow}
                accessibilityRole="link"
                accessibilityLabel={`${jobCompany(job)}, open employer profile`}
              >
                <Text style={styles.companyLink}>{jobCompany(job)}</Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.link} />
              </PressableScale>
            ) : (
              <Text style={styles.company}>{jobCompany(job)}</Text>
            )}
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Fact icon="place" text={[job.distance_km ? `${Number(job.distance_km).toFixed(1)} km` : '', jobLocation(job)].filter(Boolean).join(' · ')} />
          <Fact icon="business-center" text={titleCase(job.employment_type, 'Type not listed')} />
          {job.job_fair?.is_available_at_job_fair ? <Badge variant="info">Available at Job Fair</Badge> : null}
          {job.upskill?.recommended ? <Badge variant="info">Upskill recommended</Badge> : null}
          {applied ? <Badge variant="brand">{titleCase(job.application_status, 'Applied')}</Badge> : null}
        </View>

        <EmployerPreferenceChip job={job} style={styles.preferenceChip} />

        {applyError ? <AlertBox variant="danger" style={styles.applyErrorBox}>{applyError}</AlertBox> : null}

        {/* Salary hero — the serif figure is one of the two numbers a seeker actually weighs. */}
        <LinearGradient colors={[...gradients.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.salaryCard}>
          <View style={styles.salaryDecor} pointerEvents="none" />
          <Text style={styles.salaryLabel}>SALARY</Text>
          <Text style={styles.salaryValue} numberOfLines={2}>{formatSalary(job)}</Text>
        </LinearGradient>

        {/* Why you match — amber only when the match is strong (earned). */}
        {!job.match_deferred ? (
          <Card padding="md" style={styles.matchCard}>
            <View style={styles.matchHead}>
              <MatchRing percentage={matchValue} size={72} strokeWidth={6} earned={strongMatch} showPercent />
              <View style={styles.flexOne}>
                {strongMatch ? <Badge variant="earned" style={styles.matchBadge}>★ Strong match</Badge> : null}
                <Text style={styles.matchTitle}>Why you match</Text>
                {requiredSkills.length ? (
                  <Text style={styles.matchSub}>You have {requiredSkills.filter((s) => matched.includes(s)).length} of {requiredSkills.length} required skills.</Text>
                ) : null}
              </View>
            </View>
            {breakdown ? (
              <View style={styles.factorList}>
                <FactorBar label="Skills" percentage={breakdown.skills ?? 0} index={0} />
                <FactorBar label="Occupation" percentage={breakdown.occupation ?? 0} index={1} />
                <FactorBar label="Experience" percentage={breakdown.experience ?? 0} index={2} />
                <FactorBar label="Education" percentage={breakdown.education ?? 0} index={3} last />
              </View>
            ) : null}
            {job.certificate_match?.matched ? (
              <Badge variant="earned" style={styles.certBadge}>Certificate match</Badge>
            ) : null}
          </Card>
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
                    <MaterialIcons name="check" size={13} color={colors.figure} />
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
                  <MaterialIcons name="north-east" size={13} color={colors.iconBlue} />
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

        {coords ? (
          <>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapCard}>
              {/* Preview only — touches pass through so the page scroll never gets trapped. */}
              <View style={styles.mapFrame} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <LeafletMap region={coords} markers={[]} onMarkerPress={() => undefined} />
              </View>
              <View style={styles.mapFoot}>
                <View style={styles.flexOne}>
                  <Text style={styles.mapPlace} numberOfLines={2}>{jobLocation(job)}</Text>
                  {job.distance_km ? <Text style={styles.mapMeta}>{Number(job.distance_km).toFixed(1)} km from your address</Text> : null}
                </View>
                <Button variant="outline" size="sm" icon="directions" onPress={openDirections} accessibilityLabel="Get directions in Maps">
                  Directions
                </Button>
              </View>
            </View>
          </>
        ) : null}

        {job.employer?.employer_id ? (
          <View style={styles.ratingSummary}>
            <CompanyRatingSummary
              employerId={job.employer.employer_id}
              onSeeAll={() => router.push({ pathname: '/(seeker)/employers/[id]', params: { id: String(job.employer!.employer_id), from: 'job', fromId: String(id) } })}
            />
          </View>
        ) : null}

        {job.employer?.employer_id ? (
          <PressableScale scaleTo="buttonPress" ripple={null} style={styles.reportLink} onPress={() => setReportOpen(true)} accessibilityRole="button">
            <MaterialIcons name="flag" size={16} color={colors.textSecondary} />
            <Text style={styles.reportLinkText}>Report this vacancy</Text>
          </PressableScale>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
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
            color={job.is_saved ? colors.iconBlue : colors.textSecondary}
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
            <EmptyState
              icon="menu-book"
              title="No resources yet"
              message="No learning resources are available for this skill right now."
            />
          )}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={applyConfirmOpen}
        onClose={() => setApplyConfirmOpen(false)}
        title="Ready to apply?"
        heightRatio={0.42}
        footer={(
          <View style={styles.applyConfirmActions}>
            <Button variant="outline" size="lg" onPress={() => setApplyConfirmOpen(false)} style={styles.applyConfirmCancel}>
              Cancel
            </Button>
            <Button
              size="lg"
              onPress={() => {
                setApplyConfirmOpen(false)
                applyToJob()
              }}
              style={styles.applyConfirmSubmit}
            >
              Apply now
            </Button>
          </View>
        )}
      >
        <View style={styles.applyConfirmBody}>
          <View style={styles.applyConfirmIcon}>
            <MaterialIcons name="send" size={26} color={colors.info} />
          </View>
          <Text style={styles.applyConfirmTitle}>{job.job_title || 'This job'}</Text>
          <Text style={styles.applyConfirmCompany}>{jobCompany(job)}</Text>
          <Text style={styles.applyConfirmMessage}>
            Your i-PESO profile will be shared with this employer and PESO staff for review.
          </Text>
          <View style={styles.applyConfirmNote}>
            <MaterialIcons name="verified-user" size={16} color={colors.link} />
            <Text style={styles.applyConfirmNoteText}>You can follow every step in the Applied tab.</Text>
          </View>
        </View>
      </BottomSheet>

      <SuccessSheet
        visible={applySuccess}
        title="Application submitted"
        message={`${jobCompany(job)} and PESO staff can now see your profile. You'll get a notification when the status changes.`}
        primaryLabel="Go to Applied"
        onPrimary={() => {
          setApplySuccess(false)
          router.push('/(seeker)/applications')
        }}
        secondaryLabel="Keep browsing"
        onSecondary={() => setApplySuccess(false)}
      />

      {job.employer?.employer_id ? (
        // The backend links the seeker's application to this vacancy on its own.
        <ReportConcernSheet
          visible={reportOpen}
          target={{ subjectId: job.employer.employer_id, subjectName: jobCompany(job), postId: job.post_id, postTitle: job.job_title }}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </View>
  )
}

function Fact({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  if (!text) return null
  return (
    <View style={styles.fact}>
      <MaterialIcons name={icon} size={14} color={colors.textSecondary} />
      <Text style={styles.factText} numberOfLines={1}>{text}</Text>
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
  // All-blue per the redesign: depth of blue tracks strength (no green outside status chips).
  const color = clamped >= 70 ? colors.blue700 : clamped >= 40 ? colors.blue500 : colors.blue300

  return (
    <View style={[styles.factorRow, last && styles.factorRowLast]}>
      <View style={styles.factorHeader}>
        <Text style={styles.factorLabel}>{label}</Text>
        {/* Text stays navy for WCAG AA; only the bar fill carries the blue depth. */}
        <Text style={[styles.factorValue, { color: colors.textPrimary }]}>{clamped}%</Text>
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
  flexOne: { flex: 1 },
  // Identity on white
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 },
  jobTitleWrap: { flex: 1 },
  jobTitle: { ...textStyles.heading, color: colors.textPrimary },
  company: { ...textStyles.body, color: colors.textSecondary, marginTop: 2 },
  companyLinkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32, alignSelf: 'flex-start' },
  companyLink: { ...textStyles.bodyBold, color: colors.link },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.sunken, borderRadius: radii.pill, paddingHorizontal: spacing.sm + 1, paddingVertical: 4, maxWidth: '100%' },
  factText: { ...textStyles.smallBold, fontSize: 11, color: colors.textSecondary, flexShrink: 1 },

  // Salary hero
  salaryCard: { marginTop: spacing.lg, borderRadius: radii.xl - 4, padding: spacing.lg + 2, overflow: 'hidden', ...shadows.lg },
  salaryDecor: { position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.white, opacity: 0.06 },
  salaryLabel: { ...textStyles.label, color: colors.blue200 },
  salaryValue: { ...textStyles.figureLarge, fontSize: 30, lineHeight: 36, color: colors.white, marginTop: spacing.xs },

  // Why you match
  matchCard: { marginTop: spacing.lg },
  matchHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  matchBadge: { alignSelf: 'flex-start', marginBottom: spacing.xs + 2 },
  matchTitle: { ...textStyles.title, color: colors.textPrimary },
  matchSub: { ...textStyles.small, color: colors.textSecondary, marginTop: 2 },
  factorList: { marginTop: spacing.lg },
  certBadge: { alignSelf: 'flex-start', marginTop: spacing.md },

  // Location preview
  mapCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden', ...shadows.sm },
  mapFrame: { height: 150, backgroundColor: colors.sunken },
  mapFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 2 },
  mapPlace: { ...textStyles.bodyBold, color: colors.textPrimary },
  mapMeta: { ...textStyles.small, color: colors.subtle, marginTop: 2 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  preferenceChip: { marginTop: spacing.md },
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
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // Matched skill: solid-tint blue with a check. Missing skill: outlined blue "learn" chip — a
  // gap to close, not an error, so no red.
  tagMatched: { backgroundColor: colors.tintStrong },
  tagText: { ...textStyles.smallMedium, color: colors.iconBlue },
  tagTextMatched: { color: colors.figure, fontFamily: textStyles.bodyBold.fontFamily },
  tagMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.tintBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagMissingText: { ...textStyles.smallMedium, color: colors.iconBlue },
  tagMuted: {
    backgroundColor: colors.sunken,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tagMutedText: { ...textStyles.smallMedium, color: colors.muted },
  missingHint: { marginTop: spacing.md, ...textStyles.small, color: colors.textSecondary, lineHeight: 18 },

  ratingSummary: { marginTop: spacing.lg },
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
  saveBtnActive: { backgroundColor: colors.tint, borderColor: colors.tintBorder },
  applyBtn: { flex: 1, marginBottom: 0 },
  applyConfirmBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  applyConfirmIcon: { width: 54, height: 54, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, marginBottom: spacing.md },
  applyConfirmTitle: { ...textStyles.title, color: colors.textPrimary },
  applyConfirmCompany: { ...textStyles.smallBold, color: colors.info, marginTop: spacing.xs },
  applyConfirmMessage: { ...textStyles.body, color: colors.textSecondary, lineHeight: 21, marginTop: spacing.md },
  applyConfirmNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.infoBackground },
  applyConfirmNoteText: { flex: 1, ...textStyles.smallMedium, color: colors.success },
  applyConfirmActions: { flexDirection: 'row', gap: spacing.md },
  applyConfirmCancel: { flex: 1, marginBottom: 0 },
  applyConfirmSubmit: { flex: 1, marginBottom: 0, backgroundColor: colors.info },

  sheetBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  resourceLoading: { paddingVertical: spacing.sm },
  resourceBlock: { marginBottom: spacing.xl },
  resourceLabel: { ...textStyles.smallBold, color: colors.textPrimary, marginBottom: spacing.xs },
  resourceText: { ...textStyles.small, color: colors.textSecondary, lineHeight: 19 },
  resourceMeta: { ...textStyles.small, color: colors.subtle, marginTop: spacing.xs },
})
