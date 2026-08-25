import { useState } from 'react'
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { SeekerNotification } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, spacing, typography } from '@/theme'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => seekerService.getNotifications(),
  })
  const notifications = data?.notifications ?? []
  const unreadCount = data?.unread_count ?? 0

  const markAllReadMutation = useMutation({
    mutationFn: () => seekerService.markNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => seekerService.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  // Routing is driven by payload fields, not the raw action_url: the backend's
  // action_url points at web routes (and is outright broken/employer-facing for
  // job fairs), so it can't be trusted for in-app navigation.
  const handleNotificationPress = (notification: SeekerNotification) => {
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id)
    }

    if (notification.data?.application_id) {
      router.push('/(seeker)/applications')
    } else if (notification.data?.program_id) {
      router.push(`/(seeker)/government-programs/${notification.data.program_id}`)
    } else if (notification.data?.job_fair_id) {
      router.push('/(seeker)/job-fairs')
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="Notifications"
        onBack={() => router.back()}
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading ? (
        <ScreenSkeleton label="Loading notifications" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-none"
              title="No notifications yet"
              message="We'll let you know when employers update your applications or when matching jobs are posted."
            />
          }
          renderItem={({ item }) => {
            const isUnread = !item.read_at
            
            return (
              <TouchableOpacity activeOpacity={0.8} onPress={() => handleNotificationPress(item)}>
                <Card style={[styles.notificationCard, isUnread && styles.unreadCard]} padding="md">
                  <View style={styles.notificationHeader}>
                    <View style={styles.iconContainer}>
                      <MaterialIcons
                        name={
                          item.data?.application_id ? 'work' :
                          item.data?.program_id ? 'school' :
                          item.data?.job_fair_id ? 'event' :
                          item.data?.action_type === 'application_update' ? 'work' :
                          item.data?.action_type === 'job_fair' ? 'event' : 'notifications'
                        }
                        size={20}
                        color={isUnread ? colors.secondary : colors.muted}
                      />
                    </View>
                    <View style={styles.contentContainer}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.itemTitle, isUnread && styles.unreadText]}>{item.data?.title || 'Notification'}</Text>
                        <Text style={styles.timeText}>
                          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}
                        </Text>
                      </View>
                      <Text style={styles.itemMessage}>{item.data?.message}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markAllText: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold },
  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  notificationCard: { marginBottom: 0 },
  unreadCard: { borderColor: colors.blue200, borderWidth: 1, backgroundColor: colors.blue50 },
  notificationHeader: { flexDirection: 'row', gap: spacing.md },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  itemTitle: { fontSize: typography.title, color: colors.textPrimary, fontFamily: typography.family.bold, flex: 1, marginRight: spacing.sm },
  unreadText: { fontFamily: typography.family.bold, color: colors.secondary },
  timeText: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  itemMessage: { fontSize: typography.body, color: colors.textSecondary, lineHeight: 20 },
})
