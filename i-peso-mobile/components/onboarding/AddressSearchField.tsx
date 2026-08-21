import { useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Location from 'expo-location'
import { seekerService, type GeocodedLocation } from '@/services/seekerService'
import { colors, radii, spacing, typography } from '@/theme'

interface AddressSearchFieldProps {
  onAddressSelected: (location: GeocodedLocation) => void
}

function newSessionToken() {
  return `${Date.now()}-${Math.random()}`
}

/**
 * Mirrors i-peso-frontend's SingleAddressInput.jsx (search-as-you-type against
 * /geo/autocomplete, resolve via /geo/place/{id}) plus a "use my current location"
 * action backed by /geo/reverse — mobile already ships expo-location for Job Map,
 * so this needed no new native dependency.
 */
export function AddressSearchField({ onAddressSelected }: AddressSearchFieldProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodedLocation[]>([])
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState('')
  const sessionToken = useRef(newSessionToken())
  const requestSeq = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = (text: string) => {
    setQuery(text)
    setNotice('')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (text.trim().length < 3) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeq.current
      setSearching(true)
      try {
        const results = await seekerService.autocompleteAddress(text.trim(), sessionToken.current)
        if (requestSeq.current === seq) setSuggestions(results)
      } catch {
        if (requestSeq.current === seq) {
          setSuggestions([])
          setNotice('Address suggestions are temporarily unavailable — you can still fill in the fields below manually.')
        }
      } finally {
        if (requestSeq.current === seq) setSearching(false)
      }
    }, 300)
  }

  const selectSuggestion = async (suggestion: GeocodedLocation) => {
    if (!suggestion.place_id) return
    setSuggestions([])
    setResolving(true)
    setNotice('')
    try {
      const place = await seekerService.getPlaceAddress(suggestion.place_id, sessionToken.current)
      if (place) {
        setQuery(place.formatted ?? suggestion.formatted ?? '')
        onAddressSelected(place)
        sessionToken.current = newSessionToken()
      } else {
        setNotice('The selected address could not be loaded. Please try another result or fill in manually.')
      }
    } catch {
      setNotice('The selected address could not be loaded. Please try another result or fill in manually.')
    } finally {
      setResolving(false)
    }
  }

  const useCurrentLocation = async () => {
    setLocating(true)
    setNotice('')
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setNotice('Location permission was denied. You can still search or fill in the address manually.')
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const place = await seekerService.reverseGeocode(position.coords.latitude, position.coords.longitude)
      if (place) {
        setQuery(place.formatted ?? '')
        onAddressSelected(place)
      } else {
        setNotice('Could not determine an address for your current location. Please fill in manually.')
      }
    } catch {
      setNotice('Unable to get your current location. You can still search or fill in the address manually.')
    } finally {
      setLocating(false)
    }
  }

  const loading = searching || resolving

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <MaterialIcons name="search" size={18} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search house, street, barangay, or city"
            placeholderTextColor={colors.subtle}
            editable={!resolving}
          />
          {loading ? <ActivityIndicator size="small" color={colors.info} /> : null}
        </View>
        <TouchableOpacity style={styles.locateBtn} onPress={useCurrentLocation} disabled={locating} activeOpacity={0.8}>
          {locating ? <ActivityIndicator size="small" color={colors.info} /> : <MaterialIcons name="my-location" size={20} color={colors.info} />}
        </TouchableOpacity>
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestionList}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={item.place_id ?? index}
              style={styles.suggestionItem}
              onPress={() => selectSuggestion(item)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="place" size={16} color={colors.subtle} />
              <View style={styles.suggestionTextWrap}>
                <Text style={styles.suggestionPrimary} numberOfLines={1}>{item.address_line1 ?? item.formatted}</Text>
                {item.address_line2 ? <Text style={styles.suggestionSecondary} numberOfLines={1}>{item.address_line2}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, paddingHorizontal: spacing.md, height: 46 },
  searchInput: { flex: 1, color: colors.primary, fontSize: typography.body },
  locateBtn: { width: 46, height: 46, borderRadius: radii.md, borderWidth: 1, borderColor: colors.infoBorder, backgroundColor: colors.infoBackground, alignItems: 'center', justifyContent: 'center' },
  notice: { marginTop: spacing.xs, color: colors.subtle, fontSize: typography.small, lineHeight: 16 },
  suggestionList: { marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionTextWrap: { flex: 1 },
  suggestionPrimary: { color: colors.primary, fontSize: typography.small, fontFamily: typography.family.bold },
  suggestionSecondary: { color: colors.subtle, fontSize: typography.label, marginTop: 2 },
})
