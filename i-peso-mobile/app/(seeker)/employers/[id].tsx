import { useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { apiErrorMessage } from '@/utils/apiError'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ReportEmployerModal } from '@/components/ReportEmployerModal'
import { colors, radii, spacing, typography } from '@/theme'

export default function EmployerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [reportOpen, setReportOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['employerProfile', id],
    queryFn: () => seekerService.getEmployerProfile(id as string),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Employer Profile" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.info} size="large" />
        </View>
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Employer Profile" onBack={() => router.back()} />
        <View style={styles.center}>
          <MaterialIcons name="business" size={48} color={colors.subtle} />
          <Text style={styles.notFoundTitle}>Employer Not Found</Text>
          <AlertBox variant="warning" style={styles.alertBox}>
            {error ? apiErrorMessage(error, 'Unable to load this employer profile.') : 'Unable to load this employer profile.'}
          </AlertBox>
          <Button variant="outline" onPress={() => router.back()}>Go Back</Button>
        </View>
      </View>
    )
  }

  const { employer, vacancies } = data

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Employer Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {employer.company_logo_url ? (
              <Image source={{ uri: employer.company_logo_url }} style={styles.logo} />
            ) : (
              <MaterialIcons name="business" size={36} color={colors.subtle} />
            )}
          </View>
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>{textFrom(employer.trade_name || employer.company_name, 'Employer')}</Text>
              {employer.verification_status === 'verified' ? (
                <Badge variant="success">Verified</Badge>
              ) : null}
            </View>
            {employer.industry ? <Text style={styles.industry}>{employer.industry}</Text> : null}
          </View>
        </View>

        <Card padding="md" style={styles.infoCard}>
          <Text style={styles.sectionTitle}>About the Company</Text>
          <Text style={styles.description}>{textFrom(employer.company_description, 'No description provided.')}</Text>

          <View style={styles.detailGrid}>
            <Detail label="Industry" value={textFrom(employer.industry, 'Not specified')} />
            <Detail label="Company Size" value={textFrom(employer.company_size, 'Not specified')} />
          </View>
          <Detail label="Location" value={textFrom(employer.full_address, 'Not listed')} />
          {employer.created_at ? <Detail label="On i-PESO Since" value={formatDate(employer.created_at)} /> : null}
        </Card>

        <View style={styles.trustBox}>
          <MaterialIcons name="verified-user" size={20} color={colors.info} />
          <Text style={styles.trustText}>
            {employer.verification_status === 'verified'
              ? 'This employer has been verified by the PESO Office and is an authorized job provider.'
              : 'This employer has not been verified by PESO yet.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Active Job Vacancies</Text>
        {vacancies.length > 0 ? (
          vacancies.map((job) => (
            <TouchableOpacity key={String(job.post_id)} activeOpacity={0.9} onPress={() => router.push(`/(seeker)/jobs/${job.post_id}`)}>
              <Card padding="md" style={styles.jobCard}>
                <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                <View style={styles.jobMetaRow}>
                  {job.location ? (
                    <View style={styles.jobMetaItem}>
                      <MaterialIcons name="place" size={14} color={colors.subtle} />
                      <Text style={styles.jobMeta}>{job.location}</Text>
                    </View>
                  ) : null}
                  {job.employment_type ? (
                    <View style={styles.jobMetaItem}>
                      <MaterialIcons name="work" size={14} color={colors.subtle} />
                      <Text style={styles.jobMeta}>{titleCase(job.employment_type)}</Text>
                    </View>
                  ) : null}
                  {job.created_at ? (
                    <View style={styles.jobMetaItem}>
                      <MaterialIcons name="event" size={14} color={colors.subtle} />
                      <Text style={styles.jobMeta}>Posted {formatDate(job.created_at)}</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card padding="md" style={styles.emptyCard}>
            <MaterialIcons name="work-off" size={32} color={colors.subtle} />
            <Text style={styles.emptyText}>No active job vacancies at the moment.</Text>
          </Card>
        )}

        <TouchableOpacity style={styles.reportLink} onPress={() => setReportOpen(true)}>
          <MaterialIcons name="flag" size={16} color={colors.error} />
          <Text style={styles.reportLinkText}>Report this employer</Text>
        </TouchableOpacity>
      </ScrollView>

      <ReportEmployerModal
        visible={reportOpen}
        employerId={employer.employer_id}
        employerName={employer.company_name}
        onClose={() => setReportOpen(false)}
      />
    </View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  notFoundTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  alertBox: { marginVertical: spacing.md },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  logoWrap: { width: 64, height: 64, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%', resizeMode: 'contain' },
  headerText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold, flexShrink: 1 },
  industry: { color: colors.textSecondary, fontSize: typography.small, marginTop: spacing.xs },
  infoCard: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  description: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.md },
  detailGrid: { flexDirection: 'row', gap: spacing.md },
  detailItem: { flex: 1, marginBottom: spacing.sm },
  detailLabel: { color: colors.subtle, fontSize: 11, fontFamily: typography.family.bold, textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.medium },
  trustBox: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  trustText: { flex: 1, color: colors.info, fontSize: typography.small, lineHeight: 18 },
  jobCard: { marginBottom: spacing.sm },
  jobTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  jobMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobMeta: { color: colors.textSecondary, fontSize: typography.small },
  emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textSecondary, fontSize: typography.small },
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl, paddingVertical: spacing.md },
  reportLinkText: { color: colors.error, fontSize: typography.small, fontFamily: typography.family.bold },
})
