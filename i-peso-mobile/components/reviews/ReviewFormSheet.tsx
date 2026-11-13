import { useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { OwnReview, ReviewType } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { aspectsFor, MY_REVIEWS_KEY, REVIEW_GUIDELINES_URL, type ReviewAction } from '@/utils/reviews'
import { useToast } from '@/stores/toastStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { colors, radii, spacing, textStyles } from '@/theme'
import { StarInput } from './StarRating'

// Rebuilt from i-peso-frontend/src/components/reviews/ReviewFormDialog.jsx — same fields,
// hints, notes, client checks and server error mapping.
const HINTS: Record<string, string> = {
  communication: 'Did they keep you informed and reply on time?',
  process: 'Was it organized and fair?',
  professionalism: 'Were you treated with respect?',
  posting_accuracy: 'Did the job posting describe the job honestly?',
  work_environment: 'Safety, cleanliness, how coworkers treat each other.',
  management: 'How supervisors communicate and treat staff.',
  job_accuracy: 'Pay, duties and schedule compared with the posting.',
  overall: 'Your experience working there so far.',
}

type FieldErrors = Record<string, string | undefined>

interface ReviewFormSheetProps {
  /** Write a new review for this open action… */
  target?: ReviewAction | null
  /** …or edit the seeker's own review. */
  existing?: OwnReview | null
  onClose: () => void
  /** Called after a successful save (the toast and cache refresh are already done). */
  onSaved?: (result: { message: string; review: OwnReview }) => void
}

/**
 * Write or edit a review. Mount it only while open (`{target && <ReviewFormSheet … />}`):
 * the form state is initialised from the props once.
 */
export function ReviewFormSheet({ target, existing, onClose, onSaved }: ReviewFormSheetProps) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const isEdit = !!existing
  const type: ReviewType = existing?.type ?? target?.type ?? 'recruitment'
  const limited = existing?.limited ?? target?.limited ?? false
  const aspects = aspectsFor(type, limited)
  const employment = type === 'employment'

  const [ratings, setRatings] = useState<Record<string, number>>(() => ({ ...(existing?.ratings_map ?? {}) }))
  const [recommend, setRecommend] = useState<boolean | null>(existing ? existing.recommend : null)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [agree, setAgree] = useState(isEdit)
  const [confirmStarted, setConfirmStarted] = useState(isEdit)
  const [errors, setErrors] = useState<FieldErrors>({})

  const clearError = (key: string) => setErrors((current) => ({ ...current, [key]: undefined }))

  const save = useMutation({
    mutationFn: () => {
      const body = { ratings, recommend: recommend as boolean, comment: comment.trim() || null }
      if (existing) return seekerService.updateReview(existing.id, body)
      if (!target) throw new Error('Nothing to review.')
      return seekerService.submitReview({
        ...body,
        type,
        ...(target.source === 'placement' ? { placement_record_id: target.sourceId } : { application_id: target.sourceId }),
        agree_guidelines: agree,
        ...(employment ? { confirm_started: confirmStarted } : {}),
      })
    },
    onSuccess: (data) => {
      showToast(data.message, 'success')
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY })
      queryClient.invalidateQueries({ queryKey: ['seeker', 'employer-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['seeker', 'employer-ratings'] })
      onSaved?.(data)
      onClose()
    },
    onError: (caught) => {
      const body = (caught as AxiosError<{ errors?: Record<string, string[]> }>)?.response?.data
      const fieldErrors = Object.fromEntries(Object.entries(body?.errors ?? {}).map(([key, messages]) => [key, messages?.[0]]))
      setErrors(Object.keys(fieldErrors).length
        ? fieldErrors
        : { form: apiErrorMessage(caught, 'Your review could not be saved. Please try again.') })
    },
  })

  const close = () => {
    if (!save.isPending) onClose()
  }

  const submit = () => {
    const next: FieldErrors = {}
    Object.entries(aspects).forEach(([key, label]) => {
      if (!ratings[key]) next[`ratings.${key}`] = `Rate ${label.toLowerCase()}.`
    })
    if (recommend === null) next.recommend = 'Choose yes or no.'
    if (!isEdit && !agree) next.agree_guidelines = 'Please confirm your review follows the guidelines.'
    if (!isEdit && employment && !confirmStarted) next.confirm_started = 'Please confirm that you started working here.'
    setErrors(next)
    if (!Object.values(next).some(Boolean)) save.mutate()
  }

  const employerName = existing?.employer?.name ?? target?.employerName ?? 'this employer'
  const jobTitle = existing?.job_title ?? target?.jobTitle
  const openGuidelines = () => { Linking.openURL(REVIEW_GUIDELINES_URL).catch(() => undefined) }

  return (
    <BottomSheet
      visible
      onClose={close}
      title={`${employment ? 'Rate working at' : 'Rate applying to'} ${employerName}`}
      heightRatio={0.92}
      footer={
        <View style={styles.actions}>
          <Button variant="outline" onPress={close} disabled={save.isPending} style={styles.actionBtn}>Cancel</Button>
          <Button variant="primary" onPress={submit} loading={save.isPending} style={styles.actionBtn}>
            {isEdit ? 'Save changes' : 'Submit review'}
          </Button>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>
          {jobTitle ? `${jobTitle} · ` : ''}{employment ? 'Employment experience' : 'Recruitment experience'}
        </Text>

        <View style={styles.anonNote}>
          <MaterialIcons name="verified-user" size={16} color={colors.info} style={styles.noteIcon} />
          <Text style={styles.anonText}>
            Your name is never shown. Others see you as a{' '}
            <Text style={styles.strong}>{employment ? 'Verified employee' : 'Verified applicant'}</Text>.
            {!employment ? ' Rate how the hiring was handled, not whether you got the job.' : ''}
          </Text>
        </View>
        {limited ? (
          <AlertBox variant="info" style={styles.alert}>
            The employer hasn&apos;t responded to your application, so you can rate their communication and the job posting.
          </AlertBox>
        ) : null}
        {errors.form ? <AlertBox variant="danger" style={styles.alert}>{errors.form}</AlertBox> : null}
        {errors.type ? <AlertBox variant="danger" style={styles.alert}>{errors.type}</AlertBox> : null}

        {Object.entries(aspects).map(([key, label]) => (
          <View key={key} style={styles.field}>
            <StarInput
              label={label}
              value={ratings[key] ?? 0}
              onChange={(value) => { setRatings((current) => ({ ...current, [key]: value })); clearError(`ratings.${key}`) }}
              error={errors[`ratings.${key}`]}
              disabled={save.isPending}
            />
            <Text style={styles.hint}>{HINTS[key]}</Text>
          </View>
        ))}

        <View style={styles.field}>
          <Text style={styles.legend}>{employment ? 'Would you recommend working here?' : 'Would you recommend applying here?'}</Text>
          <View style={styles.choiceRow} accessibilityRole="radiogroup">
            {([[true, 'Yes'], [false, 'No']] as const).map(([value, text]) => {
              const selected = recommend === value
              return (
                <Pressable
                  key={text}
                  onPress={() => { setRecommend(value); clearError('recommend') }}
                  disabled={save.isPending}
                  style={[styles.choice, selected && styles.choiceSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={text}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{text}</Text>
                </Pressable>
              )
            })}
          </View>
          {errors.recommend ? <Text style={styles.error}>{errors.recommend}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.legend}>
            Your experience <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            value={comment}
            onChangeText={setComment}
            editable={!save.isPending}
            multiline
            maxLength={2000}
            placeholder={employment ? 'What is it like to work there?' : 'What went well, and what could be better?'}
            placeholderTextColor={colors.subtle}
            accessibilityLabel="Your experience (optional)"
          />
          <View style={styles.commentMeta}>
            <Text style={[styles.hint, styles.commentHint]}>Don&apos;t include names, phone numbers or other personal details.</Text>
            <Text style={styles.hint}>{comment.length}/2000</Text>
          </View>
          {errors.comment ? <Text style={styles.error}>{errors.comment}</Text> : null}
        </View>

        {!isEdit ? (
          <View style={styles.confirmBox}>
            {employment ? (
              <Checkbox
                checked={confirmStarted}
                onToggle={() => { setConfirmStarted((current) => !current); clearError('confirm_started') }}
                label="I started working for this employer."
              >
                <Text style={styles.checkText}>I started working for this employer.</Text>
              </Checkbox>
            ) : null}
            {errors.confirm_started ? <Text style={styles.error}>{errors.confirm_started}</Text> : null}
            <Checkbox
              checked={agree}
              onToggle={() => { setAgree((current) => !current); clearError('agree_guidelines') }}
              label="This is my honest experience and follows the community guidelines."
              onOpenLink={openGuidelines}
            >
              <Text style={styles.checkText}>
                This is my honest experience and follows the{' '}
                <Text style={styles.link} onPress={openGuidelines} accessibilityRole="link">community guidelines</Text>: no insults, discrimination,
                accusations I can&apos;t back up, or anyone&apos;s personal information. PESO can hide reviews that break them.
              </Text>
            </Checkbox>
            {errors.agree_guidelines ? <Text style={styles.error}>{errors.agree_guidelines}</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  )
}

function Checkbox({ checked, onToggle, label, onOpenLink, children }: {
  checked: boolean
  onToggle: () => void
  label: string
  /** The row's label hides an inline link from screen readers; this exposes it as an action. */
  onOpenLink?: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      accessibilityActions={onOpenLink ? [{ name: 'activate' }, { name: 'openLink', label: 'Open community guidelines' }] : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'openLink') onOpenLink?.()
        else if (event.nativeEvent.actionName === 'activate') onToggle()
      }}
    >
      <MaterialIcons name={checked ? 'check-box' : 'check-box-outline-blank'} size={22} color={checked ? colors.secondary : colors.subtle} />
      <View style={styles.checkBody}>{children}</View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  description: { ...textStyles.small, color: colors.textSecondary, marginBottom: spacing.md },
  anonNote: { flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, borderRadius: radii.md, padding: spacing.md },
  noteIcon: { marginTop: 1 },
  anonText: { ...textStyles.small, color: colors.textPrimary, flex: 1, lineHeight: 18 },
  strong: { ...textStyles.smallBold, color: colors.textPrimary },
  alert: { marginTop: spacing.md },
  field: { marginTop: spacing.lg },
  legend: { ...textStyles.smallBold, color: colors.textPrimary },
  optional: { ...textStyles.small, color: colors.textSecondary },
  hint: { ...textStyles.small, color: colors.textSecondary, marginTop: 2 },
  error: { ...textStyles.small, color: colors.error, marginTop: spacing.xs },
  choiceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  choice: { minHeight: 44, minWidth: 72, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  choiceSelected: { borderColor: colors.blue700, backgroundColor: colors.blue700 },
  choiceText: { ...textStyles.smallBold, color: colors.textPrimary },
  choiceTextSelected: { color: colors.white },
  textArea: { ...textStyles.body, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, minHeight: 104, textAlignVertical: 'top' },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  commentHint: { flex: 1 },
  confirmBox: { marginTop: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sunken, borderRadius: radii.md, padding: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minHeight: 44 },
  checkBody: { flex: 1, paddingTop: 2 },
  checkText: { ...textStyles.small, color: colors.textPrimary, lineHeight: 18 },
  link: { ...textStyles.smallBold, color: colors.secondary, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1, marginBottom: 0 },
})
