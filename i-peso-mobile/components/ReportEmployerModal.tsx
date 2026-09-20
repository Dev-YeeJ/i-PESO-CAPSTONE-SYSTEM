import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import type { EmployerReportReason } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { useToast } from '@/stores/toastStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PressableScale } from '@/components/ui/PressableScale'
import { colors, radii, spacing, textStyles } from '@/theme'

const REASONS: Array<{ value: EmployerReportReason; label: string }> = [
  { value: 'fake_job', label: 'Fake job posting' },
  { value: 'misleading', label: 'Misleading information' },
  { value: 'abusive', label: 'Abusive behavior' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'illegal_fees', label: 'Illegal fees requested' },
  { value: 'other', label: 'Other' },
]

interface ReportEmployerModalProps {
  visible: boolean
  employerId: number | string | null
  employerName?: string
  onClose: () => void
}

export function ReportEmployerModal({ visible, employerId, employerName, onClose }: ReportEmployerModalProps) {
  const [reason, setReason] = useState<EmployerReportReason | null>(null)
  const [description, setDescription] = useState('')
  const { showToast } = useToast()

  const reset = () => {
    setReason(null)
    setDescription('')
  }

  const closeModal = () => {
    reset()
    onClose()
  }

  const reportMutation = useMutation({
    mutationFn: () => seekerService.reportEmployer(employerId as number | string, { reason: reason as EmployerReportReason, description: description.trim() }),
    onSuccess: (data) => {
      closeModal()
      showToast(data.message, 'success')
    },
  })

  const descriptionValid = description.trim().length >= 10 && description.trim().length <= 2000
  const canSubmit = Boolean(reason) && descriptionValid && !reportMutation.isPending

  return (
    <BottomSheet
      visible={visible}
      onClose={closeModal}
      title={`Report ${employerName || 'this employer'}`}
      heightRatio={0.75}
      footer={
        <View style={styles.actions}>
          <Button variant="outline" onPress={closeModal} style={styles.actionBtn}>Cancel</Button>
          <Button
            variant="danger"
            onPress={() => reportMutation.mutate()}
            disabled={!canSubmit}
            loading={reportMutation.isPending}
            style={styles.actionBtn}
          >
            Submit Report
          </Button>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>PESO will review your report. This does not withdraw any application you&apos;ve submitted.</Text>

        <Text style={styles.label}>Reason</Text>
        <View style={styles.reasonList}>
          {REASONS.map((item) => (
            <PressableScale
              key={item.value}
              scaleTo="buttonPress"
              ripple={null}
              style={[styles.reasonChip, reason === item.value && styles.reasonChipActive]}
              onPress={() => setReason(item.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: reason === item.value }}
            >
              <Text style={[styles.reasonText, reason === item.value && styles.reasonTextActive]}>{item.label}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what happened (minimum 10 characters)"
          placeholderTextColor={colors.subtle}
          multiline
          numberOfLines={5}
          maxLength={2000}
        />
        <Text style={styles.counter}>{description.trim().length}/2000</Text>

        {reportMutation.isError ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            {apiErrorMessage(reportMutation.error, 'Unable to submit your report. Please try again.')}
          </AlertBox>
        ) : null}
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetBody: { paddingBottom: spacing.xl },
  subtitle: { ...textStyles.small, color: colors.textSecondary, marginBottom: spacing.md },
  label: { ...textStyles.smallBold, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  reasonChipActive: { backgroundColor: colors.errorBackground, borderColor: colors.error },
  reasonText: { ...textStyles.smallMedium, color: colors.textSecondary },
  reasonTextActive: { ...textStyles.smallBold, color: colors.error },
  textArea: { ...textStyles.body, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, minHeight: 100, textAlignVertical: 'top' },
  counter: { ...textStyles.small, color: colors.subtle, textAlign: 'right', marginTop: spacing.xs },
  alertBox: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1, marginBottom: 0 },
})
