import { useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCitizenCharterSteps, seekerService } from '@/services/seekerService'
import { downloadAndShare } from '@/utils/fileTransfer'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
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

function applicationStatusVariant(status?: string | null): 'success' | 'danger' | 'info' | 'neutral' {
  const value = textFrom(status, '').toLowerCase()
  if (['completed', 'approved', 'qualified'].includes(value)) return 'success'
  if (['rejected', 'cancelled'].includes(value)) return 'danger'
  if (['pending', 'under_review', 'for_interview'].includes(value)) return 'info'
  return 'neutral'
}

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [applyError, setApplyError] = useState('')
  const [attachmentBusy, setAttachmentBusy] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')

  const { data: program, isLoading, error } = useQuery({
    queryKey: ['governmentProgram', id],
    queryFn: () => seekerService.getGovernmentProgram(id),
    enabled: !!id,
  })

  const applyMutation = useMutation({
    mutationFn: () => seekerService.applyToProgram(id),
    onSuccess: (data) => {
      setApplyError('')
      queryClient.invalidateQueries({ queryKey: ['governmentProgram', id] })
      queryClient.invalidateQueries({ queryKey: ['governmentPrograms'] })
      Alert.alert('Application submitted', data.message || 'Your application has been submitted.')
    },
    onError: (caught: unknown) => {
      setApplyError(apiErrorMessage(caught, 'Unable to submit your application. Please try again.'))
    },
  })

  const confirmApply = () => {
    setApplyError('')
    Alert.alert(
      'Confirm Application',
      'You can only apply once. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', style: 'default', onPress: () => applyMutation.mutate() },
      ]
    )
  }

  const viewAttachment = async () => {
    if (!program) return
    setAttachmentError('')
    setAttachmentBusy(true)
    try {
      await downloadAndShare(seekerService.programAttachmentUrl(id), `${textFrom(program.title, 'program')}.pdf`)
    } catch {
      setAttachmentError('Unable to open the attachment. Please try again.')
    } finally {
      setAttachmentBusy(false)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Program Details" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.info} size="large" />
        </View>
      </View>
    )
  }

  if (error || !program) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Program Details" onBack={() => router.back()} />
        <View style={styles.center}>
          <AlertBox variant="warning">
            {error ? apiErrorMessage(error, 'Unable to load this program.') : 'Unable to load this program.'}
          </AlertBox>
          <Button variant="outline" onPress={() => router.back()}>Go Back</Button>
        </View>
      </View>
    )
  }

  const eligibility = Array.isArray(program.eligibility_requirements) ? program.eligibility_requirements : []
  const requiredDocs = Array.isArray(program.required_documents) ? program.required_documents : []
  const skills = Array.isArray(program.skills) ? program.skills : []
  const charterSteps = getCitizenCharterSteps(program)
  const totalSlots = program.total_slots ?? 0
  const slotsText = totalSlots > 0 ? `${program.available_slots ?? 0}/${totalSlots} slots available` : 'Open slots (unlimited)'

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Program Details" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.programTitle}>{textFrom(program.title, 'Untitled program')}</Text>
          <View style={styles.badgeRow}>
            <Badge variant="info">{categoryLabel(program.category)}</Badge>
            <Badge variant={statusVariant(program.status)}>{titleCase(program.status, 'Open')}</Badge>
          </View>
        </View>

        {program.description || program.short_description ? (
          <Text style={styles.description}>{textFrom(program.description || program.short_description, '')}</Text>
        ) : null}

        <Card padding="md" style={styles.infoCard}>
          <Detail label="Venue" value={textFrom(program.venue, 'Not listed')} />
          <Detail label="Location" value={textFrom(program.location_address, 'Not listed')} />
          <Detail label="Dates" value={`${formatDate(program.start_date)} - ${formatDate(program.end_date)}`} />
          <Detail label="Application Deadline" value={formatDate(program.application_deadline)} />
          <Detail label="Slots" value={slotsText} />
          {program.target_beneficiaries ? (
            <Detail label="Target Beneficiaries" value={textFrom(program.target_beneficiaries, 'Not listed')} />
          ) : null}
          {program.target_industry ? (
            <Detail label="Target Industry" value={textFrom(program.target_industry, 'Not listed')} />
          ) : null}
        </Card>

        {eligibility.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Eligibility Requirements</Text>
            {eligibility.map((item, index) => (
              <BulletRow key={`${item}-${index}`} text={item} />
            ))}
          </>
        )}

        {requiredDocs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Required Documents</Text>
            {requiredDocs.map((item, index) => (
              <BulletRow key={`${item}-${index}`} text={item} />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>How to Apply (In-Person)</Text>
        {charterSteps.map((step, index) => (
          <BulletRow key={`${step}-${index}`} text={`${index + 1}. ${step}`} />
        ))}

        {skills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Related Skills</Text>
            <View style={styles.tagRow}>
              {skills.map((skill) => (
                <Text key={String(skill.id)} style={styles.tag}>{textFrom(skill.name, 'Skill')}</Text>
              ))}
            </View>
          </>
        )}

        {(program.contact_person || program.contact_email || program.contact_phone) && (
          <>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Card padding="md" style={styles.infoCard}>
              {program.contact_person ? <Detail label="Person" value={textFrom(program.contact_person, '')} /> : null}
              {program.contact_email ? <Detail label="Email" value={textFrom(program.contact_email, '')} /> : null}
              {program.contact_phone ? <Detail label="Phone" value={textFrom(program.contact_phone, '')} /> : null}
            </Card>
          </>
        )}

        {program.has_attachment ? (
          <>
            {attachmentError ? (
              <AlertBox variant="danger" style={styles.alertBox}>{attachmentError}</AlertBox>
            ) : null}
            <Button
              variant="outline"
              onPress={viewAttachment}
              disabled={attachmentBusy}
              style={styles.attachmentBtn}
            >
              {attachmentBusy ? 'Opening...' : 'View Attachment'}
            </Button>
          </>
        ) : null}

        {applyError ? (
          <AlertBox variant="danger" style={styles.alertBox}>{applyError}</AlertBox>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {program.my_application ? (
          <View style={styles.appliedRow}>
            <Text style={styles.appliedText}>You applied</Text>
            <Badge variant={applicationStatusVariant(program.my_application.status)}>
              {titleCase(program.my_application.status, 'Pending')}
            </Badge>
          </View>
        ) : (
          <Button
            variant="success"
            fullWidth
            onPress={confirmApply}
            disabled={!program.can_apply || applyMutation.isPending}
          >
            {applyMutation.isPending ? 'Submitting...' : 'Apply Now'}
          </Button>
        )}
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

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{'•'}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { marginBottom: spacing.lg },
  programTitle: { color: colors.primary, fontSize: typography.heading, lineHeight: 30, fontFamily: typography.family.bold },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  description: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 22, marginBottom: spacing.lg },
  infoCard: { marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  detailValue: { color: colors.primary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold, marginTop: spacing.lg, marginBottom: spacing.md },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  bulletDot: { color: colors.info, fontSize: typography.body },
  bulletText: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, flex: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontFamily: typography.family.bold },
  attachmentBtn: { marginTop: spacing.lg },
  alertBox: { marginTop: spacing.lg },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  appliedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  appliedText: { color: colors.primary, fontSize: typography.body, fontFamily: typography.family.bold },
})
