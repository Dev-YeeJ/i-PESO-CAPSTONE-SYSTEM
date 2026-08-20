import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { textFrom } from '@/utils/seekerView'
import { Card } from '@/components/ui/Card'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { QueryState } from '@/components/ui/QueryState'
import { colors, spacing, typography } from '@/theme'

export default function CitizenCharterScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: services = [], isLoading, error, refetch } = useQuery({
    queryKey: ['citizenCharter'],
    queryFn: () => seekerService.getCitizenCharterServices(),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Citizen Charter" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Official PESO Urdaneta City frontline services: requirements, processing time, fees, and steps.
        </Text>

        <QueryState
          isLoading={isLoading}
          error={error}
          errorFallback="Unable to load the Citizen Charter. Please try again."
          isEmpty={!services.length}
          emptyIcon="fact-check"
          emptyTitle="No published services yet"
        >
        {services.map((service) => {
          const id = String(service.service_id)
          const expanded = expandedId === id
          const requirements = Array.isArray(service.requirements) ? service.requirements : []
          const steps = Array.isArray(service.steps) ? service.steps : []

          return (
            <Card key={id} padding="md" style={styles.serviceCard}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setExpandedId(expanded ? null : id)}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceTitle}>{textFrom(service.service_name, 'Service')}</Text>
                  <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={22} color={colors.info} />
                </View>
                {service.description ? <Text style={styles.serviceDescription} numberOfLines={expanded ? undefined : 2}>{service.description}</Text> : null}
              </TouchableOpacity>

              {expanded ? (
                <View style={styles.detailBlock}>
                  <Detail label="Processing Time" value={textFrom(service.processing_time, 'Not listed')} />
                  <Detail label="Fees" value={textFrom(service.fees, 'Free')} />
                  <Detail label="Responsible Office" value={textFrom(service.responsible_office, 'PESO Urdaneta City')} />
                  {service.contact_info ? <Detail label="Contact" value={textFrom(service.contact_info, '')} /> : null}

                  {requirements.length > 0 ? (
                    <>
                      <Text style={styles.sectionLabel}>Requirements</Text>
                      {requirements.map((item, index) => (
                        <BulletRow key={index} text={item} />
                      ))}
                    </>
                  ) : null}

                  {steps.length > 0 ? (
                    <>
                      <Text style={styles.sectionLabel}>Steps</Text>
                      {steps.map((item, index) => (
                        <BulletRow key={index} text={`${index + 1}. ${item}`} />
                      ))}
                    </>
                  ) : null}
                </View>
              ) : null}
            </Card>
          )
        })}
        </QueryState>
      </ScrollView>
    </View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{'•'}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  subtitle: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  serviceCard: { marginBottom: spacing.md },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  serviceTitle: { flex: 1, color: colors.primary, fontSize: typography.title, lineHeight: 22, fontFamily: typography.family.bold },
  serviceDescription: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginTop: spacing.sm },
  detailBlock: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  detailValue: { color: colors.primary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  sectionLabel: { color: colors.primary, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: spacing.md, marginBottom: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  bulletDot: { color: colors.info, fontSize: typography.body },
  bulletText: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, flex: 1 },
})
