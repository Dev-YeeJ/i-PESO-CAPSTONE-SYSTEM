import { StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { JobFairPass } from '@/services/seekerService'
import { Card } from '@/components/ui/Card'
import { colors, radii, spacing, typography } from '@/theme'

export function DigitalQrPass({ pass }: { pass: JobFairPass }) {
  const skills = pass.skills?.slice(0, 5) ?? []

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.kicker}>
        <MaterialIcons name="qr-code-2" size={16} color={colors.info} />
        <Text style={styles.kickerText}>Digital QR Pass</Text>
      </View>

      <Text style={styles.eventName}>{pass.event_name ?? 'Job Fair'}</Text>
      <Text style={styles.name}>{pass.name}</Text>
      <Text style={styles.meta}>{[pass.venue, pass.start_date].filter(Boolean).join(' · ')}</Text>

      <View style={styles.qrWrap}>
        <QRCode value={pass.qr_code_uuid} size={160} />
      </View>

      {skills.length > 0 ? (
        <View style={styles.skillRow}>
          {skills.map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.hint}>Show this QR code at the PESO registration table when you arrive.</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  kickerText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventName: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, textAlign: 'center' },
  name: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.body, fontFamily: typography.family.bold },
  meta: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.small },
  qrWrap: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  skillRow: { marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  skillChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  skillText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold },
  hint: { marginTop: spacing.lg, color: colors.textSecondary, fontSize: typography.small, textAlign: 'center', lineHeight: 18 },
})
