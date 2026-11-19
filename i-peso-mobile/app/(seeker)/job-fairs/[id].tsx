import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { LinearGradient } from 'expo-linear-gradient'
import type { JobFair, JobFairPass } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { formatDate, textFrom, titleCase } from '@/utils/seekerView'
import { useMotion } from '@/hooks/useMotion'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { DigitalQrPass } from '@/components/seeker/DigitalQrPass'
import { colors, gradients, radii, shadows, spacing, typography } from '@/theme'

/** "08:00:00" → "8:00 AM" (the API sends 24-hour clock strings). */
function clock(value?: string | null) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '')
  if (!match) return value ?? ''
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}

function HeroMeta({ icon, text }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }) {
  return (
    <View style={styles.heroMeta}>
      <MaterialIcons name={icon} size={16} color={colors.blue100} />
      <Text style={styles.heroMetaText}>{text}</Text>
    </View>
  )
}

// Mirrors JobFairService::MAP_STATUSES on the backend — the set of statuses
// where the fair is still upcoming or in progress, so RSVP still makes sense.
const registrableStatuses = ['published', 'accepting_employers', 'upcoming', 'ongoing']

export default function JobFairDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>()
  const router = useRouter()
  // Home's "Upcoming job fair" card opens this directly; back should return there, not to
  // the list the seeker never saw. Every other entry point comes from the list.
  const backTarget = from === 'home' ? '/(seeker)' : '/(seeker)/job-fairs'
  const queryClient = useQueryClient()
  const m = useMotion()
  const [pass, setPass] = useState<JobFairPass | null>(null)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')

  // There is no single-fetch endpoint for job fairs (backend only exposes
  // GET /job-fairs), so the detail screen reads from the list's cache.
  const jobFairs = queryClient.getQueryData<JobFair[]>(['jobFairs'])
  const fair = useMemo(() => jobFairs?.find((f) => String(f.job_fair_id) === id), [jobFairs, id])

  const register = async () => {
    if (!fair) return
    setRegistering(true)
    setRegisterError('')
    try {
      const { pass: issuedPass } = await seekerService.rsvpToJobFair(fair.job_fair_id)
      setPass(issuedPass)
    } catch (e) {
      setRegisterError(apiErrorMessage(e, 'Unable to register right now.'))
    } finally {
      setRegistering(false)
    }
  }

  if (!fair) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Job Fair" onBack={() => router.replace(backTarget as never)} />
        <View style={styles.center}>
          <EmptyState
            icon="event-busy"
            title="Job fair not found"
            message="This can happen if you opened a link before the job fairs list finished loading."
            action={
              <Button variant="outline" onPress={() => router.replace('/(seeker)/job-fairs')}>
                Back to Job Fairs
              </Button>
            }
          />
        </View>
      </View>
    )
  }

  const partnerAgencies = Array.isArray(fair.partner_agencies) ? fair.partner_agencies : []
  const employers = fair.participating_employers ?? []
  const vacancies = fair.published_vacancies ?? []

  return (
    <View style={styles.flex}>
      {/* Same router.replace fix as the not-found branch above and as job-fairs.tsx's
          own header — this screen is also a flat Tabs-navigator sibling, so back()
          jumps to Home instead of the Job Fairs list it was actually opened from. */}
      <ScreenHeader title="Job Fair" onBack={() => router.replace(backTarget as never)} />
      <ScrollView contentContainerStyle={styles.content}>
      {/* Hero (redesign "20 — Job fair details"): status, title, when and where. */}
      {/* `brand`, not `hero`: the light meta text failed AA (3.4:1) over hero's lightest stop. */}
      <LinearGradient colors={[...gradients.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroDecor} pointerEvents="none" />
        <View style={styles.heroBadges}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{titleCase(fair.status, 'Scheduled')}</Text>
          </View>
          {fair.is_rsvped ? (
            <View style={styles.heroPill}>
              <MaterialIcons name="check" size={14} color={colors.white} />
              <Text style={styles.heroPillText}>You&apos;re registered</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroTitle} accessibilityRole="header">{textFrom(fair.title, 'Untitled job fair')}</Text>
        <HeroMeta icon="event" text={`${formatDate(fair.start_date || fair.event_date)}${fair.end_date ? ` – ${formatDate(fair.end_date)}` : ''}`} />
        {fair.start_time || fair.end_time ? (
          <HeroMeta icon="schedule" text={[clock(fair.start_time), clock(fair.end_time)].filter(Boolean).join(' – ')} />
        ) : null}
        <HeroMeta icon="place" text={textFrom(fair.venue, 'Venue to be announced')} />
      </LinearGradient>

      {fair.target_sector ? (
        <View style={styles.audienceRow}>
          <MaterialIcons name="groups" size={18} color={colors.iconBlue} />
          <Text style={styles.audienceText}>For: {titleCase(fair.target_sector, 'Everyone')}</Text>
        </View>
      ) : null}

      {fair.description ? (
        <Text style={styles.description}>{textFrom(fair.description, '')}</Text>
      ) : null}

      {pass ? (
        <Animated.View
          style={styles.passWrap}
          entering={m.enabled ? FadeInUp.duration(m.duration('slow')) : undefined}
        >
          <DigitalQrPass pass={pass} />
        </Animated.View>
      ) : registrableStatuses.includes(textFrom(fair.status, '').toLowerCase()) ? (
        <Card padding="md" style={styles.registerCard}>
          <Text style={styles.registerTitle}>{fair.is_rsvped ? 'You’re registered' : 'Reserve your spot'}</Text>
          <Text style={styles.registerSubtitle}>
            {fair.is_rsvped ? 'Get your digital QR pass to show at the venue.' : 'Register to get a digital QR pass — walk-ins are still welcome too.'}
          </Text>
          {registerError ? <AlertBox variant="danger" style={styles.registerAlert}>{registerError}</AlertBox> : null}
          <Button onPress={register} loading={registering} style={styles.registerButton}>
            {fair.is_rsvped ? 'View my QR pass' : 'Register for this job fair'}
          </Button>
        </Card>
      ) : null}

      {partnerAgencies.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Partner Agencies</Text>
          <View style={styles.tagRow}>
            {partnerAgencies.map((agency) => (
              <Text key={agency} style={styles.tag}>{agency}</Text>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Participating Employers ({employers.length})</Text>
      {employers.length > 0 ? (
        <Card padding="md" style={styles.listCard}>
          {employers.map((employer, index) => (
            <PressableScale
              key={String(employer.employer_id ?? index)}
              scaleTo="buttonPress"
              ripple={null}
              style={[styles.listRow, index === 0 && styles.listRowFirst]}
              disabled={employer.employer_id == null}
              onPress={() => router.push({
                pathname: '/(seeker)/job-fairs/booth',
                params: { jobFairId: String(id), employerId: String(employer.employer_id), from: 'job-fair', fromId: String(id) },
              } as never)}
              accessibilityRole="button"
              accessibilityLabel={`View ${textFrom(employer.company_name, 'employer')} booth`}
            >
              <Text style={styles.listRowText}>{textFrom(employer.company_name, 'Employer')}</Text>
              {employer.status ? <Badge variant="neutral">{titleCase(employer.status, '')}</Badge> : null}
              {employer.employer_id != null ? <MaterialIcons name="chevron-right" size={18} color={colors.subtle} /> : null}
            </PressableScale>
          ))}
        </Card>
      ) : (
        <Text style={styles.emptyText}>No employers listed yet.</Text>
      )}

      <Text style={styles.sectionTitle}>Published Vacancies ({vacancies.length})</Text>
      {vacancies.length > 0 ? (
        <Card padding="md" style={styles.listCard}>
          {vacancies.map((vacancy, index) => (
            <View key={String(vacancy.post_id ?? index)} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
              <Text style={styles.listRowText}>{textFrom(vacancy.job_title, 'Untitled role')}</Text>
              <Text style={styles.listRowSub}>{textFrom(vacancy.vacancies_count, '0')} slot(s)</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Text style={styles.emptyText}>No vacancies published for this job fair yet.</Text>
      )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  hero: { borderRadius: radii.xl, padding: spacing.xl, overflow: 'hidden', marginBottom: spacing.lg, ...shadows.md },
  heroDecor: { position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: colors.white, opacity: 0.1 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.heroChipActive, borderRadius: radii.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 4 },
  heroPillText: { color: colors.white, fontSize: typography.small, fontFamily: typography.family.bold },
  heroTitle: { color: colors.white, fontSize: typography.heading + 2, lineHeight: 30, fontFamily: typography.family.bold, marginTop: spacing.sm + 2, marginBottom: spacing.xs },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.xs + 2 },
  heroMetaText: { flex: 1, color: colors.blue50, fontSize: 13, lineHeight: 18, fontFamily: typography.family.medium },
  audienceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.tint },
  audienceText: { flex: 1, color: colors.figure, fontSize: typography.small, fontFamily: typography.family.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  passWrap: { marginBottom: spacing.lg },
  registerCard: { marginBottom: spacing.lg, backgroundColor: colors.infoBackground, borderColor: colors.infoBorder },
  registerTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold },
  registerSubtitle: { marginTop: spacing.xs, color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  registerAlert: { marginTop: spacing.md },
  registerButton: { marginTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  title: { flex: 1, color: colors.textPrimary, fontSize: typography.heading, lineHeight: 30, fontFamily: typography.family.bold },
  statusBadge: { marginTop: spacing.xs },
  description: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 22, marginBottom: spacing.lg },
  infoCard: { marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  detailValue: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginTop: spacing.lg, marginBottom: spacing.md },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.infoBackground, color: colors.info, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.small, fontFamily: typography.family.bold },
  listCard: { gap: 0 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  listRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  listRowText: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold, flex: 1, marginRight: spacing.sm },
  listRowSub: { color: colors.secondaryText, fontSize: typography.small },
  emptyText: { color: colors.secondaryText, fontSize: typography.body },
})
