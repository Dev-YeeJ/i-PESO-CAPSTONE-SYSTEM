import { useState, useMemo } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import type { NearbyJob } from '@/services/seekerService'
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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { colors, radii, spacing, typography } from '@/theme'

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [applying, setApplying] = useState(false)

  // Get job from cache
  const jobsData = queryClient.getQueryData<{ jobs: NearbyJob[] }>(['nearbyJobs'])
  const job = useMemo(() => {
    return jobsData?.jobs?.find((j) => String(j.post_id) === id)
  }, [jobsData, id])

  const savedIds = queryClient.getQueryData<string[]>(['savedJobs']) || []
  const saved = savedIds.includes(String(id))

  const toggleSavedMutation = useMutation({
    mutationFn: (jobId: string) => seekerService.toggleSavedJob(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: ['savedJobs'] })
      const previous = queryClient.getQueryData<string[]>(['savedJobs']) || []
      
      const isSaved = previous.includes(jobId)
      const next = isSaved ? previous.filter(x => x !== jobId) : [...previous, jobId]
      queryClient.setQueryData(['savedJobs'], next)
      
      return { previous }
    },
    onError: (err, jobId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['savedJobs'], context.previous)
      }
      Alert.alert('Error', 'Failed to update saved job status. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] })
    }
  })

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Job Not Found</Text>
        <Button variant="outline" onPress={() => router.back()}>Go Back</Button>
      </View>
    )
  }

  const applied = Boolean(job.has_applied)
  const requiredSkills = listFrom(job.required_skills)
  const softSkills = listFrom(job.soft_skills)

  const confirmApply = () => {
    Alert.alert(
      'Confirm Application',
      `Are you sure you want to apply to ${textFrom(job.job_title, 'this job')} at ${jobCompany(job)}? Your profile will be shared with the employer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', style: 'default', onPress: applyToJob }
      ]
    )
  }

  const applyToJob = async () => {
    const jobId = String(job.post_id)
    if (applied || applying) return

    setApplying(true)
    try {
      const data = await seekerService.applyToJob(job.post_id)
      
      // Update local jobs cache
      queryClient.setQueryData(['nearbyJobs'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          jobs: old.jobs.map((item: NearbyJob) => (
            String(item.post_id) === jobId
              ? {
                  ...item,
                  has_applied: true,
                  application_id: data.application?.apply_id ?? item.application_id,
                  application_status: data.application?.status ?? 'pending',
                }
              : item
          ))
        }
      })
      Alert.alert('Application submitted', 'Your application is now visible to the employer and PESO admin.')
    } catch (caught: unknown) {
      const body = (caught as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
      const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
      Alert.alert('Application failed', firstError || body?.message || 'Unable to submit your application. Check your backend connection.')
    } finally {
      setApplying(false)
    }
  }

  const toggleSaved = () => {
    toggleSavedMutation.mutate(String(job.post_id))
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.jobTitle}>{textFrom(job.job_title, 'Untitled job')}</Text>
          <Text style={styles.company}>{jobCompany(job)}</Text>
          
          {job.match?.percentage != null && (
            <Badge variant="success" style={styles.matchBadge}>
              {job.match.percentage}% Profile Match
            </Badge>
          )}
        </View>

        <Card padding="md" style={styles.infoCard}>
          <Detail label="Location" value={jobLocation(job)} />
          <Detail label="Salary" value={formatSalary(job)} />
          <Detail label="Type" value={titleCase(job.employment_type, 'Not listed')} />
          {job.distance_km && <Detail label="Distance" value={`${job.distance_km} km away`} />}
          <Detail label="Deadline" value={formatDate(job.application_deadline)} />
          <Detail label="Vacancies" value={textFrom(job.vacancies_count, 'Not listed')} />
          <Detail label="Min. Education" value={titleCase(job.minimum_education, 'Not listed')} />
          <Detail label="Min. Experience" value={titleCase(job.experience_level, 'Not listed')} />
        </Card>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{textFrom(job.job_description, 'No description provided.')}</Text>

        {requiredSkills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Required Skills</Text>
            <View style={styles.tagRow}>
              {requiredSkills.map((skill) => (
                <Text key={skill} style={styles.tag}>{skill}</Text>
              ))}
            </View>
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
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={toggleSaved}
          disabled={toggleSavedMutation.isPending}
          style={styles.saveBtn}
        >
          {saved ? 'Unsave' : 'Save'}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { marginBottom: spacing.lg },
  jobTitle: { color: colors.primary, fontSize: typography.heading, lineHeight: 32, fontWeight: typography.bold },
  company: { color: colors.secondaryText, fontSize: typography.title, fontWeight: typography.semibold, marginTop: spacing.xs },
  matchBadge: { alignSelf: 'flex-start', marginTop: spacing.md },
  infoCard: { marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold },
  detailValue: { color: colors.primary, fontSize: typography.small, fontWeight: typography.semibold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginTop: spacing.lg, marginBottom: spacing.md },
  description: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 24 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontWeight: typography.semibold },
  tagMuted: { backgroundColor: colors.background, color: colors.muted, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontWeight: typography.semibold },
  footer: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  saveBtn: { flex: 1, marginBottom: 0 },
  applyBtn: { flex: 2, marginBottom: 0 },
})
