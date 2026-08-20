import { useState } from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import type { EmployerReportReason } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { AlertBox } from '@/components/ui/AlertBox'
import { Button } from '@/components/ui/Button'
import { colors, radii, spacing, typography } from '@/theme'

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
      Alert.alert('Report submitted', data.message)
    },
  })

  const descriptionValid = description.trim().length >= 10 && description.trim().length <= 2000
  const canSubmit = Boolean(reason) && descriptionValid && !reportMutation.isPending

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeModal}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Report {employerName || 'this employer'}</Text>
          <Text style={styles.subtitle}>PESO will review your report. This does not withdraw any application you&apos;ve submitted.</Text>

          <ScrollView style={styles.scroll}>
            <Text style={styles.label}>Reason</Text>
            <View style={styles.reasonList}>
              {REASONS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.reasonChip, reason === item.value && styles.reasonChipActive]}
                  onPress={() => setReason(item.value)}
                >
                  <Text style={[styles.reasonText, reason === item.value && styles.reasonTextActive]}>{item.label}</Text>
                </TouchableOpacity>
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

          <View style={styles.actions}>
            <Button variant="outline" onPress={closeModal} style={styles.actionBtn}>Cancel</Button>
            <Button
              variant="danger"
              onPress={() => reportMutation.mutate()}
              disabled={!canSubmit}
              style={styles.actionBtn}
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, maxHeight: '85%' },
  title: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  subtitle: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.md },
  scroll: { flexGrow: 0 },
  label: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: spacing.md, marginBottom: spacing.sm },
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  reasonChipActive: { backgroundColor: colors.errorBackground, borderColor: colors.error },
  reasonText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium },
  reasonTextActive: { color: colors.error, fontFamily: typography.family.bold },
  textArea: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body, minHeight: 100, textAlignVertical: 'top' },
  counter: { color: colors.subtle, fontSize: typography.small, textAlign: 'right', marginTop: spacing.xs },
  alertBox: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: { flex: 1, marginBottom: 0 },
})
