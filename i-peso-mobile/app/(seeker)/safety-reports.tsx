import { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { formatSafetyDate, MY_SAFETY_REPORTS_KEY, safetyStatusBadge } from '@/utils/safetyReports'
import { SafetyReportDetailSheet } from '@/components/safety/SafetyReportDetailSheet'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PressableScale } from '@/components/ui/PressableScale'
import { QueryState } from '@/components/ui/QueryState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/pages/shared/MySafetyReportsPage.jsx (role 'seeker').
// The website pages with Previous/Next; on a phone the list grows with "Load more".

// safety-reports is a flat sibling in the Tabs navigator, so router.back() has no real history.
function backTargetFor(from: string | undefined): string {
  if (from === 'notifications') return '/(seeker)/notifications'
  return '/(seeker)/profile'
}

export default function MySafetyReportsScreen() {
  const router = useRouter()
  // A notification or the "View my reports" button links here as case=12 (the website's ?case=).
  const { case: caseParam, from } = useLocalSearchParams<{ case?: string; from?: string }>()
  const [openId, setOpenId] = useState<string | null>(null)

  // Open the requested case, then clear the param so it doesn't reopen on its own.
  useEffect(() => {
    if (!caseParam) return
    setOpenId(caseParam)
    router.setParams({ case: undefined })
  }, [caseParam, router])

  const list = useInfiniteQuery({
    queryKey: MY_SAFETY_REPORTS_KEY,
    queryFn: ({ pageParam }) => seekerService.mySafetyReports(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
  })
  const reports = list.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <View style={styles.flex}>
      <ScreenHeader title="My Safety Reports" onBack={() => router.replace(backTargetFor(from) as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => list.refetch()} tintColor={colors.info} />}
      >
        <Text style={styles.kicker}>Report &amp; Safety</Text>
        <Text style={styles.intro}>
          Concerns you reported to PESO about employers, companies or job vacancies. Reports are confidential — the employer is never told who filed them.
        </Text>

        <AlertBox variant="info" style={styles.infoBox}>
          To report a concern, use “Report” on a company profile, a job vacancy or one of your applications. A PESO administrator reviews every report before any action is taken.
        </AlertBox>

        <QueryState
          isLoading={list.isLoading}
          error={list.error}
          errorFallback="Your reports could not be loaded. Check your connection and try again."
          onRetry={() => list.refetch()}
          isEmpty={reports.length === 0}
          emptyIcon="verified-user"
          emptyTitle="No reports filed"
          emptyMessage="You haven't reported any concerns. We hope it stays that way."
        >
          {reports.map((report) => (
            <PressableScale
              key={report.id}
              scaleTo="cardPress"
              ripple={null}
              onPress={() => setOpenId(String(report.id))}
              accessibilityRole="button"
              accessibilityLabel={`Report about ${report.subject_name ?? 'an employer'}, case ${report.case_number}, ${report.status_label}`}
            >
              <Card padding="md" style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <MaterialIcons name="business" size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.subject} numberOfLines={1}>{report.subject_name}</Text>
                    <Text style={styles.caseNumber}>{report.case_number}</Text>
                    <Text style={styles.category} numberOfLines={2}>
                      {report.category_label}{report.vacancy_title ? ` · ${report.vacancy_title}` : ''}
                    </Text>
                    <Text style={styles.meta}>Filed {formatSafetyDate(report.created_at)}</Text>
                  </View>
                  <View style={styles.side}>
                    <Badge variant={safetyStatusBadge(report.status)}>{report.status_label}</Badge>
                    <MaterialIcons name="chevron-right" size={20} color={colors.subtle} />
                  </View>
                </View>
              </Card>
            </PressableScale>
          ))}

          {list.hasNextPage ? (
            <Button variant="outline" size="sm" onPress={() => list.fetchNextPage()} loading={list.isFetchingNextPage} style={styles.loadMore}>
              Load more
            </Button>
          ) : null}
        </QueryState>
      </ScrollView>

      {openId ? <SafetyReportDetailSheet key={openId} id={openId} onClose={() => setOpenId(null)} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { ...textStyles.label, color: colors.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  intro: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs },
  infoBox: { marginTop: spacing.md, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  subject: { ...textStyles.bodyBold, color: colors.textPrimary },
  caseNumber: { ...textStyles.small, color: colors.subtle, marginTop: 2 },
  category: { ...textStyles.small, color: colors.textSecondary, marginTop: spacing.xs },
  meta: { ...textStyles.small, color: colors.subtle, marginTop: 2 },
  side: { alignItems: 'flex-end', gap: spacing.sm },
  loadMore: { alignSelf: 'center', marginTop: spacing.sm },
})
