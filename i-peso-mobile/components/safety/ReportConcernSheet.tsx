import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { EvidenceFile, SafetyReportDetail, SafetyReportDuplicateBody } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import {
  addEvidence, DEFAULT_SAFETY_LIMITS, formatFileSize, formatSafetyDate, MY_SAFETY_REPORTS_KEY, pickEvidence, SAFETY_OPTIONS_KEY,
} from '@/utils/safetyReports'
import { CalendarField } from '@/components/onboarding/Steps'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/components/safety/ReportConcernDialog.jsx (role 'seeker'):
// same steps, wording, checks, duplicate and success states.

export interface ReportTarget {
  subjectId: number | string
  subjectName: string
  postId?: number | string | null
  postTitle?: string | null
  applicationId?: number | string | null
}

interface ReportConcernSheetProps {
  visible: boolean
  onClose: () => void
  target: ReportTarget | null
}

/** Report an employer, company or vacancy to PESO. Every opening starts with a clean form. */
export function ReportConcernSheet({ visible, onClose, target }: ReportConcernSheetProps) {
  if (!visible || !target) return null
  return <ReportConcernForm key={`${target.subjectId}-${target.postId ?? ''}-${target.applicationId ?? ''}`} target={target} onClose={onClose} />
}

type Step = 'form' | 'confirm' | 'done' | 'duplicate'
type Errors = Record<string, string | undefined>

const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function ReportConcernForm({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('form')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [acknowledge, setAcknowledge] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [result, setResult] = useState<{ id: number; case_number: string; message?: string } | null>(null)

  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: SAFETY_OPTIONS_KEY,
    queryFn: () => seekerService.safetyReportOptions(),
    staleTime: 10 * 60_000,
  })
  const limits = options?.limits ?? DEFAULT_SAFETY_LIMITS
  const categories = useMemo(() => options?.categories ?? [], [options])
  const selected = categories.find((item) => item.value === category)

  const clearError = (key: string) => setErrors((current) => ({ ...current, [key]: undefined }))

  const submit = useMutation({
    mutationFn: () => seekerService.submitSafetyReport({
      subject_id: target.subjectId,
      post_id: target.postId,
      application_id: target.applicationId,
      category,
      description: description.trim(),
      incident_date: incidentDate || null,
      attachments: files,
    }),
    onSuccess: (data: { report: SafetyReportDetail }) => {
      setResult({ id: data.report.id, case_number: data.report.case_number })
      setStep('done')
      queryClient.invalidateQueries({ queryKey: MY_SAFETY_REPORTS_KEY })
    },
    onError: (caught) => {
      const response = (caught as AxiosError<SafetyReportDuplicateBody & { errors?: Record<string, string[]> }>)?.response
      if (response?.status === 409 && response.data?.existing_report) {
        setResult({ ...response.data.existing_report, message: response.data.message })
        setStep('duplicate')
        return
      }
      const fieldErrors = Object.fromEntries(
        Object.entries(response?.data?.errors ?? {}).map(([key, messages]) => [key.replace(/\.\d+$/, ''), messages?.[0]]),
      )
      setErrors(Object.keys(fieldErrors).length
        ? fieldErrors
        : { form: apiErrorMessage(caught, 'Your report could not be sent. Please try again.') })
      // Field problems are fixed on the form, not on the confirmation step.
      if (Object.keys(fieldErrors).some((key) => key !== 'acknowledge')) setStep('form')
    },
  })

  const attach = async (kind: 'photo' | 'pdf') => {
    try {
      const file = await pickEvidence(kind)
      if (!file) return
      const next = addEvidence(files, file, limits)
      setFiles(next.files)
      setErrors((current) => ({ ...current, attachments: next.problem ?? undefined }))
    } catch (caught) {
      setErrors((current) => ({ ...current, attachments: (caught as Error).message }))
    }
  }

  const goToConfirm = () => {
    const next: Errors = {}
    if (!category) next.category = 'Choose the reason that fits best.'
    if (description.trim().length < limits.description_min) {
      next.description = `Describe what happened in at least ${limits.description_min} characters — include dates and what was said or done.`
    }
    if (incidentDate && incidentDate > todayIso()) next.incident_date = 'The date cannot be in the future.'
    setErrors(next)
    if (!Object.values(next).some(Boolean)) setStep('confirm')
  }

  const confirm = () => {
    if (!acknowledge) {
      setErrors({ acknowledge: 'Please confirm that your report is truthful.' })
      return
    }
    setErrors({})
    submit.mutate()
  }

  const close = () => { if (!submit.isPending) onClose() }

  const openMyReports = (caseId?: number) => {
    onClose()
    router.push({ pathname: '/(seeker)/safety-reports', params: caseId ? { case: String(caseId) } : {} })
  }

  const topError = errors.subject_id || errors.application_id || errors.post_id

  const footer = step === 'done' ? (
    <View style={styles.actions}>
      <Button variant="outline" onPress={onClose} style={styles.actionBtn}>Close</Button>
      <Button onPress={() => openMyReports(result?.id)} style={styles.actionBtn}>View my reports</Button>
    </View>
  ) : step === 'duplicate' ? (
    <View style={styles.actions}>
      <Button variant="outline" onPress={onClose} style={styles.actionBtn}>Close</Button>
      <Button onPress={() => openMyReports(result?.id)} style={styles.actionBtn}>Add details to that case</Button>
    </View>
  ) : step === 'form' ? (
    <View style={styles.actions}>
      <Button variant="outline" onPress={close} style={styles.actionBtn}>Cancel</Button>
      <Button onPress={goToConfirm} disabled={optionsLoading} style={styles.actionBtn}>Review report</Button>
    </View>
  ) : (
    <View style={styles.actions}>
      <Button variant="outline" onPress={() => setStep('form')} disabled={submit.isPending} style={styles.actionBtn}>Back</Button>
      <Button variant="danger" onPress={confirm} loading={submit.isPending} style={styles.actionBtn}>Submit report</Button>
    </View>
  )

  const title = step === 'done'
    ? 'Report received'
    : step === 'duplicate'
      ? `You already reported ${target.subjectName}`
      : step === 'confirm' ? 'Confirm your report' : 'Report an employer'

  return (
    <BottomSheet visible onClose={close} title={title} heightRatio={0.92} footer={footer}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 'done' ? (
          <View style={styles.center}>
            <MaterialIcons name="check-circle" size={48} color={colors.success} />
            <Text style={styles.doneLead}>
              Your case number is <Text style={styles.caseNumber}>{result?.case_number}</Text>.
            </Text>
            <Text style={styles.doneText}>
              An authorized PESO administrator will review it. You&apos;ll be notified when the review starts and when it&apos;s closed. Your identity is not shared with the employer.
            </Text>
          </View>
        ) : step === 'duplicate' ? (
          <>
            <Text style={styles.description}>{result?.message}</Text>
            <AlertBox variant="info" icon={false} style={styles.alert}>
              Adding to case <Text style={styles.caseNumber}>{result?.case_number}</Text> keeps everything together for the PESO administrator reviewing it.
            </AlertBox>
          </>
        ) : (
          <>
            <Text style={styles.description}>
              {step === 'confirm'
                ? 'Check the details below before sending them to PESO.'
                : 'Reports go to authorized PESO administrators only and are reviewed before any action is taken.'}
            </Text>

            {/* Who / what is being reported — shown on every step to prevent accidental reports. */}
            <View style={styles.subjectBox}>
              <Text style={styles.subjectKicker}>You are reporting</Text>
              <View style={styles.inline}>
                <MaterialIcons name="business" size={16} color={colors.textSecondary} />
                <Text style={styles.subjectName}>{target.subjectName}</Text>
              </View>
              {target.postTitle || target.applicationId ? (
                <View style={[styles.inline, styles.subjectVacancy]}>
                  <MaterialIcons name="work-outline" size={14} color={colors.subtle} />
                  <Text style={styles.subjectMeta}>
                    {target.postTitle ? `Vacancy: ${target.postTitle}` : 'Linked application'}
                    {target.applicationId && target.postTitle ? ' · your application is linked' : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            {errors.form ? <AlertBox variant="danger" style={styles.alert}>{errors.form}</AlertBox> : null}
            {topError ? <AlertBox variant="danger" style={styles.alert}>{topError}</AlertBox> : null}

            {step === 'form' ? (
              <>
                <Text style={styles.label}>What is the concern? <Text style={styles.required}>*</Text></Text>
                {optionsLoading ? (
                  <Text style={styles.muted}>Loading reasons…</Text>
                ) : (
                  <View style={styles.categoryList} accessibilityRole="radiogroup" accessibilityLabel="What is the concern?">
                    {categories.map((item) => {
                      const checked = category === item.value
                      return (
                        <Pressable
                          key={item.value}
                          onPress={() => { setCategory(item.value); clearError('category') }}
                          style={[styles.categoryRow, checked && styles.categoryRowActive]}
                          accessibilityRole="radio"
                          accessibilityState={{ checked }}
                          accessibilityLabel={item.hint ? `${item.label}. ${item.hint}` : item.label}
                        >
                          <MaterialIcons name={checked ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={checked ? colors.error : colors.subtle} />
                          <View style={styles.flex}>
                            <Text style={styles.categoryLabel}>{item.label}</Text>
                            {item.hint ? <Text style={styles.categoryHint}>{item.hint}</Text> : null}
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
                {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}

                <Text style={styles.label}>What happened? <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.textArea, errors.description && styles.inputError]}
                  value={description}
                  onChangeText={(text) => { setDescription(text); clearError('description') }}
                  multiline
                  maxLength={limits.description_max}
                  placeholder="Describe the facts: when it happened, who you dealt with (by role, e.g. “the HR officer”), and what was said or done."
                  placeholderTextColor={colors.subtle}
                  accessibilityLabel="What happened?"
                />
                <View style={styles.counterRow}>
                  <Text style={[styles.hint, styles.flex]}>Stick to what you saw or experienced. Clear, factual reports are reviewed faster.</Text>
                  <Text style={styles.hint}>{description.trim().length}/{limits.description_max}</Text>
                </View>
                {errors.description ? <Text style={styles.error}>{errors.description}</Text> : null}

                <View style={styles.field}>
                  <CalendarField
                    label="When did it happen? (optional)"
                    value={incidentDate}
                    onChange={(value) => { setIncidentDate(value); clearError('incident_date') }}
                    maximumDate={new Date()}
                    error={errors.incident_date}
                  />
                  {incidentDate ? (
                    <Pressable onPress={() => setIncidentDate('')} style={styles.clearDate} accessibilityRole="button">
                      <Text style={styles.link}>Clear date</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Text style={styles.label}>Supporting evidence <Text style={styles.optional}>(optional)</Text></Text>
                <Text style={styles.hint}>
                  Screenshots, receipts or documents ({limits.attachment_types.join(', ').toUpperCase()}, up to {limits.max_attachments} files, {Math.round(limits.max_attachment_kb / 1024)} MB each).
                </Text>
                <AlertBox variant="info" style={styles.alert}>
                  Only PESO administrators can open these files. Don&apos;t upload more personal information than needed — cover ID numbers, bank details and other people&apos;s private information that isn&apos;t part of the concern.
                </AlertBox>
                <FileList files={files} onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))} />
                {files.length < limits.max_attachments ? (
                  <View style={styles.attachRow}>
                    <Button variant="outline" size="sm" onPress={() => attach('photo')}>Add photo</Button>
                    <Button variant="outline" size="sm" onPress={() => attach('pdf')}>Add PDF</Button>
                  </View>
                ) : null}
                {errors.attachments ? <Text style={styles.error}>{errors.attachments}</Text> : null}

                <Text style={styles.emergency}>
                  Emergencies or crimes in progress? Contact the PNP (911) first.{' '}
                  <Text style={styles.link} onPress={() => openMyReports()} accessibilityRole="link">My reports</Text>
                </Text>
              </>
            ) : (
              <>
                <View style={styles.summaryBox}>
                  <SummaryRow label="Reason" value={selected?.label ?? ''} strong />
                  <SummaryRow label="What happened" value={description.trim()} />
                  {incidentDate ? <SummaryRow label="Date" value={formatSafetyDate(incidentDate)} /> : null}
                  <SummaryRow label="Evidence" value={files.length ? files.map((file) => file.name).join(', ') : 'None attached'} />
                </View>

                <Pressable
                  onPress={() => { setAcknowledge((current) => !current); clearError('acknowledge') }}
                  style={styles.ackRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acknowledge }}
                >
                  <MaterialIcons name={acknowledge ? 'check-box' : 'check-box-outline-blank'} size={22} color={acknowledge ? colors.secondary : colors.subtle} />
                  <Text style={[styles.ackText, styles.flex]}>
                    I confirm this report is truthful to the best of my knowledge. I understand that submitting false or malicious reports violates i-PESO policies and may lead to action on my own account.
                  </Text>
                </Pressable>
                {errors.acknowledge ? <Text style={styles.error}>{errors.acknowledge}</Text> : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  )
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={strong ? styles.summaryValueStrong : styles.summaryValue}>{value}</Text>
    </View>
  )
}

/** Picked evidence with a remove button for each file. */
export function FileList({ files, onRemove }: { files: EvidenceFile[]; onRemove: (index: number) => void }) {
  if (!files.length) return null
  return (
    <View style={styles.fileList}>
      {files.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={styles.fileRow}>
          <MaterialIcons name={file.type === 'application/pdf' ? 'picture-as-pdf' : 'image'} size={18} color={colors.subtle} />
          <Text style={[styles.fileName, styles.flex]} numberOfLines={1} ellipsizeMode="middle">{file.name}</Text>
          {file.size ? <Text style={styles.hint}>{formatFileSize(file.size)}</Text> : null}
          <Pressable
            onPress={() => onRemove(index)}
            hitSlop={8}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${file.name}`}
          >
            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl },
  flex: { flex: 1 },
  center: { alignItems: 'center', paddingTop: spacing.md },
  doneLead: { ...textStyles.body, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
  doneText: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.md, textAlign: 'center' },
  caseNumber: { ...textStyles.bodyBold, color: colors.textPrimary },
  description: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  alert: { marginTop: spacing.sm },
  subjectBox: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sunken, borderRadius: radii.md, padding: spacing.md },
  subjectKicker: { ...textStyles.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subjectName: { ...textStyles.bodyBold, color: colors.textPrimary, marginTop: 2, flexShrink: 1 },
  subjectVacancy: { marginTop: spacing.xs },
  subjectMeta: { ...textStyles.small, color: colors.textSecondary, flexShrink: 1 },
  label: { ...textStyles.smallBold, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  required: { color: colors.error },
  optional: { ...textStyles.small, color: colors.textSecondary },
  muted: { ...textStyles.small, color: colors.textSecondary },
  categoryList: { gap: spacing.sm },
  categoryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minHeight: 44, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md },
  categoryRowActive: { borderColor: colors.errorBorder, backgroundColor: colors.errorBackground },
  categoryLabel: { ...textStyles.smallBold, color: colors.textPrimary },
  categoryHint: { ...textStyles.small, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  textArea: { ...textStyles.body, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, minHeight: 120, textAlignVertical: 'top' },
  inputError: { borderColor: colors.errorBorder, backgroundColor: colors.errorBackground },
  counterRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  hint: { ...textStyles.small, color: colors.textSecondary },
  error: { ...textStyles.small, color: colors.error, marginTop: spacing.xs },
  field: { marginTop: spacing.lg },
  clearDate: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  link: { ...textStyles.smallBold, color: colors.secondary },
  fileList: { gap: spacing.xs, marginTop: spacing.sm },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingLeft: spacing.md, minHeight: 44 },
  fileName: { ...textStyles.small, color: colors.textPrimary },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  attachRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  emergency: { ...textStyles.small, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  summaryBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.md, marginTop: spacing.md },
  summaryRow: {},
  summaryLabel: { ...textStyles.label, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { ...textStyles.small, color: colors.textPrimary, lineHeight: 18, marginTop: 2 },
  summaryValueStrong: { ...textStyles.smallBold, color: colors.textPrimary, marginTop: 2 },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg },
  ackText: { ...textStyles.small, color: colors.textPrimary, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1, marginBottom: 0 },
})
