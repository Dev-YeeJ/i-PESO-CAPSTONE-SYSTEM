import { useCallback, useMemo, useState } from 'react'
import { BackHandler, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { useResumeGeneration } from '@/hooks/useResumeGeneration'
import { arrayFrom, addressLine, textFrom } from '@/utils/seekerView'
import { responsibilityLines } from '@/utils/resumeBullets'
import {
  educationLabel,
  educationStatusLabel,
  educationYearRange,
  formatMonthYear,
  fullName,
  initials,
  languageLabel,
  preferredOccupationLabel,
  resumeDateRange,
  resumeSortValue,
  skillListText,
} from '@/utils/resumePreview'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { GenerateResumeModal } from '@/components/seeker/GenerateResumeModal'
import { colors, radii, spacing, typography } from '@/theme'

// Section numbers match app/(seeker)/profile/edit.tsx's SECTIONS tabs — reused here so a
// tap on an incomplete checklist item lands on the exact same step profile.tsx's own
// "Edit" links already point to, rather than guessing a different number.
const SECTION = { personal: 1, skills: 5, work: 7 }

export default function ResumeStudioScreen() {
  const router = useRouter()
  const token = useAuthStore((state) => state.token)
  const [resumeModalOpen, setResumeModalOpen] = useState(false)

  // router.replace, not router.back(): resume-studio is a flat sibling in the Tabs
  // navigator (see job-fairs.tsx for the same reasoning) — back() has no real history to
  // pop and falls through to the first tab (Home) instead of returning to Profile, which
  // is this screen's one entry point.
  const goBackToProfile = useCallback(() => {
    router.replace('/(seeker)/profile')
  }, [router])

  // The custom back arrow above only covers a tap on ScreenHeader's own button — Android's
  // hardware/system back key bypasses that entirely and goes straight to React Navigation,
  // which (same flat-sibling reasoning) would otherwise also fall through to Home.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBackToProfile()
        return true
      })
      return () => subscription.remove()
    }, [goBackToProfile])
  )

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['seekerProfile'],
    queryFn: () => seekerService.getProfile(),
  })

  const hardSkills = [...(profile?.dole_skills ?? []), ...(profile?.technical_skills ?? [])]
  const softSkills = profile?.soft_skills ?? []
  const allSkills = [...hardSkills, ...softSkills]
  const educations = arrayFrom<Record<string, unknown>>(profile?.educations)
  const workExperiences = arrayFrom<Record<string, unknown>>(profile?.work_experiences)
  const trainings = arrayFrom<Record<string, unknown>>(profile?.trainings)
  const eligibilities = arrayFrom<Record<string, unknown>>(profile?.eligibilities)
  const languages = arrayFrom<Record<string, unknown>>(profile?.languages)
  const certificates = profile?.certificates ?? []

  const resume = useResumeGeneration(profile, workExperiences, allSkills)

  const imageSource = useMemo(() => {
    if (!profile?.has_profile_image || !token) return null
    return { uri: seekerService.profileImageUrl(String(profile.id)), headers: { Authorization: `Bearer ${token}` } }
  }, [profile?.has_profile_image, profile?.id, token])

  // Sorted most-recent-first, same as the generated PDF (mirrors web's resumeSortValue).
  const sortedExperiences = useMemo(
    () => [...workExperiences].sort((a, b) => resumeSortValue(b) - resumeSortValue(a)),
    [workExperiences]
  )

  const hasExperienceDetails =
    workExperiences.length === 0 ||
    workExperiences.some((work) => responsibilityLines(work.responsibilities as string | undefined).length > 0)

  const readiness = [
    {
      key: 'photo',
      label: 'Profile Photo',
      complete: Boolean(profile?.has_profile_image),
      hint: 'Add a professional 2x2 photo — it appears on your generated PDF.',
      onPress: () => router.replace('/(seeker)/profile'),
    },
    {
      key: 'summary',
      label: 'Professional Summary',
      complete: Boolean(resume.summary.trim()),
      hint: 'Write a short summary to appear at the top of your resume.',
      onPress: () => setResumeModalOpen(true),
    },
    {
      key: 'skills',
      label: 'Skills',
      complete: allSkills.length > 0,
      hint: 'Add technical, DOLE, or soft skills.',
      onPress: () => router.push({ pathname: '/(seeker)/profile/edit', params: { section: String(SECTION.skills) } }),
    },
    {
      key: 'education',
      label: 'Education',
      complete: educations.length > 0 || Boolean(profile?.educ_attainment),
      hint: 'Add at least one education record.',
      onPress: () => router.push({ pathname: '/(seeker)/profile/edit', params: { section: String(SECTION.skills) } }),
    },
    {
      key: 'experience',
      label: 'Work Experience',
      complete: hasExperienceDetails,
      hint: 'Add responsibility bullets for your listed experience.',
      onPress: () => router.push({ pathname: '/(seeker)/profile/edit', params: { section: String(SECTION.work) } }),
    },
  ]
  const completedCount = readiness.filter((item) => item.complete).length

  const hardSkillText = skillListText(hardSkills)
  const softSkillText = skillListText(softSkills)
  const location = addressLine(profile)
  const occupation = preferredOccupationLabel(profile)

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Resume Studio" onBack={goBackToProfile} />

      {isLoading ? (
        <ScreenSkeleton label="Loading your resume data" />
      ) : error ? (
        <View style={styles.content}>
          <AlertBox variant="danger">Unable to load your profile. Check the backend connection.</AlertBox>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Review your resume, complete missing information, and generate your professional resume.
          </Text>

          {/* ── Readiness checklist ── */}
          <Card padding="md" style={styles.readinessCard}>
            <View style={styles.readinessHeader}>
              <Text style={styles.readinessTitle}>Resume readiness</Text>
              <Text style={styles.readinessCount}>{completedCount} of {readiness.length} complete</Text>
            </View>
            {readiness.map((item) => (
              <PressableScale
                key={item.key}
                scaleTo="cardPress"
                ripple={null}
                style={styles.checkRow}
                onPress={item.onPress}
                disabled={item.complete}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${item.complete ? 'complete' : 'incomplete'}`}
              >
                <View style={[styles.checkIcon, item.complete ? styles.checkIconDone : styles.checkIconTodo]}>
                  <MaterialIcons name={item.complete ? 'check' : 'priority-high'} size={13} color={item.complete ? colors.success : colors.warning} />
                </View>
                <View style={styles.checkTextWrap}>
                  <Text style={[styles.checkLabel, item.complete && styles.checkLabelDone]}>{item.label}</Text>
                  {!item.complete ? <Text style={styles.checkHint}>{item.hint}</Text> : null}
                </View>
                {!item.complete ? <MaterialIcons name="chevron-right" size={18} color={colors.subtle} /> : null}
              </PressableScale>
            ))}
          </Card>

          {/* ── Live resume preview ── */}
          <Text style={styles.previewKicker}>Live Preview</Text>
          <Card padding="lg" style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewAvatar}>
                {imageSource ? (
                  <Image source={imageSource} style={styles.previewAvatarImage} />
                ) : (
                  <Text style={styles.previewAvatarText}>{initials(profile) || '?'}</Text>
                )}
              </View>
              <View style={styles.previewHeaderText}>
                <Text style={styles.previewName}>{fullName(profile) || 'Your name'}</Text>
                <Text style={styles.previewOccupation}>{occupation}</Text>
                <Text style={styles.previewContact}>
                  {[location, textFrom(profile?.mobile_number, ''), textFrom(profile?.email, '')].filter(Boolean).join(' | ')}
                </Text>
              </View>
            </View>

            <PreviewSection title="Professional Summary">
              {resume.summary.trim() ? (
                <Text style={styles.bodyText}>{resume.summary.trim()}</Text>
              ) : (
                <Text style={styles.emptyText}>Professional summary not added yet.</Text>
              )}
            </PreviewSection>

            <PreviewSection title="Skills">
              {hardSkillText || softSkillText ? (
                <View style={styles.gap8}>
                  {hardSkillText ? <Text style={styles.bodyText}><Text style={styles.bold}>Technical & hard skills: </Text>{hardSkillText}</Text> : null}
                  {softSkillText ? <Text style={styles.bodyText}><Text style={styles.bold}>Soft skills: </Text>{softSkillText}</Text> : null}
                </View>
              ) : (
                <Text style={styles.emptyText}>No skills added yet.</Text>
              )}
            </PreviewSection>

            <PreviewSection title="Work Experience">
              {sortedExperiences.length ? (
                <View style={styles.gap12}>
                  {sortedExperiences.map((work, index) => {
                    const duties = responsibilityLines(work.responsibilities as string | undefined)
                    return (
                      <View key={index}>
                        <Text style={styles.itemTitle}>{textFrom(work.position as string, 'Position not specified')}</Text>
                        <Text style={styles.itemSub}>{textFrom(work.company_name as string, 'Company not specified')}</Text>
                        <Text style={styles.itemMeta}>{resumeDateRange(work)}</Text>
                        {duties.length ? (
                          <View style={styles.bulletList}>
                            {duties.map((line) => (
                              <View key={line} style={styles.bulletRow}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bulletText}>{line}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No work experience added yet.</Text>
              )}
            </PreviewSection>

            <PreviewSection title="Education">
              {educations.length ? (
                <View style={styles.gap12}>
                  {educations.map((education, index) => (
                    <View key={index}>
                      <Text style={styles.itemTitle}>{textFrom(education.course_strand as string, educationLabel(education.level))}</Text>
                      <Text style={styles.itemSub}>{textFrom(education.institution_name as string, educationLabel(education.level))}</Text>
                      <Text style={styles.itemMeta}>{educationYearRange(education) || educationStatusLabel(education)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>{textFrom(profile?.educ_attainment, 'No education records added yet.')}</Text>
              )}
            </PreviewSection>

            {(trainings.length || certificates.length || eligibilities.length || languages.length) ? (
              <PreviewSection title="Training & Certifications">
                <View style={styles.gap8}>
                  {trainings.map((training, index) => (
                    <Text key={`t${index}`} style={styles.bodyText}>
                      <Text style={styles.bold}>{textFrom(training.course as string, 'Training')}</Text>
                      {' — '}
                      {[textFrom(training.training_institution as string, ''), training.hours_of_training ? `${training.hours_of_training} hours` : null].filter(Boolean).join(' | ')}
                    </Text>
                  ))}
                  {certificates.map((certificate) => (
                    <Text key={certificate.certificate_id} style={styles.bodyText}>
                      <Text style={styles.bold}>{certificate.title}</Text>
                      {' — '}
                      {[certificate.issuing_body, certificate.issued_at ? `Issued ${formatMonthYear(certificate.issued_at)}` : null].filter(Boolean).join(' | ')}
                    </Text>
                  ))}
                  {eligibilities.map((eligibility, index) => (
                    <Text key={`e${index}`} style={styles.bodyText}>
                      <Text style={styles.bold}>{textFrom(eligibility.name as string, 'Eligibility')}</Text>
                      {eligibility.valid_until ? ` — Valid until ${formatMonthYear(eligibility.valid_until)}` : ''}
                    </Text>
                  ))}
                  {languages.length ? (
                    <Text style={styles.bodyText}>
                      <Text style={styles.bold}>Languages: </Text>
                      {languages.map(languageLabel).filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                </View>
              </PreviewSection>
            ) : null}
          </Card>

          <Button
            variant="primary"
            fullWidth
            onPress={() => setResumeModalOpen(true)}
            style={styles.generateBtn}
          >
            Generate & Download Resume
          </Button>
          <Text style={styles.generateHint}>The final PDF is generated by the backend from this same data and your uploaded portrait.</Text>
        </ScrollView>
      )}

      <GenerateResumeModal
        visible={resumeModalOpen}
        onClose={() => {
          resume.setActionError('')
          setResumeModalOpen(false)
        }}
        summary={resume.summary}
        onChangeSummary={resume.setSummary}
        aiSummaryBusy={resume.aiSummaryBusy}
        aiSummaryNotice={resume.aiSummaryNotice}
        actionError={resume.actionError}
        resumeBusy={resume.resumeBusy}
        onGenerateSummaryAI={resume.generateSummaryWithAI}
        onGenerate={() => resume.generateResume(() => setResumeModalOpen(false))}
      />
    </View>
  )
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },

  readinessCard: { marginBottom: spacing.lg },
  readinessHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  readinessTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  readinessCount: { color: colors.textSecondary, fontSize: typography.small },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  checkIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkIconDone: { backgroundColor: colors.successBackground },
  checkIconTodo: { backgroundColor: colors.warningBackground },
  checkTextWrap: { flex: 1 },
  checkLabel: { color: colors.textSecondary, fontSize: typography.body },
  checkLabelDone: { color: colors.textPrimary, fontFamily: typography.family.medium },
  checkHint: { color: colors.subtle, fontSize: 11, lineHeight: 15, marginTop: 2 },

  previewKicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  previewCard: { marginBottom: spacing.lg },
  previewHeaderRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingBottom: spacing.md, borderBottomWidth: 2, borderBottomColor: colors.textPrimary },
  previewAvatar: { width: 60, height: 60, borderRadius: radii.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewAvatarImage: { width: 60, height: 60 },
  previewAvatarText: { color: colors.textSecondary, fontSize: typography.title, fontFamily: typography.family.bold },
  previewHeaderText: { flex: 1 },
  previewName: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, textTransform: 'uppercase' },
  previewOccupation: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: 2 },
  previewContact: { color: colors.subtle, fontSize: 11, lineHeight: 15, marginTop: spacing.xs },

  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  bodyText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 19 },
  bold: { color: colors.textPrimary, fontFamily: typography.family.bold },
  emptyText: { color: colors.subtle, fontSize: typography.small, fontStyle: 'italic' },
  gap8: { gap: spacing.xs },
  gap12: { gap: spacing.md },
  itemTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  itemSub: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium, marginTop: 1 },
  itemMeta: { color: colors.subtle, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  bulletList: { marginTop: spacing.sm, gap: 4 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.secondary, marginTop: 7 },
  bulletText: { flex: 1, color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },

  generateBtn: { marginTop: spacing.sm },
  generateHint: { color: colors.subtle, fontSize: 11, textAlign: 'center', lineHeight: 15, marginTop: spacing.sm },
})
