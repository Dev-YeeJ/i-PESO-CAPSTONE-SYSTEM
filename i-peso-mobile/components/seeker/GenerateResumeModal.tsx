import { StyleSheet, Text, TextInput, View } from 'react-native'
import { AlertBox } from '@/components/ui/AlertBox'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { colors, radii, spacing, typography } from '@/theme'

interface GenerateResumeModalProps {
  visible: boolean
  onClose: () => void
  summary: string
  onChangeSummary: (value: string) => void
  aiSummaryBusy: boolean
  aiSummaryNotice: string
  actionError: string
  resumeBusy: boolean
  onGenerateSummaryAI: () => void
  onGenerate: () => void
}

/** The summary-writing step of resume generation — shared by the Profile screen's quick
 * "Generate resume" button and the Resume Studio screen's "Generate & Download" CTA, so
 * there is exactly one place this flow is implemented. */
export function GenerateResumeModal({
  visible,
  onClose,
  summary,
  onChangeSummary,
  aiSummaryBusy,
  aiSummaryNotice,
  actionError,
  resumeBusy,
  onGenerateSummaryAI,
  onGenerate,
}: GenerateResumeModalProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Generate Resume"
      heightRatio={0.85}
      footer={
        <View style={styles.modalActions}>
          <Button variant="outline" onPress={onClose} style={styles.modalBtn}>
            Cancel
          </Button>
          <Button variant="primary" onPress={onGenerate} disabled={resumeBusy} loading={resumeBusy} style={styles.modalBtn}>
            Generate
          </Button>
        </View>
      }
    >
      <Text style={styles.modalHint}>Write a short professional summary (max 1200 characters). It will appear at the top of your generated PDF resume.</Text>
      <TextInput
        style={styles.modalTextarea}
        value={summary}
        onChangeText={onChangeSummary}
        placeholder="e.g. Detail-oriented administrative professional with 3 years of experience..."
        placeholderTextColor={colors.subtle}
        multiline
        maxLength={1200}
      />
      <Button variant="outline" onPress={onGenerateSummaryAI} disabled={aiSummaryBusy} loading={aiSummaryBusy} style={styles.aiSummaryBtn}>
        Generate with Smart Assistant
      </Button>
      {aiSummaryNotice ? (
        <AlertBox variant="info" style={styles.modalError}>
          {aiSummaryNotice}
        </AlertBox>
      ) : null}
      {actionError ? (
        <AlertBox variant="danger" style={styles.modalError}>
          {actionError}
        </AlertBox>
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  modalHint: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18, marginBottom: spacing.md },
  modalTextarea: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, minHeight: 120, textAlignVertical: 'top', color: colors.textPrimary, fontSize: typography.body },
  aiSummaryBtn: { marginTop: spacing.md, marginBottom: 0 },
  modalError: { marginTop: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, marginBottom: 0 },
})
