import { useCallback, useState } from 'react'
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { downloadAndShare } from '@/utils/fileTransfer'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { EligibilityBadge } from '@/components/EligibilityBadge'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { SectionHeader } from '@/components/ui/SectionHeader'
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

function attachmentMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  }
  return mimeTypes[extension] || 'application/octet-stream'
}

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [attachmentBusy, setAttachmentBusy] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')

  // government-programs/[id] is a flat sibling in the Tabs navigator (not nested under
  // Government Programs' own stack — same architecture as job-fairs.tsx), so a plain
  // router.back() has no real history to unwind to and falls through to the first tab
  // (Home) instead of Government Programs. router.canGoBack() was tried here first, but it
  // reports true off the root Stack's own history rather than this Tabs navigator's, so back()
  // still landed on Home — same unconditional replace() already proven to work for this exact
  // architecture in job-fairs.tsx is used instead.
  const goBackToPrograms = useCallback(() => {
    router.replace('/(seeker)/government-programs')
  }, [router])

  // Android's hardware back button goes through the tab navigator's own goBack() by default,
  // not through the header's onBack — without this it would hit the exact same flat-sibling
  // fallthrough-to-Home bug even after fixing the custom back arrow above.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBackToPrograms()
        return true
      })
      return () => subscription.remove()
    }, [goBackToPrograms]),
  )

  const { data: program, isLoading, error } = useQuery({
    queryKey: ['governmentProgram', id],
    queryFn: () => seekerService.getGovernmentProgram(id),
    enabled: !!id,
  })

  const viewAttachment = async () => {
    if (!program) return
    setAttachmentError('')
    setAttachmentBusy(true)
    try {
      const extension = (program.attachment_extension || 'pdf').toLowerCase()
      const mimeType = attachmentMimeType(extension)
      await downloadAndShare(
        seekerService.programAttachmentUrl(id),
        `${textFrom(program.title, 'program')}-attachment.${extension}`,
        mimeType,
        'Open program attachment',
      )
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Unable to open the attachment. Please try again.')
    } finally {
      setAttachmentBusy(false)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Program Details" onBack={goBackToPrograms} />
        <ScreenSkeleton label="Loading program details" />
      </View>
    )
  }

  if (error || !program) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Program Details" onBack={goBackToPrograms} />
        <View style={styles.center}>
          <AlertBox variant="warning">
            {error ? apiErrorMessage(error, 'Unable to load this program.') : 'Unable to load this program.'}
          </AlertBox>
          <Button variant="outline" onPress={goBackToPrograms}>Go Back</Button>
        </View>
      </View>
    )
  }

  const eligibility = Array.isArray(program.eligibility_requirements) ? program.eligibility_requirements : []
  const applicationSteps = [
    'Review the eligibility requirements and your profile-based estimate on this page.',
    `Confirm the current checklist, forms, schedule, and processing time in the PESO Citizen's Charter with PESO at ${program.location_address || program.venue || 'the PESO Office, Urdaneta City Hall'}.`,
    `Submit your application in person${program.application_deadline ? ` by ${formatDate(program.application_deadline)}` : ''}. PESO will verify your eligibility and explain the next steps.`,
  ]
  const totalSlots = program.total_slots ?? 0
  const slotsText = totalSlots > 0 ? `${totalSlots} slots` : 'Open capacity'

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Program Details" onBack={goBackToPrograms} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.programTitle}>{textFrom(program.title, 'Untitled program')}</Text>
          <View style={styles.badgeRow}>
            <Badge variant="info">{categoryLabel(program.category)}</Badge>
            <Badge variant={statusVariant(program.status)}>{titleCase(program.status, 'Open')}</Badge>
            <EligibilityBadge eligibility={program.eligibility} />
          </View>
        </View>

        {program.description ? (
          <Text style={styles.description}>
            {textFrom(program.description, '')}
          </Text>
        ) : null}

        {/* Facts as a tile grid (redesign "17 — Program details"). */}
        <View style={styles.factGrid}>
          <FactTile icon="event-busy" label="Deadline" value={formatDate(program.application_deadline)} />
          <FactTile icon="group" label="Slots" value={slotsText} />
          <FactTile icon="place" label="Venue" value={textFrom(program.location_address || program.venue, 'PESO Office, Urdaneta City Hall')} />
          {program.target_industry ? <FactTile icon="factory" label="Target industry" value={textFrom(program.target_industry, 'Not listed')} /> : null}
        </View>

        {program.eligibility ? (
          <>
            <SectionHeader title="Eligibility estimate" />
            <Card padding="md" style={[styles.infoCard, styles.eligCard]}>
              {!program.eligibility.breakdown.length ? (
                <AlertBox variant="info" style={styles.eligibilityNotice}>
                  No profile-based criteria are configured for this category. Review the listed requirements and confirm eligibility with PESO in person.
                </AlertBox>
              ) : program.eligibility.status === 'profile_incomplete' ? (
                <AlertBox variant="warning" style={styles.eligibilityNotice}>
                  Preliminary match: {typeof program.eligibility.score === 'number' ? `${program.eligibility.score}%` : 'not enough profile data'} using {program.eligibility.evaluated_rules ?? 0} of {program.eligibility.total_rules ?? program.eligibility.breakdown.length} criteria. Complete your profile to check missing criteria. PESO confirms eligibility in person.
                </AlertBox>
              ) : (
                <Text style={styles.eligibilityDisclaimer}>
                  This is an estimate based on your i-PESO profile, not an official decision. PESO confirms eligibility in person.
                </Text>
              )}
              {program.eligibility.breakdown.map((item, index) => (
                <View key={index} style={styles.eligRow}>
                  <MaterialIcons
                    name={item.known === false ? 'help-outline' : item.met ? 'check-circle' : 'cancel'}
                    size={18}
                    color={item.known === false ? colors.subtle : item.met ? colors.link : colors.error}
                  />
                  <View style={styles.eligBody}>
                    <Text style={styles.eligLabel}>
                      {item.label}{item.required && item.known !== false && !item.met ? '  (required)' : ''}
                    </Text>
                    {item.detail ? <Text style={styles.eligDetail}>{item.detail}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {eligibility.length > 0 && (
          <>
            <SectionHeader title="Eligibility Requirements" />
            {eligibility.map((item, index) => (
              <BulletRow
                key={`${typeof item === 'string' ? item : item.label}-${index}`}
                text={typeof item === 'string' ? item : item.label || 'Age requirement'}
              />
            ))}
          </>
        )}



        <SectionHeader title="How to apply (in person)" />
        {applicationSteps.map((step, index) => (
          <View key={`${step}-${index}`} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{index + 1}</Text></View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        <SectionHeader title="Contact" />
        <Card padding="md" style={styles.infoCard}>
          <Detail label="Office" value="PESO Programs Desk" />
        </Card>

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

        {program.eligibility?.status === 'not_eligible' ? (
          <AlertBox variant="warning" style={styles.alertBox}>
            Your profile does not meet a required rule for this program. Check the requirements above before visiting the PESO office.
          </AlertBox>
        ) : null}
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

function FactTile({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }) {
  return (
    <View style={styles.factTile}>
      <View style={styles.factLabelRow}>
        <MaterialIcons name={icon} size={14} color={colors.subtle} />
        <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
      </View>
      <Text style={styles.factValue}>{value}</Text>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { marginBottom: spacing.lg },
  programTitle: { color: colors.textPrimary, fontSize: typography.heading, lineHeight: 28, fontFamily: typography.family.bold },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  factTile: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.sunken, borderRadius: radii.md, padding: spacing.md },
  factLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factLabel: { color: colors.subtle, fontSize: typography.label, lineHeight: 14, fontFamily: typography.family.bold, letterSpacing: 0.4 },
  factValue: { color: colors.textPrimary, fontSize: typography.body, lineHeight: 20, fontFamily: typography.family.bold, marginTop: 4 },
  eligCard: { backgroundColor: colors.tint, borderColor: colors.tintBorder, shadowOpacity: 0, elevation: 0 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.tintStrong, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: colors.iconBlue, fontSize: 13, fontFamily: typography.family.bold },
  stepText: { flex: 1, color: colors.textPrimary, fontSize: typography.body, lineHeight: 20 },
  description: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 22, marginBottom: spacing.lg },
  infoCard: { marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  detailValue: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  eligRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  eligibilityNotice: { marginBottom: spacing.sm },
  eligibilityDisclaimer: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginBottom: spacing.sm },
  eligBody: { flex: 1 },
  eligLabel: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  eligDetail: { color: colors.secondaryText, fontSize: typography.small, marginTop: 2 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  bulletDot: { color: colors.info, fontSize: typography.body },
  bulletText: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, flex: 1 },
  attachmentBtn: { marginTop: spacing.lg },
  alertBox: { marginTop: spacing.lg },
})
