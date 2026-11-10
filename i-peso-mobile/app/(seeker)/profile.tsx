import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as DocumentPicker from 'expo-document-picker'
import type { ProfileStrengthItem, SeekerCertificate } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { downloadAndShare } from '@/utils/fileTransfer'
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
} from '@/utils/resumeBullets'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SelectField } from '@/components/onboarding/formPrimitives'
import { CalendarField } from '@/components/onboarding/Steps'
import { useProfilePhotoUri } from '@/hooks/useProfilePhotoUri'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PressableScale } from '@/components/ui/PressableScale'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MatchRing } from '@/components/ui/MatchRing'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, radii, spacing, typography, shadows } from '@/theme'

const CERTIFICATE_CATEGORIES = [
  'training_certificate', 'tesda_nc_certificate', 'professional_certificate',
  'seminar_certificate', 'workshop_certificate', 'employment_certificate',
  'academic_certificate', 'other',
]

// A Training Certificate / TESDA NC credential is, by definition, a training's output —
// everything else may stand alone. Mirrors SeekerCertificateController::CATEGORIES_REQUIRING_TRAINING
// and i-peso-frontend's CertificateUploadModal.jsx.
const CATEGORIES_REQUIRING_TRAINING = ['training_certificate', 'tesda_nc_certificate']

type CertificateFieldErrors = Partial<Record<'title' | 'issuingBody' | 'trainingId' | 'issuedAt' | 'expiresAt' | 'file', string>>

const CERTIFICATE_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']
const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024

// Mirrors validate() in i-peso-frontend's CertificateUploadModal.jsx (same rules, same copy),
// which in turn mirrors SeekerCertificateController::store. "Today" is the UTC date, like the
// web form and the backend's before_or_equal:today (the app timezone is UTC), so the app never
// accepts a date the server then rejects. Computed per call so it can't go stale overnight.
function validateCertificate(form: {
  title: string
  issuingBody: string
  category: string
  issuedAt: string
  expiresAt: string
  trainingId: string
  file: { name: string; size?: number } | null
  requiresTraining: boolean
  hasTrainings: boolean
  hasSelectedTraining: boolean
}): CertificateFieldErrors {
  const errors: CertificateFieldErrors = {}
  const today = new Date().toISOString().slice(0, 10)
  if (!form.hasSelectedTraining && !form.title.trim()) errors.title = 'Certificate title is required.'
  if (!form.hasSelectedTraining && !form.issuingBody.trim()) errors.issuingBody = 'Issuing organization is required.'
  if (form.requiresTraining && !form.trainingId) {
    errors.trainingId = form.hasTrainings
      ? 'Link this certificate to one of your trainings.'
      : 'Add a training record first, then link it here.'
  }
  if (!form.issuedAt) errors.issuedAt = 'Issue date is required.'
  else if (form.issuedAt > today) errors.issuedAt = 'Issue date cannot be in the future.'
  if (form.expiresAt && form.issuedAt && form.expiresAt <= form.issuedAt) errors.expiresAt = 'Expiration date must be after the issue date.'
  if (!form.file) errors.file = 'Select a certificate proof file.'
  else {
    const extension = form.file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!CERTIFICATE_FILE_EXTENSIONS.includes(extension)) errors.file = 'Use a PDF, JPG, JPEG, or PNG file.'
    else if ((form.file.size ?? 0) > CERTIFICATE_MAX_BYTES) errors.file = 'The proof file must not exceed 5 MB.'
  }
  return errors
}

// The picker's crop keeps full camera resolution, so a phone photo can be several MB — over
// the backend's 2MB limit and often over the server's PHP post_max_size, which makes PHP drop
// the whole body and Laravel report "The profile image field is required." Re-encode to a
// centred square JPEG of at most 800px (comfortably above the 300px minimum, usually <300KB)
// so the upload always matches SeekerProfileImageController's rules (exact 1:1, jpg/png, 2MB).
const PROFILE_PHOTO_MAX_SIDE = 800

async function prepareProfilePhoto(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const { width, height } = asset
  let context = ImageManipulator.manipulate(asset.uri)
  if (width > 0 && height > 0) {
    const side = Math.min(width, height)
    if (width !== height) {
      context = context.crop({
        originX: Math.floor((width - side) / 2),
        originY: Math.floor((height - side) / 2),
        width: side,
        height: side,
      })
    }
    if (side > PROFILE_PHOTO_MAX_SIDE) {
      context = context.resize({ width: PROFILE_PHOTO_MAX_SIDE, height: PROFILE_PHOTO_MAX_SIDE })
    }
  } else {
    context = context.resize({ width: PROFILE_PHOTO_MAX_SIDE })
  }
  const image = await context.renderAsync()
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 })
  return saved.uri
}

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const params = useLocalSearchParams<{ returnSection?: string }>()
  const scrollViewRef = useRef<ScrollView>(null)
  const sectionYMap = useRef<Record<string, number>>({})
  const scrolledForSectionRef = useRef<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [certModalOpen, setCertModalOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [openExperienceEditors, setOpenExperienceEditors] = useState<Record<string, boolean>>({})
  const [experienceDrafts, setExperienceDrafts] = useState<Record<string, string>>({})
  const [experienceResponsibilities, setExperienceResponsibilities] = useState<Record<string, string>>({})
  const [professionalSummary, setProfessionalSummary] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [summaryEditing, setSummaryEditing] = useState(false)
  const [summaryGenerating, setSummaryGenerating] = useState(false)
  const [summarySaving, setSummarySaving] = useState(false)
  const [savingBulletsFor, setSavingBulletsFor] = useState<string | null>(null)

  const scrollToSection = useCallback((sectionKey: string) => {
    const y = sectionYMap.current[sectionKey]
    if (y !== undefined && scrollViewRef.current) {
      const targetY = Math.max(0, y - 12)
      scrollViewRef.current.scrollTo({ y: targetY, animated: true })
      scrolledForSectionRef.current = sectionKey
    }
  }, [])

  const handleSectionLayout = useCallback(
    (sectionKey: string, y: number) => {
      sectionYMap.current[sectionKey] = y
      if (
        params.returnSection === sectionKey &&
        scrolledForSectionRef.current !== sectionKey
      ) {
        scrollToSection(sectionKey)
      }
    },
    [params.returnSection, scrollToSection]
  )
  const [signOutModalOpen, setSignOutModalOpen] = useState(false)
  
  const confirmSignOut = () => {
    setSignOutModalOpen(true)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await logout()
      setSignOutModalOpen(false)
    } catch {
      // clearAuth() already ran inside the store even if the network call failed —
      // the seeker layout's auth guard will redirect to /login regardless.
    } finally {
      setSigningOut(false)
    }
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

  useEffect(() => {
    if (!profile) return
    const p = profile as Record<string, unknown>
    const savedSummary = (p.professional_summary as string | undefined) ?? (p.summary as string | undefined) ?? ''
    setProfessionalSummary(savedSummary)
    setSummaryDraft(savedSummary)
    setSummaryEditing(false)
  }, [profile?.id, (profile as Record<string, unknown>)?.seeker_id])

  useEffect(() => {
    const returnSection = params.returnSection
    if (!returnSection || isLoading) return

    if (scrolledForSectionRef.current !== returnSection) {
      const timer = setTimeout(() => {
        scrollToSection(returnSection)
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [params.returnSection, isLoading, scrollToSection])

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

  // photoVersion (bumped after every successful upload/delete) is part of the cache key —
  // profile.id alone doesn't change on a same-account re-upload. The photo is downloaded with
  // the session token first (see useProfilePhotoUri); until it arrives the initial shows.
  const hasPhoto = Boolean(profile?.has_profile_image)
  const photoUri = useProfilePhotoUri(hasPhoto, `${profile?.id ?? 'me'}-${photoVersion}`)

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
      const photoUri = await prepareProfilePhoto(asset)
      await seekerService.uploadProfileImage(photoUri, 'image/jpeg')
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

  const generateProfessionalSummary = async () => {
    setActionError('')
    setSummaryGenerating(true)
    try {
      const result = await seekerService.generateProfessionalSummaryAI(summaryDraft.trim() || professionalSummary.trim())
      if (result?.summary) {
        setSummaryDraft(result.summary)
        setSummaryEditing(true)
      } else {
        setActionError('Smart summary generation is unavailable right now. You can still write your own summary.')
      }
    } catch (caught) {
      setActionError(apiErrorMessage(caught, 'Unable to generate your professional summary.'))
    } finally {
      setSummaryGenerating(false)
    }
  }

  const saveProfessionalSummary = async () => {
    const trimmed = summaryDraft.trim()
    setActionError('')
    setSummarySaving(true)
    try {
      await seekerService.saveProfessionalSummary(trimmed)
      setProfessionalSummary(trimmed)
      setSummaryEditing(false)
    } catch (caught) {
      setActionError(apiErrorMessage(caught, 'Unable to save your professional summary.'))
    } finally {
      setSummarySaving(false)
    }
  }

  const viewCertificate = async (certificate: SeekerCertificate) => {
    setActionError('')
    try {
      await downloadAndShare(seekerService.certificateViewUrl(certificate.certificate_id), certificate.original_filename || `${certificate.title}.pdf`)
    } catch {
      setActionError('Unable to open the certificate. Please check your connection and try again.')
    }
  }

  const deleteCertificate = (certificate: SeekerCertificate) => {
    Alert.alert('Delete certificate?', certificate.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionError('')
          try {
            await seekerService.deleteCertificate(certificate.certificate_id)
            await invalidateProfile()
          } catch (caught) {
            setActionError(apiErrorMessage(caught, 'Unable to delete this certificate. Please try again.'))
          }
        },
      },
    ])
  }

  // Persists the enhanced/edited bullet text to the actual work experience record —
  // without this it only ever lived in experienceResponsibilities' local state and
  // was gone on the next refresh (and never reached the generated resume either,
  // since that reads work_experiences[].responsibilities from the saved profile).
  // A work experience with no real id yet (not saved via Step 7) has nothing to
  // PATCH, so it falls back to the old local-only behavior for that case.
  const saveBullets = async (key: string, workExperienceId: number | string | undefined, text: string) => {
    const trimmed = text.trim()
    setExperienceResponsibilities((current) => ({ ...current, [key]: trimmed }))
    setOpenExperienceEditors((current) => ({ ...current, [key]: false }))

    if (workExperienceId === undefined || workExperienceId === null) return

    setSavingBulletsFor(key)
    setActionError('')
    try {
      await seekerService.updateWorkExperienceResponsibilities(workExperienceId, trimmed)
      await invalidateProfile()
    } catch (caught) {
      setActionError(apiErrorMessage(caught, 'Unable to save these bullets. Please try again.'))
    } finally {
      setSavingBulletsFor(null)
    }
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollViewRef}
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
            <PressableScale
              scaleTo="buttonPress"
              ripple={null}
              onPress={pickAndUploadPhoto}
              disabled={photoBusy}
              accessibilityRole="button"
              accessibilityLabel={hasPhoto ? 'Change profile photo' : 'Add profile photo'}
            >
              <View style={styles.avatar}>
                {photoBusy ? (
                  <ActivityIndicator color={colors.surface} />
                ) : photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{seekerName(profile).charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <Text style={styles.avatarEditLabel}>{hasPhoto ? 'Change' : 'Add photo'}</Text>
            </PressableScale>
            <View style={styles.profileHeaderText}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{seekerName(profile)}</Text>
                <Badge variant={profile?.profile_completed ? 'success' : 'warning'} style={styles.completionBadge}>
                  {profile?.profile_completed ? 'NSRP Verified' : 'Needs Completion'}
                </Badge>
              </View>
              <Text style={styles.muted}>{textFrom(profile?.email, 'Email not listed')}</Text>
              <Text style={styles.muted}>{addressLine(profile)}</Text>
              {photoBusy ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color={colors.info} />
                  <Text style={styles.savingText}>Saving photo...</Text>
                </View>
              ) : hasPhoto ? (
                <PressableScale scaleTo="buttonPress" ripple={null} onPress={deletePhoto} disabled={photoBusy} accessibilityRole="button">
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </PressableScale>
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

        <View style={styles.heroStatsRow}>
          <View style={[styles.heroStat, styles.heroStatEmerald]}>
            <MaterialIcons name="work-outline" size={18} color={colors.success} />
            <View>
              <Text style={styles.heroStatValue}>{profile?.dashboard_stats?.active_applications ?? 0}</Text>
              <Text style={styles.heroStatLabel}>Applications</Text>
            </View>
          </View>
          <View style={[styles.heroStat, styles.heroStatIndigo]}>
            <MaterialIcons name="auto-awesome" size={18} color={colors.info} />
            <View>
              <Text style={styles.heroStatValue}>{profile?.dashboard_stats?.skills ?? hardSkills.length + softSkills.length}</Text>
              <Text style={styles.heroStatLabel}>Skills</Text>
            </View>
          </View>
        </View>

        <Card padding="md" style={styles.checklistCard}>
          {checklist.map((item) => (
            <View key={item.key ?? item.label} style={styles.checkRow}>
              <View style={[styles.checkDot, item.complete && styles.checkDotDone]} />
              <Text style={[styles.checkText, item.complete && styles.checkTextDone]}>{item.label}</Text>
            </View>
          ))}
        </Card>

        <SectionHeader
          title="About"
          action={
            <PressableScale
              scaleTo="buttonPress"
              ripple={null}
              onPress={generateProfessionalSummary}
              disabled={summaryGenerating}
              accessibilityRole="button"
            >
              <View style={styles.summaryGenerateAction}>
                {summaryGenerating ? (
                  <ActivityIndicator size="small" color={colors.info} />
                ) : (
                  <MaterialIcons name="auto-awesome" size={14} color={colors.info} />
                )}
                <Text style={styles.editLinkText}>
                  {summaryGenerating ? 'Generating...' : professionalSummary || summaryDraft ? 'Regenerate' : 'Generate'}
                </Text>
              </View>
            </PressableScale>
          }
        />
        <Card padding="md">
          {summaryEditing ? (
            <>
              <TextInput
                style={styles.dutiesTextarea}
                value={summaryDraft}
                onChangeText={setSummaryDraft}
                placeholder="Write a short summary of your career goals, top skills, and preferred work."
                placeholderTextColor={colors.subtle}
                multiline
                maxLength={1200}
              />
              <View style={styles.modalActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => { setSummaryDraft(professionalSummary); setSummaryEditing(false) }}
                  style={styles.modalBtn}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={saveProfessionalSummary}
                  disabled={!summaryDraft.trim() || summarySaving}
                  loading={summarySaving}
                  style={styles.modalBtn}
                >
                  Save Summary
                </Button>
              </View>
            </>
          ) : professionalSummary ? (
            <>
              <Text style={styles.summaryText}>{professionalSummary}</Text>
              <PressableScale
                scaleTo="buttonPress"
                ripple={null}
                onPress={() => { setSummaryDraft(professionalSummary); setSummaryEditing(true) }}
                accessibilityRole="button"
                style={styles.summaryEditLink}
              >
                <Text style={styles.editLinkText}>Edit summary</Text>
              </PressableScale>
            </>
          ) : (
            <EmptyLine text="Create an employer-ready introduction from your verified profile. Use Generate above, or write your own." />
          )}
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
          onLayout={(e) => handleSectionLayout('1', e.nativeEvent.layout.y)}
        />
        <Card padding="md">
          <Info label="Date of Birth" value={textFrom(profile?.date_of_birth)} />
          <Info label="Sex" value={titleCase(profile?.sex)} />
          <Info label="Civil Status" value={titleCase(profile?.civil_status)} />
          <Info label="Mobile" value={textFrom(profile?.mobile_number)} />
          <Info label="Address" value={addressLine(profile)} />
        </Card>

        <SectionHeader title="Employment & Preferences" action={<EditLink section={2} />} onLayout={(e) => handleSectionLayout('2', e.nativeEvent.layout.y)} />
        <Card padding="md">
          <Info label="Employment Status" value={titleCase(profile?.employment_status)} />
          <Info label="Preferred Work" value={titleCase(profile?.work_type_preference)} />
          <Info label="Preferred Location" value={titleCase(profile?.preferred_work_location)} />
          <Info label="Preferred Areas" value={(profile?.preferred_locations_details ?? []).join(', ') || 'Not set'} />
        </Card>

        <SectionHeader title="Preferred Occupations" action={<EditLink section={3} />} onLayout={(e) => handleSectionLayout('3', e.nativeEvent.layout.y)} />
        <Card padding="md">
          {occupations.length ? occupations.map((o, i) => (
            <Info key={i} label={`Choice ${i + 1}`} value={recordText(o, ['occupation_title', 'raw_job_title', 'general_term'], 'Not set')} />
          )) : <EmptyLine text="No preferred occupations listed yet." />}
        </Card>

        <SectionHeader title="Languages" action={<EditLink section={4} />} onLayout={(e) => handleSectionLayout('4', e.nativeEvent.layout.y)} />
        <Card padding="md">
          {languages.length ? languages.map((l, i) => (
            <Info key={i} label={titleCase(recordText(l, ['language']))} value={['can_read', 'can_write', 'can_speak', 'can_understand'].filter((k) => l[k]).map((k) => k.replace('can_', '')).join(', ') || 'None'} />
          )) : <EmptyLine text="No languages listed yet." />}
        </Card>

        <SectionHeader title="Skills" action={<EditLink section={5} />} onLayout={(e) => handleSectionLayout('5', e.nativeEvent.layout.y)} />
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
          {educations.length ? educations.map((education, index) => {
            const yearRange = [
              textFrom(education.year_started, ''),
              textFrom(education.year_graduated, '') || (education.completion_status === 'currently_studying' ? 'Present' : ''),
            ].filter(Boolean).join(' - ')
            const statusLabel = education.completion_status === 'currently_studying'
              ? 'Currently Studying'
              : education.completion_status === 'undergraduate'
                ? 'Undergraduate / Did Not Finish'
                : education.completion_status === 'graduated' || education.year_graduated
                  ? 'Graduated'
                  : 'Status not specified'

            return (
              <Card key={index} padding="md">
                <Text style={styles.itemTitle}>{recordText(education, ['institution_name'], 'School not listed')}</Text>
                <Text style={styles.itemMeta}>{titleCase(recordText(education, ['level']))}</Text>
                <Text style={styles.itemMeta}>{recordText(education, ['course_strand'], 'Course or strand not listed')}</Text>
                <View style={styles.tagRow}>
                  <Badge variant="neutral" style={styles.metaBadge}>{statusLabel}</Badge>
                  {yearRange ? <Badge variant="info" style={styles.metaBadge}>{yearRange}</Badge> : null}
                  {education.undergrad_level_reached ? <Badge variant="warning" style={styles.metaBadge}>{textFrom(education.undergrad_level_reached)}</Badge> : null}
                  {education.current_level ? <Badge variant="success" style={styles.metaBadge}>{textFrom(education.current_level)}</Badge> : null}
                </View>
              </Card>
            )
          }) : <Card padding="md"><EmptyLine text="No education records listed yet." /></Card>}
        </View>

        <SectionHeader title="Work Experience" action={<EditLink section={7} />} onLayout={(e) => handleSectionLayout('7', e.nativeEvent.layout.y)} />
        <View style={styles.cardList}>
          {workExperiences.length ? workExperiences.map((work, index) => {
            const key = experienceKey(work, index)
            const workExperienceId = (work.id ?? work.work_experience_id) as number | string | undefined
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
                <Text style={styles.itemMeta}>{recordText(work, ['company_address'], 'Address not specified')}</Text>
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

                <PressableScale scaleTo="buttonPress" ripple={null} onPress={toggleEditor} style={styles.dutiesToggle} accessibilityRole="button">
                  <MaterialIcons name="add" size={16} color={colors.secondary} />
                  <Text style={styles.dutiesToggleText}>{savedResponsibilities ? 'Edit Job Duties / Responsibilities' : 'Add Job Duties / Responsibilities'}</Text>
                </PressableScale>

                {isOpen ? (
                  <View style={styles.dutiesPanel}>
                    <View style={styles.dutiesPanelHeader}>
                      <View style={styles.dutiesPanelHeaderText}>
                        <Text style={styles.dutiesPanelTitle}>Resume bullet points</Text>
                        <Text style={styles.dutiesPanelHint}>Type simple duties, then let Smart Assistant polish them into stronger resume language.</Text>
                      </View>
                      <PressableScale
                        scaleTo="buttonPress"
                        ripple={null}
                        onPress={() => setExperienceDrafts((current) => ({ ...current, [key]: enhanceResponsibilities(current[key], position) }))}
                        style={styles.aiEnhanceBtn}
                        accessibilityRole="button"
                      >
                        <MaterialIcons name="auto-awesome" size={14} color={colors.info} />
                        <Text style={styles.aiEnhanceBtnText}>Smart Enhance Bullets</Text>
                      </PressableScale>
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
                        loading={savingBulletsFor === key}
                        disabled={savingBulletsFor === key}
                        onPress={() => saveBullets(key, workExperienceId, experienceDrafts[key] ?? '')}
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

        <SectionHeader title="Training & Eligibility" action={<EditLink section={6} />} onLayout={(e) => handleSectionLayout('6', e.nativeEvent.layout.y)} />
        <View style={styles.cardList}>
          {trainings.length || eligibilities.length ? (
            <>
              {trainings.map((training, index) => (
                <Card key={`t${index}`} padding="md">
                  <Text style={styles.itemTitle}>{recordText(training, ['course'], 'Training not listed')}</Text>
                  <Text style={styles.itemMeta}>
                    {recordText(training, ['training_institution'], 'Institution not listed')}
                    {training.hours_of_training ? ` · ${textFrom(training.hours_of_training)} hours` : ''}
                  </Text>
                  {training.certificates_received ? (
                    <Badge variant="success" style={styles.metaBadge}>{textFrom(training.certificates_received)}</Badge>
                  ) : null}
                  {training.skills_acquired ? (
                    <Text style={styles.itemMeta}>{textFrom(training.skills_acquired)}</Text>
                  ) : null}
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
            <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => setCertModalOpen(true)} accessibilityRole="button">
              <Text style={styles.editLinkText}>+ Add</Text>
            </PressableScale>
          }
        />
        <View style={styles.cardList}>
          {certificates.length ? certificates.map((certificate) => {
            const expired = Boolean(certificate.expires_at && certificate.expires_at < new Date().toISOString().slice(0, 10))

            return (
              <Card key={String(certificate.certificate_id)} padding="md">
                <Text style={styles.itemTitle}>{certificate.title}</Text>
                <Text style={styles.itemMeta}>{certificate.issuing_body} · {titleCase(certificate.category)}</Text>
                <Text style={styles.itemMeta}>Issued {textFrom(certificate.issued_at)}</Text>
                {certificate.credential_number ? <Text style={styles.itemMeta}>Credential no.: {certificate.credential_number}</Text> : null}
                {certificate.training?.course ? <Text style={styles.itemMeta}>Related training: {certificate.training.course}</Text> : null}
                {certificate.description ? <Text style={styles.itemMeta}>Remarks: {certificate.description}</Text> : null}
                <View style={styles.tagRow}>
                  <Badge variant={expired ? 'danger' : 'neutral'} style={styles.metaBadge}>
                    {expired ? 'Expired' : certificate.expires_at ? `Expires ${textFrom(certificate.expires_at)}` : 'No expiration'}
                  </Badge>
                </View>
                <View style={styles.certActions}>
                  <Button variant="outline" size="sm" onPress={() => viewCertificate(certificate)} style={styles.certActionBtn}>View</Button>
                  <Button variant="danger" size="sm" onPress={() => deleteCertificate(certificate)} style={styles.certActionBtn}>Delete</Button>
                </View>
              </Card>
            )
          }) : <Card padding="md"><EmptyLine text="No certificates uploaded yet." /></Card>}
        </View>

        <SectionHeader title="Resume" />
        <Card padding="md">
          <Info label="Resume" value={profile?.has_resume ? 'Generated' : 'Not generated'} />
          <Button
            variant="outline"
            fullWidth
            onPress={() => router.push('/(seeker)/profile/resume-studio' as never)}
            style={styles.updateBtn}
          >
            Open Resume Studio
          </Button>
        </Card>

        <SectionHeader title="My Reviews" />
        <Card padding="md">
          <Text style={styles.muted}>
            Rate employers you&apos;ve applied to or worked for, and read employers&apos; feedback about you. Your name is never shown.
          </Text>
          <Button
            variant="outline"
            fullWidth
            onPress={() => router.push('/(seeker)/reviews')}
            style={styles.updateBtn}
          >
            Open My Reviews
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

      <Modal visible={signOutModalOpen} transparent animationType="fade" onRequestClose={() => !signingOut && setSignOutModalOpen(false)}>
        <View style={styles.signOutModalOverlay}>
          <View style={styles.signOutModalContent}>
            <View style={styles.signOutModalIconWrap}>
              <MaterialIcons name="logout" size={32} color={colors.danger} />
            </View>
            <Text style={styles.signOutModalTitle}>Sign out of i-PESO?</Text>
            <Text style={styles.signOutModalDesc}>
              Are you sure you want to sign out of your account? You can sign in again at any time.
            </Text>
            <View style={styles.signOutModalActions}>
              <Button
                variant="outline"
                onPress={() => setSignOutModalOpen(false)}
                disabled={signingOut}
                style={styles.signOutModalBtn}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={handleSignOut}
                loading={signingOut}
                disabled={signingOut}
                style={styles.signOutModalBtn}
              >
                Sign Out
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
    <PressableScale
      scaleTo="buttonPress"
      ripple={null}
      onPress={() => router.push({ pathname: '/(seeker)/profile/edit', params: { section: String(section) } })}
      accessibilityRole="button"
    >
      <Text style={styles.editLinkText}>Edit</Text>
    </PressableScale>
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
  const [expiresAt, setExpiresAt] = useState('')
  const [credentialNumber, setCredentialNumber] = useState('')
  const [trainingId, setTrainingId] = useState('')
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string; size?: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<CertificateFieldErrors>({})

  const requiresTraining = CATEGORIES_REQUIRING_TRAINING.includes(category)
  const blockedByNoTrainings = requiresTraining && trainings.length === 0
  const selectedTraining = trainings.find((training) => String(training.id) === trainingId)
  
  const effectiveTitle = selectedTraining ? textFrom(selectedTraining.course) : title.trim()
  const effectiveIssuingBody = selectedTraining ? (textFrom(selectedTraining.training_institution) || 'Training Provider') : issuingBody.trim()

  const reset = () => {
    setTitle(''); setIssuingBody(''); setCategory(CERTIFICATE_CATEGORIES[0]); setIssuedAt(''); setExpiresAt('')
    setCredentialNumber(''); setTrainingId(''); setFile(null); setError(''); setFieldErrors({})
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true })
    if (result.canceled || !result.assets?.length) return
    const asset = result.assets[0]
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/pdf', size: asset.size })
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const submit = async () => {
    const errors = validateCertificate({
      title, issuingBody, category, issuedAt, expiresAt, trainingId, file,
      requiresTraining, hasTrainings: trainings.length > 0, hasSelectedTraining: Boolean(selectedTraining),
    })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !file) {
      setError('')
      return
    }
    setBusy(true)
    setError('')
    try {
      await seekerService.uploadCertificate(file.uri, file.mimeType, file.name, {
        title: effectiveTitle,
        issuing_body: effectiveIssuingBody,
        category,
        issued_at: issuedAt,
        expires_at: expiresAt || null,
        credential_number: credentialNumber.trim() || null,
        training_id: trainingId || null,
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
    <BottomSheet
      visible={visible}
      onClose={() => { reset(); onClose() }}
      title="Upload Certificate"
      heightRatio={0.85}
      footer={
        <View style={styles.modalActions}>
          <Button variant="outline" onPress={() => { reset(); onClose() }} style={styles.modalBtn}>Cancel</Button>
          <Button variant="primary" onPress={submit} disabled={busy || blockedByNoTrainings} loading={busy} style={styles.modalBtn}>Upload</Button>
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        {error ? <AlertBox variant="danger" style={{ marginBottom: spacing.md }}>{error}</AlertBox> : null}
        
        <Text style={styles.label}>Category</Text>
        <View style={styles.tagRow}>
          {CERTIFICATE_CATEGORIES.map((c) => (
            <PressableScale
              key={c}
              scaleTo="buttonPress"
              ripple={null}
              onPress={() => {
                setCategory(c)
                if (!CATEGORIES_REQUIRING_TRAINING.includes(c)) setTrainingId('')
              }}
              style={[styles.categoryChip, category === c && styles.categoryChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: category === c }}
            >
              <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>{c.replace(/_/g, ' ')}</Text>
            </PressableScale>
          ))}
        </View>
        <SelectField
          label={`Related Training Record${requiresTraining ? '' : ' (Optional)'}`}
          required={requiresTraining}
          placeholder={requiresTraining ? 'Select a training' : 'Standalone certificate'}
          options={trainings.map((training, index) => ({
            value: String(training.id ?? index),
            label: [textFrom(training.course, ''), textFrom(training.training_institution, '')].filter(Boolean).join(' — ') || 'Untitled training',
          }))}
          value={trainingId}
          onChange={setTrainingId}
          error={fieldErrors.trainingId}
        />

        {!selectedTraining ? (
          <>
            <Text style={styles.label}>Certificate / Training Title *</Text>
            <TextInput style={[styles.modalInput, fieldErrors.title && styles.modalInputError]} value={title} onChangeText={setTitle} maxLength={255} placeholder="e.g. Computer Systems Servicing NC II" placeholderTextColor={colors.subtle} />
            {fieldErrors.title ? <Text style={styles.fieldError}>{fieldErrors.title}</Text> : null}
            <Text style={styles.label}>Issuing Organization / Provider *</Text>
            <TextInput style={[styles.modalInput, fieldErrors.issuingBody && styles.modalInputError]} value={issuingBody} onChangeText={setIssuingBody} maxLength={255} placeholder="e.g. TESDA" placeholderTextColor={colors.subtle} />
            {fieldErrors.issuingBody ? <Text style={styles.fieldError}>{fieldErrors.issuingBody}</Text> : null}
          </>
        ) : null}

        <CalendarField label="Issue Date" required value={issuedAt} onChange={setIssuedAt} maximumDate={new Date()} error={fieldErrors.issuedAt} />
        <CalendarField label="Expiration Date (Optional)" value={expiresAt} onChange={setExpiresAt} error={fieldErrors.expiresAt} />
        {expiresAt ? (
          <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => setExpiresAt('')} accessibilityRole="button" style={styles.clearDate}>
            <Text style={styles.clearDateText}>Clear expiration date</Text>
          </PressableScale>
        ) : null}

        <Text style={styles.label}>Credential Number (Optional)</Text>
        <TextInput style={styles.modalInput} value={credentialNumber} onChangeText={setCredentialNumber} maxLength={100} placeholder="Certificate or license number" placeholderTextColor={colors.subtle} autoCapitalize="characters" />

        {blockedByNoTrainings ? (
          <AlertBox variant="warning" style={{ marginBottom: spacing.md }}>
            This category needs a training record on file. Add one under the Trainings section first, then come back to link it here.
          </AlertBox>
        ) : selectedTraining ? (
          <Text style={styles.trainingHint}>This proof will be linked to: {textFrom(selectedTraining.course)}.</Text>
        ) : null}

        {!file ? (
          <>
            <Button variant="outline" onPress={pickFile} style={{ marginTop: spacing.sm, marginBottom: fieldErrors.file ? spacing.xs : spacing.md }}>
              Choose file (PDF, JPG, PNG)
            </Button>
            {fieldErrors.file ? <Text style={styles.fieldError}>{fieldErrors.file}</Text> : null}
          </>
        ) : (
          <View style={styles.filePreviewCard}>
            <Text style={styles.filePreviewTitle}>Selected File</Text>
            {file.mimeType.startsWith('image/') ? (
              <Image source={{ uri: file.uri }} style={styles.imagePreview} resizeMode="contain" />
            ) : (
              <View style={styles.pdfPreview}>
                <MaterialIcons name="picture-as-pdf" size={48} color={colors.error} />
                <Text style={styles.pdfPreviewText}>PDF Document</Text>
              </View>
            )}
            <View style={styles.filePreviewInfo}>
              <Text style={styles.filePreviewName} numberOfLines={1} ellipsizeMode="middle">{file.name}</Text>
              <Text style={styles.filePreviewSize}>{file.mimeType.split('/')[1]?.toUpperCase() || 'DOCUMENT'} • {formatSize(file.size)}</Text>
            </View>
            <View style={styles.filePreviewActions}>
              <Button variant="outline" onPress={pickFile} style={styles.filePreviewBtn}>Replace File</Button>
              <Button variant="outline" onPress={() => setFile(null)} style={styles.filePreviewBtn}>Remove</Button>
            </View>
            {fieldErrors.file ? <Text style={[styles.fieldError, styles.fileErrorInCard]}>{fieldErrors.file}</Text> : null}
          </View>
        )}
      </ScrollView>
    </BottomSheet>
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
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  savingText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  name: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  completionBadge: { paddingVertical: 3 },
  heroStatsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  heroStatEmerald: { backgroundColor: colors.successBackground },
  heroStatIndigo: { backgroundColor: colors.infoBackground },
  heroStatValue: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  heroStatLabel: { color: colors.textSecondary, fontSize: 11, fontFamily: typography.family.medium },
  metaBadge: { marginTop: spacing.sm },
  muted: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
  strengthCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  strengthText: { flex: 1 },
  strengthTitle: { fontSize: typography.title, fontFamily: typography.family.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  strengthSub: { fontSize: typography.small, color: colors.textSecondary, lineHeight: 18 },
  checklistCard: { marginTop: spacing.md, marginBottom: spacing.lg },
  summaryGenerateAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryText: { color: colors.textPrimary, fontSize: typography.body, lineHeight: 20 },
  summaryEditLink: { marginTop: spacing.md, alignSelf: 'flex-start' },
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
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, marginBottom: 0 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body, marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  trainingHint: { marginBottom: spacing.md, color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.medium },
  modalInputError: { borderColor: colors.errorBorder, backgroundColor: colors.errorBackground, marginBottom: spacing.xs },
  fieldError: { color: colors.error, fontSize: typography.small, fontFamily: typography.family.medium, marginBottom: spacing.md },
  fileErrorInCard: { marginTop: spacing.sm, marginBottom: 0 },
  clearDate: { alignSelf: 'flex-start', marginTop: -spacing.sm, marginBottom: spacing.md, paddingVertical: spacing.xs },
  clearDateText: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold },
  categoryChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  categoryChipActive: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  categoryChipText: { fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  categoryChipTextActive: { color: colors.secondary, fontFamily: typography.family.bold },
  filePreviewCard: { marginTop: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.surface },
  filePreviewTitle: { color: colors.textSecondary, fontSize: 11, fontFamily: typography.family.bold, marginBottom: spacing.sm, textTransform: 'uppercase' },
  imagePreview: { width: '100%', height: 200, borderRadius: radii.sm, backgroundColor: colors.background, marginBottom: spacing.sm },
  pdfPreview: { width: '100%', height: 120, borderRadius: radii.sm, backgroundColor: colors.background, marginBottom: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  pdfPreviewText: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium },
  filePreviewInfo: { marginBottom: spacing.md },
  filePreviewName: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  filePreviewSize: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  filePreviewActions: { flexDirection: 'row', gap: spacing.sm },
  filePreviewBtn: { flex: 1, marginBottom: 0 },
  signOutModalOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  signOutModalContent: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, width: '100%', maxWidth: 340, alignItems: 'center', ...shadows.elevated },
  signOutModalIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  signOutModalTitle: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold, marginBottom: spacing.xs, textAlign: 'center' },
  signOutModalDesc: { color: colors.textSecondary, fontSize: typography.body, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  signOutModalActions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  signOutModalBtn: { flex: 1, marginBottom: 0 },
})
