import { useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { Card } from '@/components/ui/Card'
import { colors, radii, spacing, typography } from '@/theme'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => seekerService.getNotifications(),
  })

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

  const handleNotificationPress = (notification: any) => {
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id)
    }
    
    // Attempt to route based on action_url if provided by backend
    if (notification.data?.action_url) {
      // In a real app, you might need to map backend URLs to expo-router paths
      // For now, if it's an application update, we send them to the applications tab
      if (notification.data.action_type === 'application_update') {
        router.push('/(seeker)/applications')
      } else if (notification.data.action_type === 'job_fair') {
        router.push('/(seeker)/job-fairs')
      }
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.info} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="notifications-none" size={48} color={colors.subtle} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>We'll let you know when employers update your applications or when matching jobs are posted.</Text>
            </View>
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
                          item.data?.action_type === 'application_update' ? 'work' : 
                          item.data?.action_type === 'job_fair' ? 'event' : 'notifications'
                        } 
                        size={20} 
                        color={isUnread ? colors.info : colors.muted} 
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
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: 60, 
    paddingBottom: spacing.md, 
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backBtn: { padding: spacing.xs, marginLeft: -spacing.xs },
  title: { fontSize: typography.heading, fontWeight: typography.bold, color: colors.primary },
  markAllText: { color: colors.info, fontSize: typography.small, fontWeight: typography.semibold },
  listContent: { padding: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl },
  notificationCard: { marginBottom: 0 },
  unreadCard: { borderColor: colors.info, borderWidth: 1, backgroundColor: '#f0f9ff' },
  notificationHeader: { flexDirection: 'row', gap: spacing.md },
  iconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.background, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  contentContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  itemTitle: { fontSize: typography.title, color: colors.primary, fontWeight: typography.semibold, flex: 1, marginRight: spacing.sm },
  unreadText: { fontWeight: typography.bold, color: colors.info },
  timeText: { fontSize: 11, color: colors.muted, marginTop: 2 },
  itemMessage: { fontSize: typography.body, color: colors.secondaryText, lineHeight: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: spacing.md },
  emptyTitle: { fontSize: typography.title, fontWeight: typography.bold, color: colors.primary },
  emptySub: { fontSize: typography.body, color: colors.secondaryText, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 22 },
})
