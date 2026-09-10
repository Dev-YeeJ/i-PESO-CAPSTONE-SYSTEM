import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { seekerService } from '@/services/seekerService'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { PosterFeedCard } from '@/components/seeker/PosterFeedCard'
import { colors, spacing, typography } from '@/theme'

export default function EmployerPostersScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const { data: posters = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobFairPosters'],
    queryFn: () => seekerService.getJobFairPosters(),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  return (
    <View style={styles.flex}>
      {/* router.replace, not router.back(): a flat sibling in the Tabs navigator (see
          job-fairs.tsx for the same reasoning), so back() would fall through to Home. */}
      <ScreenHeader title="Employer Posters" onBack={() => router.replace('/(seeker)/government-programs')} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>PESO Bulletin</Text>
        <Text style={styles.subtitle}>
          PESO-approved job vacancy posters from employers participating in upcoming job fairs.
        </Text>

        <QueryState
          isLoading={isLoading}
          error={error}
          errorFallback="Unable to load employer posters. Please try again."
          onRetry={refetch}
          isEmpty={!posters.length}
          emptyIcon="image-not-supported"
          emptyTitle="No employer posters yet"
          emptyMessage="No employer posters are available right now."
        >
          {posters.map((poster) => <PosterFeedCard key={String(poster.id)} poster={poster} />)}
        </QueryState>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
})
