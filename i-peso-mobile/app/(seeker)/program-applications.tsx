import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as DocumentPicker from 'expo-document-picker'
import type { GovernmentProgramApplication, ProgramDocument } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { downloadAndShare } from '@/utils/fileTransfer'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { colors, radii, spacing, typography } from '@/theme'

function statusVariant(status?: string | null): 'success' | 'danger' | 'info' | 'neutral' {
  const value = textFrom(status, '').toLowerCase()
  if (['completed', 'approved'].includes(value)) return 'success'
  if (['rejected', 'cancelled'].includes(value)) return 'danger'
  if (['pending', 'under_review', 'for_interview', 'qualified'].includes(value)) return 'info'
  return 'neutral'
}

export default function ProgramApplicationsScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const { data: applications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['programApplications'],
    queryFn: () => seekerService.getProgramApplications(),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="My Applications" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Upskill Hub</Text>
        <Text style={styles.subtitle}>Track the status of the government programs you&apos;ve applied to.</Text>

        <QueryState
          isLoading={isLoading}
          error={error}
          errorFallback="Unable to load your program applications."
          isEmpty={!applications.length}
          emptyIcon="assignment"
          emptyTitle="You haven't applied to any programs yet"
          emptyAction={
            <Button variant="outline" onPress={() => router.push('/(seeker)/upskill-hub')} style={styles.emptyBtn}>
              Browse Upskill Hub
            </Button>
          }
        >
          {applications.map((application) => (
            <ApplicationCard key={String(application.application_id)} application={application} />
          ))}
        </QueryState>
      </ScrollView>
    </View>
  )
}

function ApplicationCard({ application }: { application: GovernmentProgramApplication }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [documentType, setDocumentType] = useState<'requirement' | 'certificate'>('requirement')
  const [documentName, setDocumentName] = useState('')
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null)
  const [formError, setFormError] = useState('')
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)
  const [viewError, setViewError] = useState('')

  const canUploadCertificate = application.status === 'completed' && !application.certificate

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!pickedFile) throw new Error('no-file')
      return seekerService.uploadProgramDocument(
        application.application_id,
        pickedFile.uri,
        pickedFile.mimeType,
        pickedFile.name,
        { document_type: documentType, document_name: documentName.trim() }
      )
    },
    onSuccess: () => {
      setFormError('')
      setDocumentName('')
      setPickedFile(null)
      setExpanded(false)
      queryClient.invalidateQueries({ queryKey: ['programApplications'] })
    },
    onError: (caught: unknown) => {
      const body = (caught as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
      const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
      setFormError(firstError || body?.message || 'Unable to upload this document. Please try again.')
    },
  })

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
    if (result.canceled || !result.assets?.length) return
    const asset = result.assets[0]
    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' })
  }

  const submitUpload = () => {
    setFormError('')
    if (!documentName.trim()) {
      setFormError('Enter a document name.')
      return
    }
    if (!pickedFile) {
      setFormError('Choose a file to upload.')
      return
    }
    uploadMutation.mutate()
  }

  const viewDocument = async (doc: ProgramDocument) => {
    setViewError('')
    setViewingDocId(String(doc.document_id))
    try {
      await downloadAndShare(
        seekerService.programDocumentUrl(application.application_id, doc.document_id),
        doc.original_filename || doc.document_name
      )
    } catch {
      setViewError('Unable to open this document. Please try again.')
    } finally {
      setViewingDocId(null)
    }
  }

  const documents = application.documents ?? []

  return (
    <Card padding="md" style={styles.appCard}>
      <View style={styles.appHeader}>
        <Text style={styles.appTitle} numberOfLines={2}>{textFrom(application.program?.title, 'Program')}</Text>
        <Badge variant={statusVariant(application.status)}>{titleCase(application.status, 'Pending')}</Badge>
      </View>

      <Text style={styles.appMeta}>Applied: {formatDate(application.applied_at)}</Text>

      {application.remarks ? (
        <View style={styles.remarksBox}>
          <Text style={styles.remarksLabel}>Remarks</Text>
          <Text style={styles.remarksText}>{application.remarks}</Text>
        </View>
      ) : null}

      {application.certificate ? (
        <View style={styles.certificateRow}>
          <MaterialIcons name="workspace-premium" size={18} color={colors.success} />
          <Text style={styles.certificateText}>{textFrom(application.certificate.title, 'Certificate issued')}</Text>
        </View>
      ) : null}

      {documents.length > 0 && (
        <View style={styles.documentsSection}>
          <Text style={styles.documentsTitle}>Documents</Text>
          {documents.map((doc) => (
            <View key={String(doc.document_id)} style={styles.documentRow}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName} numberOfLines={1}>{textFrom(doc.document_name, 'Document')}</Text>
                <Text style={styles.documentType}>{titleCase(doc.document_type, '')}</Text>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => viewDocument(doc)}
                disabled={viewingDocId === String(doc.document_id)}
              >
                {viewingDocId === String(doc.document_id) ? 'Opening...' : 'View'}
              </Button>
            </View>
          ))}
        </View>
      )}

      {viewError ? <AlertBox variant="danger" style={styles.alertBox}>{viewError}</AlertBox> : null}

      <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.toggleRow}>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.info} />
        <Text style={styles.toggleText}>{expanded ? 'Cancel upload' : 'Upload document'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.uploadForm}>
          <View style={styles.typeRow}>
            <TypeChip label="Requirement" active={documentType === 'requirement'} onPress={() => setDocumentType('requirement')} />
            {canUploadCertificate ? (
              <TypeChip label="Certificate" active={documentType === 'certificate'} onPress={() => setDocumentType('certificate')} />
            ) : null}
          </View>

          <TextInput
            style={styles.input}
            value={documentName}
            onChangeText={setDocumentName}
            placeholder="Document name (e.g. Barangay Certificate)"
            placeholderTextColor={colors.subtle}
          />

          <Button variant="outline" onPress={pickFile} style={styles.pickBtn}>
            {pickedFile ? pickedFile.name : 'Choose File'}
          </Button>

          {formError ? <AlertBox variant="danger" style={styles.alertBox}>{formError}</AlertBox> : null}

          <Button
            variant="success"
            onPress={submitUpload}
            disabled={uploadMutation.isPending}
            style={styles.submitBtn}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Submit Document'}
          </Button>
        </View>
      )}
    </Card>
  )
}

function TypeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.typeChip, active && styles.typeChipActive]} onPress={onPress}>
      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  alertBox: { marginTop: spacing.md },
  emptyBtn: { marginBottom: 0 },
  appCard: { marginBottom: spacing.md },
  appHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  appTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.title, lineHeight: 22, fontFamily: typography.family.bold },
  appMeta: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs },
  remarksBox: { backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  remarksLabel: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  remarksText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
  certificateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  certificateText: { color: colors.success, fontSize: typography.small, fontFamily: typography.family.bold },
  documentsSection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  documentsTitle: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  documentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  documentInfo: { flex: 1, marginRight: spacing.sm },
  documentName: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  documentType: { color: colors.textSecondary, fontSize: typography.label, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  toggleText: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold },
  uploadForm: { marginTop: spacing.md, gap: spacing.sm },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  typeChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  typeChipText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  typeChipTextActive: { color: colors.white },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: typography.body },
  pickBtn: { marginBottom: 0 },
  submitBtn: { marginBottom: 0 },
})
