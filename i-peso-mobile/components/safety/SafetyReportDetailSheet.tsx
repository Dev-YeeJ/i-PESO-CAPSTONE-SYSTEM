import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { EvidenceFile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import {
  addEvidence, DEFAULT_SAFETY_LIMITS, formatSafetyDate, MY_SAFETY_REPORTS_KEY, mySafetyReportKey, pickEvidence, safetyStatusBadge, SAFETY_OPTIONS_KEY,
} from '@/utils/safetyReports'
import { useToast } from '@/stores/toastStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, radii, spacing, textStyles } from '@/theme'
import { FileList } from './ReportConcernSheet'

// Rebuilt from ReportDetailDialog in i-peso-frontend/src/pages/shared/MySafetyReportsPage.jsx.
// Only the reporter-safe view the API returns: never PESO's notes, findings or actions.

/** One of the seeker's own cases. Mount only while open — state starts fresh each time. */
export function SafetyReportDetailSheet({ id, onClose }: { id: number | string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [details, setDetails] = useState('')
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [error, setError] = useState('')

  const { data: report, isLoading, isError } = useQuery({
    queryKey: mySafetyReportKey(id),
    queryFn: () => seekerService.mySafetyReport(id),
  })
  const { data: options } = useQuery({
    queryKey: SAFETY_OPTIONS_KEY,
    queryFn: () => seekerService.safetyReportOptions(),
    staleTime: 10 * 60_000,
  })
  const limits = options?.limits ?? DEFAULT_SAFETY_LIMITS

  const addDetails = useMutation({
    mutationFn: () => seekerService.addSafetyReportDetails(id, { details: details.trim() || null, attachments: files }),
    onSuccess: (data) => {
      queryClient.setQueryData(mySafetyReportKey(id), data.report)
      queryClient.invalidateQueries({ queryKey: MY_SAFETY_REPORTS_KEY })
      setDetails('')
      setFiles([])
      setError('')
      showToast(data.message, 'success')
    },
    onError: (caught) => setError(apiErrorMessage(caught, 'Your information could not be added.')),
  })

  // The case's file limit counts what it already holds.
  const capacity = Math.max(0, limits.max_attachments - (report?.attachments?.length ?? 0))
  const slotsLeft = Math.max(0, capacity - files.length)

  const attach = async (kind: 'photo' | 'pdf') => {
    try {
      const file = await pickEvidence(kind)
      if (!file) return
      const next = addEvidence(files, file, limits, capacity)
      setFiles(next.files)
      setError(next.problem ?? '')
    } catch (caught) {
      setError((caught as Error).message)
    }
  }

  const submitDetails = () => {
    const text = details.trim()
    if (text.length > 0 && text.length < 10) {
      setError('Add a little more detail (at least 10 characters).')
      return
    }
    if (!text && files.length === 0) {
      setError('Write the new information or attach a file.')
      return
    }
    addDetails.mutate()
  }

  const close = () => { if (!addDetails.isPending) onClose() }

  return (
    <BottomSheet
      visible
      onClose={close}
      title={report ? `Report about ${report.subject_name ?? 'this employer'}` : 'Safety report'}
      heightRatio={0.92}
      footer={<Button variant="outline" fullWidth onPress={close}>Close</Button>}
    >
      {isLoading ? (
        <ScreenSkeleton label="Loading report" />
      ) : isError || !report ? (
        <Text style={styles.bodyText}>This report could not be opened. It may belong to a different account.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.headRow}>
            <Badge variant={safetyStatusBadge(report.status)}>{report.status_label}</Badge>
          </View>
          <Text style={styles.meta}>
            Case <Text style={styles.caseNumber}>{report.case_number}</Text> · filed {formatSafetyDate(report.created_at, true)}
          </Text>

          {/* Blue while open, plain once closed (resolved or dismissed), as on the website. */}
          {report.is_open ? (
            <AlertBox variant="info" icon={false} style={styles.alert}>{report.outcome_message}</AlertBox>
          ) : (
            <View style={[styles.alert, styles.closedOutcome]}><Text style={styles.bodyText}>{report.outcome_message}</Text></View>
          )}

          <Row label="Reason"><Text style={styles.strong}>{report.category_label}</Text></Row>
          {report.vacancy_title ? <Row label="Job vacancy"><Text style={styles.bodyText}>{report.vacancy_title}</Text></Row> : null}
          {report.incident_date ? <Row label="Date of incident"><Text style={styles.bodyText}>{formatSafetyDate(report.incident_date)}</Text></Row> : null}
          <Row label="What you reported">
            <View style={styles.quote}><Text style={styles.bodyText}>{report.description}</Text></View>
          </Row>
          {report.attachments?.length ? (
            <Row label="Evidence sent">
              {report.attachments.map((file) => (
                <View key={file.id} style={styles.inline}>
                  <MaterialIcons name="description" size={16} color={colors.subtle} />
                  <Text style={[styles.bodyText, styles.flex]} numberOfLines={1}>{file.name}</Text>
                </View>
              ))}
            </Row>
          ) : null}
          {report.updates?.length ? (
            <Row label="Information you added">
              {report.updates.map((update, index) => (
                <View key={index} style={styles.updateCard}>
                  <Text style={styles.meta}>
                    {formatSafetyDate(update.created_at, true)}{update.attachments ? ` · ${update.attachments} file(s)` : ''}
                  </Text>
                  {update.body ? <Text style={[styles.bodyText, styles.updateBody]}>{update.body}</Text> : null}
                </View>
              ))}
            </Row>
          ) : null}

          {report.is_open ? (
            <View style={styles.addBox}>
              <Text style={styles.addTitle}>Add new information</Text>
              <TextInput
                style={styles.textArea}
                value={details}
                onChangeText={(text) => { setDetails(text); setError('') }}
                multiline
                maxLength={3000}
                placeholder="Something new happened, or you remembered a detail? Add it here."
                placeholderTextColor={colors.subtle}
                accessibilityLabel="Add new information"
              />
              <FileList files={files} onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))} />
              {slotsLeft > 0 ? (
                <View style={styles.attachRow}>
                  <Button variant="outline" size="sm" onPress={() => attach('photo')}>Add photo</Button>
                  <Button variant="outline" size="sm" onPress={() => attach('pdf')}>Add PDF</Button>
                </View>
              ) : (
                <Text style={styles.meta}>This case has the maximum number of files.</Text>
              )}
              <View style={styles.inline}>
                <MaterialIcons name="lock" size={14} color={colors.textSecondary} />
                <Text style={[styles.meta, styles.flex]}>Only PESO administrators can see what you add.</Text>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button onPress={submitDetails} loading={addDetails.isPending} style={styles.addBtn}>Add to case</Button>
            </View>
          ) : null}
        </ScrollView>
      )}
    </BottomSheet>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl },
  flex: { flex: 1 },
  headRow: { flexDirection: 'row' },
  meta: { ...textStyles.small, color: colors.textSecondary, marginTop: spacing.xs },
  caseNumber: { ...textStyles.smallBold, color: colors.textPrimary },
  alert: { marginTop: spacing.md, padding: spacing.md },
  closedOutcome: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sunken, borderRadius: radii.lg },
  row: { marginTop: spacing.lg },
  rowLabel: { ...textStyles.label, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { marginTop: spacing.xs, gap: spacing.xs },
  strong: { ...textStyles.smallBold, color: colors.textPrimary },
  bodyText: { ...textStyles.small, color: colors.textPrimary, lineHeight: 18 },
  quote: { backgroundColor: colors.sunken, borderRadius: radii.md, padding: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  updateCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md },
  updateBody: { marginTop: spacing.xs },
  addBox: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  addTitle: { ...textStyles.smallBold, color: colors.textPrimary },
  textArea: { ...textStyles.body, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, minHeight: 96, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', gap: spacing.sm },
  error: { ...textStyles.small, color: colors.error },
  addBtn: { marginTop: spacing.xs },
})
