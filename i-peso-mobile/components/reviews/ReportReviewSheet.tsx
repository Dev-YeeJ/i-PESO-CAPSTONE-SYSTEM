import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import type { PublicReview, ReviewReportReason } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { REVIEW_GUIDELINES_URL } from '@/utils/reviews'
import { useToast } from '@/stores/toastStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PressableScale } from '@/components/ui/PressableScale'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/components/reviews/ReportReviewDialog.jsx, in the
// ReportEmployerModal bottom-sheet pattern. Labels match the website ("Something else").
const REASONS: { value: ReviewReportReason; label: string }[] = [
  { value: 'false_information', label: 'False or misleading' },
  { value: 'not_genuine', label: 'Not a real experience' },
  { value: 'harassment', label: 'Harassment or insults' },
  { value: 'personal_information', label: 'Shares personal information' },
  { value: 'discrimination', label: 'Discriminatory' },
  { value: 'other', label: 'Something else' },
]

interface ReportReviewSheetProps {
  review: PublicReview
  onClose: () => void
}

/** Another job seeker flags a review for PESO to check. Mount only while open. */
export function ReportReviewSheet({ review, onClose }: ReportReviewSheetProps) {
  const [reason, setReason] = useState<ReviewReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const send = useMutation({
    mutationFn: () => seekerService.reportReview(review.id, { reason: reason as ReviewReportReason, details: details.trim() || null }),
    onSuccess: (res) => {
      showToast(res.message, 'success')
      onClose()
    },
    onError: (caught) => setError(apiErrorMessage(caught, 'The report could not be sent.')),
  })

  const close = () => {
    if (!send.isPending) onClose()
  }

  return (
    <BottomSheet
      visible
      onClose={close}
      title="Report this review"
      heightRatio={0.78}
      footer={
        <View style={styles.actions}>
          <Button variant="outline" onPress={close} disabled={send.isPending} style={styles.actionBtn}>Cancel</Button>
          <Button
            variant="danger"
            onPress={() => (reason ? send.mutate() : setError('Choose a reason.'))}
            loading={send.isPending}
            style={styles.actionBtn}
          >
            Send report
          </Button>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>
          PESO will look at it. Reviews stay up unless they break the{' '}
          <Text
            style={styles.link}
            onPress={() => { Linking.openURL(REVIEW_GUIDELINES_URL).catch(() => undefined) }}
            accessibilityRole="link"
          >
            community guidelines
          </Text>.
        </Text>

        {error ? <AlertBox variant="danger" style={styles.alertBox}>{error}</AlertBox> : null}

        <Text style={styles.label}>What&apos;s wrong with it?</Text>
        <View style={styles.reasonList} accessibilityRole="radiogroup" accessibilityLabel="What's wrong with it?">
          {REASONS.map((item) => {
            const selected = reason === item.value
            return (
              <PressableScale
                key={item.value}
                scaleTo="buttonPress"
                ripple={null}
                style={[styles.reasonChip, selected && styles.reasonChipActive]}
                onPress={() => { setReason(item.value); setError('') }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={item.label}
              >
                <Text style={[styles.reasonText, selected && styles.reasonTextActive]}>{item.label}</Text>
              </PressableScale>
            )
          })}
        </View>

        <Text style={styles.label}>
          Details <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.textArea}
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={4}
          maxLength={1000}
          placeholderTextColor={colors.subtle}
          accessibilityLabel="Details (optional)"
        />
        <Text style={styles.counter}>{details.length}/1000</Text>
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetBody: { paddingBottom: spacing.xl },
  subtitle: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.sm },
  link: { ...textStyles.smallBold, color: colors.secondary, textDecorationLine: 'underline' },
  label: { ...textStyles.smallBold, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  optional: { ...textStyles.small, color: colors.textSecondary },
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.pill, paddingHorizontal: spacing.md },
  reasonChipActive: { backgroundColor: colors.errorBackground, borderColor: colors.error },
  reasonText: { ...textStyles.smallMedium, color: colors.textSecondary },
  reasonTextActive: { ...textStyles.smallBold, color: colors.error },
  textArea: { ...textStyles.body, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, minHeight: 96, textAlignVertical: 'top' },
  counter: { ...textStyles.small, color: colors.subtle, textAlign: 'right', marginTop: spacing.xs },
  alertBox: { marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1, marginBottom: 0 },
})
