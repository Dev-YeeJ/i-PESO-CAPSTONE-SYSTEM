import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import type { ProfileStrengthItem, SeekerCertificate } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { downloadAndShare, postAndDownload } from '@/utils/fileTransfer'
import { apiErrorMessage } from '@/utils/apiError'
import {
  addressLine,
  arrayFrom,
  recordText,
  seekerName,
  textFrom,
  titleCase,
} from '@/utils/seekerView'
import {
  enhanceResponsibilities,
  experienceKey,
  responsibilityLines,
  resumeResponsibilityPayload,
} from '@/utils/resumeBullets'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MatchRing } from '@/components/ui/MatchRing'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, radii, spacing, typography } from '@/theme'

const CERTIFICATE_CATEGORIES = [
  'training_certificate', 'tesda_nc_certificate', 'professional_certificate',
  'seminar_certificate', 'workshop_certificate', 'employment_certificate',
  'academic_certificate', 'other',
]

export default function ProfileScreen() {
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [certModalOpen, setCertModalOpen] = useState(false)
  const [resumeModalOpen, setResumeModalOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [resumeBusy, setResumeBusy] = useState(false)
  const [aiSummaryBusy, setAiSummaryBusy] = useState(false)
  const [aiSummaryNotice, setAiSummaryNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [openExperienceEditors, setOpenExperienceEditors] = useState<Record<string, boolean>>({})
  const [experienceDrafts, setExperienceDrafts] = useState<Record<string, string>>({})
  const [experienceResponsibilities, setExperienceResponsibilities] = useState<Record<string, string>>({})

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to log in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          try {
            await logout()
          } catch {
            // clearAuth() already ran inside the store even if the network call failed —
            // the seeker layout's auth guard will redirect to /login regardless.
          } finally {
            setSigningOut(false)
          }
        },
      },
    ])
  }

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['seekerProfile'],
    queryFn: () => seekerService.getProfile(),
  })

  const { data: analytics } = useQuery({
    queryKey: ['seekerAnalytics'],
    queryFn: () => seekerService.getAnalytics(),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const strength = profile?.profile_strength?.percentage ?? 0
  const checklist = arrayFrom<ProfileStrengthItem>(profile?.profile_strength?.items)
  const hardSkills = [...(profile?.dole_skills ?? []), ...(profile?.technical_skills ?? [])]
  const softSkills = profile?.soft_skills ?? []
  const educations = arrayFrom<Record<string, unknown>>(profile?.educations)
  const workExperiences = arrayFrom<Record<string, unknown>>(profile?.work_experiences)
  const trainings = arrayFrom<Record<string, unknown>>(profile?.trainings)
  const eligibilities = arrayFrom<Record<string, unknown>>(profile?.eligibilities)
  const languages = arrayFrom<Record<string, unknown>>(profile?.languages)
  const occupations = arrayFrom<Record<string, unknown>>(profile?.occupations)
  const certificates: SeekerCertificate[] = profile?.certificates ?? []

  // photoVersion (bumped after every successful upload/delete) is included alongside
  // profile.id in the cache-busting query param — profile.id alone doesn't change on a
  // same-account re-upload, so React Native's native image loader (which caches purely by
  // URL string) had no signal to refetch and kept showing whatever was cached before.
  const imageSource = useMemo(() => {
    if (!profile?.has_profile_image || !token) return null
    return { uri: seekerService.profileImageUrl(`${profile.id}-${photoVersion}`), headers: { Authorization: `Bearer ${token}` } }
  }, [profile?.has_profile_image, profile?.id, token, photoVersion])

  const invalidateProfile = () => queryClient.invalidateQueries({ queryKey: ['seekerProfile'] })

  const pickAndUploadPhoto = async () => {
    setActionError('')
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setActionError('Photo library permission is required to upload a profile photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets?.length) return

    const asset = result.assets[0]
    setPhotoBusy(true)
    try {
      await seekerService.uploadProfileImage(asset.uri, asset.mimeType || 'image/jpeg')
      setPhotoVersion((v) => v + 1)
      await invalidateProfile()
    } catch (caught) {
      setActionError(apiErrorMessage(caught, 'Unable to upload photo. Use a square JPG/PNG at least 300x300px, under 2MB.'))
    } finally {
      setPhotoBusy(false)
    }
  }

  const deletePhoto = () => {
    Alert.alert('Remove profile photo?', 'You will need to upload a new photo before generating a resume.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setPhotoBusy(true)
          try {
            await seekerService.deleteProfileImage()
            setPhotoVersion((v) => v + 1)
            await invalidateProfile()
          } catch (caught) {
            setActionError(apiErrorMessage(caught, 'Unable to remove photo.'))
          } finally {
            setPhotoBusy(false)
          }
        },
      },
    ])
  }

  const viewCertificate = async (certificate: SeekerCertificate) => {
    try {
      await downloadAndShare(seekerService.certificateViewUrl(certificate.certificate_id), certificate.original_filename || `${certificate.title}.pdf`)
    } catch {
      Alert.alert('Unable to open certificate', 'Please check your connection and try again.')
    }
  }

  const deleteCertificate = (certificate: SeekerCertificate) => {
    Alert.alert('Delete certificate?', certificate.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await seekerService.deleteCertificate(certificate.certificate_id)
            await invalidateProfile()
          } catch (caught) {
            Alert.alert('Unable to delete', apiErrorMessage(caught, 'Please try again.'))
          }
        },
      },
    ])
  }

  const generateSummaryWithAI = async () => {
    setAiSummaryBusy(true)
    setAiSummaryNotice('')
    const result = await seekerService.generateProfessionalSummaryAI(summary.trim() || undefined)
    if (result?.summary) {
      setSummary(result.summary)
    } else {
      setAiSummaryNotice('AI summary generation is unavailable right now. You can still write your own summary.')
    }
    setAiSummaryBusy(false)
  }

  const generateResume = async () => {
    if (!profile?.has_profile_image) {
      Alert.alert('Photo required', 'Upload a professional 2x2 photo before generating your resume.')
      return
    }
    if (!summary.trim()) {
      setActionError('Add a short professional summary before generating your resume.')
      return
    }
    setResumeBusy(true)
    setActionError('')
    try {
      await postAndDownload(
        '/seeker/resume/generate',
        {
          professional_summary: summary.trim(),
          responsibility_overrides: resumeResponsibilityPayload(workExperiences, experienceResponsibilities),
        },
        `iPESO_Resume_${profile?.last_name || 'seeker'}.pdf`
      )
      setResumeModalOpen(false)
    } catch (caught) {
      setActionError(apiErrorMessage(caught, 'Unable to generate resume. Check your backend connection.'))
    } finally {
      setResumeBusy(false)
    }
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>My NSRP Profile</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your personal information, skills, and experience to get better job matches.
        </Text>

        {isLoading ? (
          <ScreenSkeleton label="Loading profile" />
        ) : null}

        {error ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            Unable to load your profile. Check the backend connection.
          </AlertBox>
        ) : null}

        {actionError ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            {actionError}
          </AlertBox>
        ) : null}

        <Card padding="md" style={styles.profileHeaderCard}>
          <View style={styles.profileHeaderInner}>
            <TouchableOpacity onPress={pickAndUploadPhoto} disabled={photoBusy} activeOpacity={0.85}>
              <View style={styles.avatar}>
                {photoBusy ? (
                  <ActivityIndicator color={colors.surface} />
                ) : imageSource ? (
                  <Image source={imageSource} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{seekerName(profile).charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <Text style={styles.avatarEditLabel}>{imageSource ? 'Change' : 'Add photo'}</Text>
            </TouchableOpacity>
            <View style={styles.profileHeaderText}>
              <Text style={styles.name}>{seekerName(profile)}</Text>
              <Text style={styles.muted}>{textFrom(profile?.email, 'Email not listed')}</Text>
              <Text style={styles.muted}>{addressLine(profile)}</Text>
              {imageSource ? (
                <TouchableOpacity onPress={deletePhoto} disabled={photoBusy}>
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Card>

        <Card padding="md" style={styles.strengthCard}>
          <MatchRing percentage={strength} size={76} strokeWidth={6} />
          <View style={styles.strengthText}>
            <Text style={styles.strengthTitle}>Profile Strength</Text>
            <Text style={styles.strengthSub}>
              {strength < 100 ? 'Complete every section to reach 100%.' : 'Your profile is fully updated!'}
            </Text>
          </View>
        </Card>

        <Card padding="md" style={styles.checklistCard}>
          {checklist.map((item) => (
            <View key={item.key ?? item.label} style={styles.checkRow}>
              <View style={[styles.checkDot, item.complete && styles.checkDotDone]} />
              <Text style={[styles.checkText, item.complete && styles.checkTextDone]}>{item.label}</Text>
            </View>
          ))}
        </Card>

        {analytics && (analytics.total_views_30_days > 0 || analytics.recent_viewers.length > 0) ? (
          <>
            <SectionHeader title="Profile Insights" />
            <Card padding="md" style={styles.analyticsCard}>
              <View style={styles.analyticsStatsRow}>
                <View style={styles.analyticsStat}>
                  <Text style={styles.analyticsStatValue}>{analytics.total_views_30_days}</Text>
                  <Text style={styles.analyticsStatLabel}>Profile views (30d)</Text>
                </View>
                <View style={styles.analyticsStat}>
                  <Text style={styles.analyticsStatValue}>{analytics.search_appearances}</Text>
                  <Text style={styles.analyticsStatLabel}>Search appearances</Text>
                </View>
              </View>
              {analytics.recent_viewers.length ? (
                <View style={styles.recentViewers}>
                  <Text style={styles.recentViewersTitle}>Recently viewed by</Text>
                  {analytics.recent_viewers.map((viewer, index) => (
                    <Text key={index} style={styles.recentViewerRow}>{viewer.company_name}</Text>
                  ))}
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        <SectionHeader
          title="Personal Information"
          action={<EditLink section={1} />}
        />
        <Card padding="md">
          <Info label="Date of Birth" value={textFrom(profile?.date_of_birth)} />
          <Info label="Sex" value={titleCase(profile?.sex)} />
          <Info label="Civil Status" value={titleCase(profile?.civil_status)} />
          <Info label="Mobile" value={textFrom(profile?.mobile_number)} />
          <Info label="Address" value={addressLine(profile)} />
        </Card>

        <SectionHeader title="Employment & Preferences" action={<EditLink section={2} />} />
        <Card padding="md">
          <Info label="Employment Status" value={titleCase(profile?.employment_status)} />
          <Info label="Preferred Work" value={titleCase(profile?.work_type_preference)} />
          <Info label="Preferred Location" value={titleCase(profile?.preferred_work_location)} />
          <Info label="Preferred Areas" value={(profile?.preferred_locations_details ?? []).join(', ') || 'Not set'} />
        </Card>

        <SectionHeader title="Preferred Occupations" action={<EditLink section={3} />} />
        <Card padding="md">
          {occupations.length ? occupations.map((o, i) => (
            <Info key={i} label={`Choice ${i + 1}`} value={recordText(o, ['occupation_title', 'raw_job_title', 'general_term'], 'Not set')} />
          )) : <EmptyLine text="No preferred occupations listed yet." />}
        </Card>

        <SectionHeader title="Languages" action={<EditLink section={4} />} />
        <Card padding="md">
          {languages.length ? languages.map((l, i) => (
            <Info key={i} label={titleCase(recordText(l, ['language']))} value={['can_read', 'can_write', 'can_speak', 'can_understand'].filter((k) => l[k]).map((k) => k.replace('can_', '')).join(', ') || 'None'} />
          )) : <EmptyLine text="No languages listed yet." />}
        </Card>

        <SectionHeader title="Skills" action={<EditLink section={5} />} />
        <Card padding="md">
          <Text style={styles.skillGroupTitle}>Technical & Hard Skills</Text>
          {hardSkills.length ? (
            <View style={styles.tagRow}>
              {hardSkills.slice(0, 24).map((skill) => (
                <Badge key={skill} variant="info" style={styles.skillBadge}>{skill}</Badge>
              ))}
            </View>
          ) : <EmptyLine text="No technical skills listed." />}

          <Text style={[styles.skillGroupTitle, { marginTop: spacing.lg }]}>Soft Skills</Text>
          {softSkills.length ? (
            <View style={styles.tagRow}>
              {softSkills.slice(0, 24).map((skill) => (
                <Badge key={skill} variant="success" style={styles.skillBadge}>{skill}</Badge>
              ))}
            </View>
          ) : <EmptyLine text="No soft skills listed." />}
        </Card>

        <SectionHeader title="Education" action={<EditLink section={5} />} />
        <View style={styles.cardList}>
          {educations.length ? educations.map((education, index) => (
            <Card key={index} padding="md">
              <Text style={styles.itemTitle}>{recordText(education, ['institution_name'], 'School not listed')}</Text>
              <Text style={styles.itemMeta}>{titleCase(recordText(education, ['level']))}</Text>
              <Text style={styles.itemMeta}>{recordText(education, ['course_strand'], 'Course or strand not listed')}</Text>
              <Text style={styles.itemMeta}>
                {textFrom(education.year_started, '')}
                {education.year_graduated ? ` - ${textFrom(education.year_graduated, '')}` : ''}
              </Text>
            </Card>
          )) : <Card padding="md"><EmptyLine text="No education records listed yet." /></Card>}
        </View>

        <SectionHeader title="Work Experience" action={<EditLink section={7} />} />
        <View style={styles.cardList}>
          {workExperiences.length ? workExperiences.map((work, index) => {
            const key = experienceKey(work, index)
            const isOpen = Boolean(openExperienceEditors[key])
            const savedResponsibilities = experienceResponsibilities[key] ?? (work.responsibilities as string | undefined) ?? ''
            const position = recordText(work, ['position'], 'assigned')

            const toggleEditor = () => {
              setOpenExperienceEditors((current) => ({ ...current, [key]: !current[key] }))
              setExperienceDrafts((current) => ({ ...current, [key]: current[key] ?? savedResponsibilities }))
            }

            return (
              <Card key={key} padding="md">
                <Text style={styles.itemTitle}>{recordText(work, ['position'], 'Position not listed')}</Text>
                <Text style={styles.itemMeta}>{recordText(work, ['company_name'], 'Company not listed')}</Text>
                <Text style={styles.itemMeta}>{textFrom(work.number_of_months, 'Duration not listed')} months · {titleCase(recordText(work, ['employment_status']))}</Text>

                {savedResponsibilities && !isOpen ? (
                  <View style={styles.bulletList}>
                    {responsibilityLines(savedResponsibilities).map((line) => (
                      <View key={line} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity onPress={toggleEditor} style={styles.dutiesToggle}>
                  <MaterialIcons name="add" size={16} color={colors.secondary} />
                  <Text style={styles.dutiesToggleText}>{savedResponsibilities ? 'Edit Job Duties / Responsibilities' : 'Add Job Duties / Responsibilities'}</Text>
                </TouchableOpacity>

                {isOpen ? (
                  <View style={styles.dutiesPanel}>
                    <View style={styles.dutiesPanelHeader}>
                      <View style={styles.dutiesPanelHeaderText}>
                        <Text style={styles.dutiesPanelTitle}>Resume bullet points</Text>
                        <Text style={styles.dutiesPanelHint}>Type simple duties, then let AI polish them into stronger resume language.</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setExperienceDrafts((current) => ({ ...current, [key]: enhanceResponsibilities(current[key], position) }))}
                        style={styles.aiEnhanceBtn}
                      >
                        <MaterialIcons name="auto-awesome" size={14} color={colors.info} />
                        <Text style={styles.aiEnhanceBtnText}>AI Enhance Bullets</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.dutiesTextarea}
                      value={experienceDrafts[key] ?? ''}
                      onChangeText={(value) => setExperienceDrafts((current) => ({ ...current, [key]: value }))}
                      placeholder="Example: encoded files"
                      placeholderTextColor={colors.subtle}
                      multiline
                    />
                    <View style={styles.modalActions}>
                      <Button variant="outline" size="sm" onPress={() => setOpenExperienceEditors((current) => ({ ...current, [key]: false }))} style={styles.modalBtn}>Cancel</Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={() => {
                          setExperienceResponsibilities((current) => ({ ...current, [key]: experienceDrafts[key]?.trim() ?? '' }))
                          setOpenExperienceEditors((current) => ({ ...current, [key]: false }))
                        }}
                        style={styles.modalBtn}
                      >
                        Save Bullets
                      </Button>
                    </View>
                  </View>
                ) : null}
              </Card>
            )
          }) : <Card padding="md"><EmptyLine text="No work experience listed yet." /></Card>}
        </View>

        <SectionHeader title="Training & Eligibility" action={<EditLink section={6} />} />
        <View style={styles.cardList}>
          {trainings.length || eligibilities.length ? (
            <>
              {trainings.map((training, index) => (
                <Card key={`t${index}`} padding="md">
                  <Text style={styles.itemTitle}>{recordText(training, ['course'], 'Training not listed')}</Text>
                  <Text style={styles.itemMeta}>{recordText(training, ['training_institution'], 'Institution not listed')}</Text>
                </Card>
              ))}
              {eligibilities.map((elig, index) => (
                <Card key={`e${index}`} padding="md">
                  <Text style={styles.itemTitle}>{recordText(elig, ['name'], 'Eligibility not listed')}</Text>
                  <Text style={styles.itemMeta}>{titleCase(recordText(elig, ['type']))}</Text>
                </Card>
              ))}
            </>
          ) : <Card padding="md"><EmptyLine text="No trainings or eligibilities listed yet." /></Card>}
        </View>

        <SectionHeader
          title="Certificates"
          action={
            <TouchableOpacity onPress={() => setCertModalOpen(true)}>
              <Text style={styles.editLinkText}>+ Add</Text>
            </TouchableOpacity>
          }
        />
        <View style={styles.cardList}>
          {certificates.length ? certificates.map((certificate) => (
            <Card key={String(certificate.certificate_id)} padding="md">
              <Text style={styles.itemTitle}>{certificate.title}</Text>
              <Text style={styles.itemMeta}>{certificate.issuing_body} · {titleCase(certificate.category)}</Text>
              <Text style={styles.itemMeta}>Issued {textFrom(certificate.issued_at)}</Text>
              <View style={styles.certActions}>
                <Button variant="outline" size="sm" onPress={() => viewCertificate(certificate)} style={styles.certActionBtn}>View</Button>
                <Button variant="danger" size="sm" onPress={() => deleteCertificate(certificate)} style={styles.certActionBtn}>Delete</Button>
              </View>
            </Card>
          )) : <Card padding="md"><EmptyLine text="No certificates uploaded yet." /></Card>}
        </View>

        <SectionHeader title="Resume" />
        <Card padding="md">
          <Info label="Resume" value={profile?.has_resume ? 'Generated' : 'Not generated'} />
          <Button variant="outline" fullWidth onPress={() => setResumeModalOpen(true)} style={styles.updateBtn}>
            {profile?.has_resume ? 'Regenerate resume' : 'Generate resume'}
          </Button>
        </Card>

        <Button variant="primary" fullWidth onPress={() => router.push('/(seeker)/profile/edit')} style={styles.editAllBtn}>
          Edit profile details
        </Button>

        <Button variant="danger" fullWidth onPress={confirmSignOut} disabled={signingOut} style={styles.signOutBtn}>
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </ScrollView>

      <CertificateUploadModal
        visible={certModalOpen}
        trainings={trainings}
        onClose={() => setCertModalOpen(false)}
        onUploaded={async () => {
          setCertModalOpen(false)
          await invalidateProfile()
        }}
      />

      <Modal visible={resumeModalOpen} animationType="slide" transparent onRequestClose={() => setResumeModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Generate Resume</Text>
            <Text style={styles.modalHint}>Write a short professional summary (max 1200 characters). It will appear at the top of your generated PDF resume.</Text>
            <TextInput
              style={styles.modalTextarea}
              value={summary}
              onChangeText={setSummary}
              placeholder="e.g. Detail-oriented administrative professional with 3 years of experience..."
              placeholderTextColor={colors.subtle}
              multiline
              maxLength={1200}
            />
            <Button variant="outline" onPress={generateSummaryWithAI} disabled={aiSummaryBusy} style={styles.aiSummaryBtn}>
              {aiSummaryBusy ? 'Generating with AI...' : 'Generate with AI'}
            </Button>
            {aiSummaryNotice ? <Text style={styles.aiSummaryNotice}>{aiSummaryNotice}</Text> : null}
            <View style={styles.modalActions}>
              <Button variant="outline" onPress={() => setResumeModalOpen(false)} style={styles.modalBtn}>Cancel</Button>
              <Button variant="primary" onPress={generateResume} disabled={resumeBusy} style={styles.modalBtn}>
                {resumeBusy ? 'Generating...' : 'Generate'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function EditLink({ section }: { section: number }) {
  return (
    <TouchableOpacity onPress={() => router.push({ pathname: '/(seeker)/profile/edit', params: { section: String(section) } })}>
      <Text style={styles.editLinkText}>Edit</Text>
    </TouchableOpacity>
  )
}

function CertificateUploadModal({
  visible,
  trainings,
  onClose,
  onUploaded,
}: {
  visible: boolean
  trainings: Record<string, unknown>[]
  onClose: () => void
  onUploaded: () => void
}) {
  const [title, setTitle] = useState('')
  const [issuingBody, setIssuingBody] = useState('')
  const [category, setCategory] = useState(CERTIFICATE_CATEGORIES[0])
  const [issuedAt, setIssuedAt] = useState('')
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setTitle(''); setIssuingBody(''); setCategory(CERTIFICATE_CATEGORIES[0]); setIssuedAt(''); setFile(null); setError('')
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true })
    if (result.canceled || !result.assets?.length) return
    const asset = result.assets[0]
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/pdf' })
  }

  const submit = async () => {
    if (!title.trim() || !issuingBody.trim() || !issuedAt.trim() || !file) {
      setError('Title, issuing body, issued date, and a file are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await seekerService.uploadCertificate(file.uri, file.mimeType, file.name, {
        title: title.trim(),
        issuing_body: issuingBody.trim(),
        category,
        issued_at: issuedAt.trim(),
      })
      reset()
      onUploaded()
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to upload certificate. Max size 5MB (PDF, JPG, PNG).'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          <Text style={styles.modalTitle}>Upload Certificate</Text>
          {error ? <AlertBox variant="danger" style={{ marginBottom: spacing.md }}>{error}</AlertBox> : null}
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.modalInput} value={title} onChangeText={setTitle} placeholder="e.g. NC II Housekeeping" placeholderTextColor={colors.subtle} />
          <Text style={styles.label}>Issuing Body</Text>
          <TextInput style={styles.modalInput} value={issuingBody} onChangeText={setIssuingBody} placeholder="e.g. TESDA" placeholderTextColor={colors.subtle} />
          <Text style={styles.label}>Category</Text>
          <View style={styles.tagRow}>
            {CERTIFICATE_CATEGORIES.map((c) => (
              <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.categoryChip, category === c && styles.categoryChipActive]}>
                <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>{c.replace(/_/g, ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Issued Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.modalInput} value={issuedAt} onChangeText={setIssuedAt} placeholder="2024-06-15" placeholderTextColor={colors.subtle} />
          <Button variant="outline" onPress={pickFile} style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
            {file ? file.name : 'Choose file (PDF, JPG, PNG)'}
          </Button>
          <View style={styles.modalActions}>
            <Button variant="outline" onPress={() => { reset(); onClose() }} style={styles.modalBtn}>Cancel</Button>
            <Button variant="primary" onPress={submit} disabled={busy} style={styles.modalBtn}>{busy ? 'Uploading...' : 'Upload'}</Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.medium, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  statusCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  statusMessageCard: { borderColor: colors.border, backgroundColor: colors.surface },
  loadingText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  profileHeaderCard: { marginBottom: spacing.lg },
  profileHeaderInner: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  profileHeaderText: { flex: 1 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { color: colors.surface, fontSize: typography.heading, fontFamily: typography.family.bold },
  avatarEditLabel: { textAlign: 'center', marginTop: spacing.xs, color: colors.secondary, fontSize: 10, fontFamily: typography.family.bold },
  removePhotoText: { marginTop: spacing.xs, color: colors.error, fontSize: typography.small, fontFamily: typography.family.bold },
  name: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  muted: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
  strengthCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  strengthText: { flex: 1 },
  strengthTitle: { fontSize: typography.title, fontFamily: typography.family.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  strengthSub: { fontSize: typography.small, color: colors.textSecondary, lineHeight: 18 },
  checklistCard: { marginTop: spacing.md, marginBottom: spacing.lg },
  analyticsCard: {},
  analyticsStatsRow: { flexDirection: 'row', gap: spacing.lg },
  analyticsStat: { flex: 1, alignItems: 'center', backgroundColor: colors.background, borderRadius: radii.md, paddingVertical: spacing.md },
  analyticsStatValue: { color: colors.secondary, fontSize: typography.heading, fontFamily: typography.family.bold },
  analyticsStatLabel: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs, textAlign: 'center' },
  recentViewers: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  recentViewersTitle: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  recentViewerRow: { color: colors.textSecondary, fontSize: typography.small, paddingVertical: spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  checkDotDone: { backgroundColor: colors.success },
  checkText: { color: colors.textSecondary, fontSize: typography.body },
  checkTextDone: { color: colors.textPrimary, fontFamily: typography.family.medium },
  updateBtn: { marginTop: spacing.md },
  editAllBtn: { marginTop: spacing.xl },
  signOutBtn: { marginTop: spacing.md, marginBottom: spacing.xl },
  editLinkText: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { color: colors.textSecondary, fontSize: typography.body },
  infoValue: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.medium, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  skillGroupTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillBadge: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: typography.body, fontStyle: 'italic' },
  cardList: { gap: spacing.md },
  itemTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  itemMeta: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20 },
  bulletList: { marginTop: spacing.md, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.secondary, marginTop: 7 },
  bulletText: { flex: 1, color: colors.textPrimary, fontSize: typography.small, lineHeight: 18 },
  dutiesToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  dutiesToggleText: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold },
  dutiesPanel: { marginTop: spacing.md, borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.md, padding: spacing.md },
  dutiesPanelHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  dutiesPanelHeaderText: { flex: 1, minWidth: 160 },
  dutiesPanelTitle: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  dutiesPanelHint: { color: colors.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 2 },
  aiEnhanceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  aiEnhanceBtnText: { color: colors.info, fontSize: 11, fontFamily: typography.family.bold },
  dutiesTextarea: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, minHeight: 80, textAlignVertical: 'top', color: colors.textPrimary, fontSize: typography.small },
  certActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  certActionBtn: { flex: 1, marginBottom: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, maxHeight: '85%' },
  modalTitle: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  modalHint: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18, marginBottom: spacing.md },
  modalTextarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, minHeight: 120, textAlignVertical: 'top', color: colors.textPrimary, fontSize: typography.body },
  aiSummaryBtn: { marginTop: spacing.md, marginBottom: 0 },
  aiSummaryNotice: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, marginBottom: 0 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  categoryChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  categoryChipActive: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  categoryChipText: { fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  categoryChipTextActive: { color: colors.secondary, fontFamily: typography.family.bold },
})
