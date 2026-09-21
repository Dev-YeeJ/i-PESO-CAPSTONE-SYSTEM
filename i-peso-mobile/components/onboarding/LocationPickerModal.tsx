import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { seekerService, type GeocodedLocation } from '@/services/seekerService'
import { getBarangaysByCity, getCitiesByProvince, getProvinces, matchPsgcLocation } from '@/services/psgcService'
import { AddressSearchField } from './AddressSearchField'
import { AddressPinMap } from './AddressPinMap'
import { Field, SelectField } from './formPrimitives'
import { Button } from '@/components/ui/Button'
import { AlertBox } from '@/components/ui/AlertBox'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, spacing, typography } from '@/theme'

export interface LocationPickerValue {
  address_province: string
  address_province_code: string
  address_municipality_city: string
  address_city_code: string
  address_barangay: string
  address_barangay_code: string
  address_house_street: string
  latitude: number | null
  longitude: number | null
}

interface LocationPickerModalProps {
  visible: boolean
  initialValue: LocationPickerValue
  onClose: () => void
  onConfirm: (value: LocationPickerValue) => void
}

/**
 * Full-screen "Select Location" picker — pulls the address search, current-location,
 * pin map, and Province/City/Barangay cascade out of the main Personal Information form
 * (see profile.tsx's compact "Present Address" summary) so the long Edit Profile page
 * doesn't have to permanently embed all of it. Everything here is a thin wrapper around
 * the exact same pieces Step1Personal already used inline (AddressSearchField,
 * AddressPinMap, psgcService cascade) — no new location logic, no new endpoints.
 *
 * State is a local draft, seeded from initialValue only when the modal opens (not on
 * every initialValue change) — so pressing the header back button discards whatever the
 * user changed in here and the caller's saved value is left untouched. Only "Confirm
 * Location" hands the draft back up.
 */
export function LocationPickerModal({ visible, initialValue, onClose, onConfirm }: LocationPickerModalProps) {
  const [draft, setDraft] = useState<LocationPickerValue>(initialValue)
  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>([])
  const [cities, setCities] = useState<{ code: string; name: string }[]>([])
  const [barangays, setBarangays] = useState<{ code: string; name: string }[]>([])
  const [addressListsLoading, setAddressListsLoading] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const [pinGeocoding, setPinGeocoding] = useState(false)
  const [pinGeocodeError, setPinGeocodeError] = useState('')
  const pinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinRequestSeq = useRef(0)

  // Reset the draft to whatever's currently saved every time the picker is (re-)opened —
  // not on every initialValue change, or a parent re-render mid-edit would clobber typing.
  useEffect(() => {
    if (visible) {
      setDraft(initialValue)
      setLocationNotice('')
      setPinGeocodeError('')
    } else if (pinDebounceRef.current) {
      clearTimeout(pinDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    let active = true
    setAddressListsLoading(true)
    getProvinces()
      .then((items) => active && setProvinces(items))
      .catch(() => active && setProvinces([]))
      .finally(() => active && setAddressListsLoading(false))
    return () => { active = false }
  }, [visible])

  useEffect(() => {
    let active = true
    setCities([])
    setBarangays([])
    if (!draft.address_province_code) return undefined
    getCitiesByProvince(draft.address_province_code)
      .then((items) => active && setCities(items))
      .catch(() => active && setCities([]))
    return () => { active = false }
  }, [draft.address_province_code])

  useEffect(() => {
    let active = true
    if (!draft.address_city_code) {
      setBarangays([])
      return undefined
    }
    getBarangaysByCity(draft.address_city_code)
      .then((items) => active && setBarangays(items))
      .catch(() => active && setBarangays([]))
    return () => { active = false }
  }, [draft.address_city_code])

  const applyResolvedLocation = async (place: GeocodedLocation) => {
    setLocationNotice('')
    let matched
    try {
      matched = await matchPsgcLocation(place)
    } catch {
      setLocationNotice('The location was found, but its official address lists could not be loaded. Please select the address fields manually.')
      matched = null
    }
    const province = matched?.provinceName?.trim() || place.province_name?.trim() || ''
    const city = matched?.cityName?.trim() || place.city_name?.trim() || ''
    const barangay = matched?.barangayName?.trim() || place.barangay_name?.trim() || ''

    setDraft((current) => ({
      ...current,
      address_province_code: matched?.address_province_code ?? '',
      address_city_code: matched?.address_city_code ?? '',
      address_barangay_code: matched?.address_barangay_code ?? '',
      address_province: province,
      address_municipality_city: city,
      address_barangay: barangay,
      address_house_street: matched?.houseStreet || [place.house_number, place.street].filter(Boolean).join(' ').trim(),
      latitude: place.latitude,
      longitude: place.longitude,
    }))
  }

  // The pin is the source of truth for lat/lng — reverse geocoding only fills in the
  // readable address and PSGC fields around whatever coordinate the user dropped the pin
  // on. We never let the geocoder's own (sometimes snapped/rounded) lat/lng overwrite the
  // pin's actual position.
  const reverseGeocodePin = async (lat: number, lng: number) => {
    const seq = ++pinRequestSeq.current
    setPinGeocoding(true)
    setPinGeocodeError('')
    try {
      const place = await seekerService.reverseGeocode(lat, lng)
      if (pinRequestSeq.current !== seq) return
      if (!place) {
        setPinGeocodeError("Couldn't find an address for this location. Try moving the pin slightly or search for an address.")
        return
      }

      let matched
      try {
        matched = await matchPsgcLocation(place)
      } catch {
        matched = null
      }
      if (pinRequestSeq.current !== seq) return

      const province = matched?.provinceName?.trim() || place.province_name?.trim() || ''
      const city = matched?.cityName?.trim() || place.city_name?.trim() || ''
      const barangay = matched?.barangayName?.trim() || place.barangay_name?.trim() || ''

      if (!province && !city && !barangay) {
        setPinGeocodeError("Couldn't find an address for this location. Try moving the pin slightly or search for an address.")
        return
      }

      setDraft((current) => ({
        ...current,
        address_province_code: matched?.address_province_code ?? current.address_province_code,
        address_city_code: matched?.address_city_code ?? current.address_city_code,
        address_barangay_code: matched?.address_barangay_code ?? current.address_barangay_code,
        address_province: province || current.address_province,
        address_municipality_city: city || current.address_municipality_city,
        address_barangay: barangay || current.address_barangay,
        address_house_street: matched?.houseStreet || [place.house_number, place.street].filter(Boolean).join(' ').trim() || current.address_house_street,
        // lat/lng intentionally NOT taken from `place` — the dragged pin position stays authoritative.
      }))
    } catch {
      if (pinRequestSeq.current === seq) {
        setPinGeocodeError("Couldn't find an address for this location. Try moving the pin slightly or search for an address.")
      }
    } finally {
      if (pinRequestSeq.current === seq) setPinGeocoding(false)
    }
  }

  const handlePinMoved = (lat: number, lng: number) => {
    setDraft((current) => ({ ...current, latitude: lat, longitude: lng }))
    if (pinDebounceRef.current) clearTimeout(pinDebounceRef.current)
    // Debounced so a marker that's still settling (or several quick taps) doesn't fire a
    // reverse-geocode request per movement — only the final stopped position is looked up.
    pinDebounceRef.current = setTimeout(() => { reverseGeocodePin(lat, lng) }, 500)
  }

  const canConfirm = Boolean(draft.address_province_code && draft.address_city_code && draft.address_barangay_code)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}>
      <View style={styles.flex}>
        <ScreenHeader title="Select Location" onBack={onClose} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.hint}>Search or use your current location, then verify the Province, City / Municipality, and Barangay below.</Text>

            <AddressSearchField onError={setLocationNotice} onAddressSelected={applyResolvedLocation} />
            {locationNotice ? <AlertBox variant="info" style={styles.notice}>{locationNotice}</AlertBox> : null}

            {draft.latitude != null && draft.longitude != null ? (
              <>
                <View style={styles.mapHintRow}>
                  <Text style={styles.mapHint}>Drag the pin, or tap the map, to adjust the exact spot.</Text>
                  {pinGeocoding ? (
                    <View style={styles.findingAddressRow}>
                      <ActivityIndicator size="small" color={colors.info} />
                      <Text style={styles.findingAddressText}>Finding address...</Text>
                    </View>
                  ) : null}
                </View>
                <AddressPinMap
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  onPinMoved={handlePinMoved}
                />
                {pinGeocodeError ? <AlertBox variant="warning" style={styles.notice}>{pinGeocodeError}</AlertBox> : null}
              </>
            ) : null}

            <SelectField
              label="Province"
              required
              placeholder={addressListsLoading ? 'Loading provinces...' : 'Select province'}
              options={provinces.map((province) => ({ label: province.name, value: province.code }))}
              value={draft.address_province_code}
              onChange={(code) => {
                const province = provinces.find((item) => item.code === code)
                setDraft((current) => ({
                  ...current,
                  address_province_code: code,
                  address_province: province?.name ?? '',
                  address_city_code: '',
                  address_municipality_city: '',
                  address_barangay_code: '',
                  address_barangay: '',
                }))
              }}
            />
            <SelectField
              label="City / Municipality"
              required
              placeholder={draft.address_province_code ? 'Select city / municipality' : 'Select province first'}
              options={cities.map((city) => ({ label: city.name, value: city.code }))}
              value={draft.address_city_code}
              onChange={(code) => {
                const city = cities.find((item) => item.code === code)
                setDraft((current) => ({
                  ...current,
                  address_city_code: code,
                  address_municipality_city: city?.name ?? '',
                  address_barangay_code: '',
                  address_barangay: '',
                }))
              }}
            />
            <SelectField
              label="Barangay"
              required
              placeholder={draft.address_city_code ? 'Select barangay' : 'Select city first'}
              options={barangays.map((barangay) => ({ label: barangay.name, value: barangay.code }))}
              value={draft.address_barangay_code}
              onChange={(code) => {
                const barangay = barangays.find((item) => item.code === code)
                setDraft((current) => ({ ...current, address_barangay_code: code, address_barangay: barangay?.name ?? '' }))
              }}
            />
            <Field
              label="House No. / Street"
              value={draft.address_house_street}
              onChangeText={(value) => setDraft((current) => ({ ...current, address_house_street: value }))}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              variant="primary"
              fullWidth
              disabled={!canConfirm}
              onPress={() => { onConfirm(draft); onClose() }}
              style={styles.confirmBtn}
            >
              Confirm Location
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  hint: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginBottom: spacing.md },
  mapHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  mapHint: { flex: 1, color: colors.secondaryText, fontSize: typography.small },
  findingAddressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  findingAddressText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  notice: { marginBottom: spacing.md },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  confirmBtn: { marginBottom: 0 },
})
