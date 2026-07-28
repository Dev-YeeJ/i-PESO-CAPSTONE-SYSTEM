import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

interface ComboboxProps<T> {
  label: string
  value: string
  onChangeText: (text: string) => void
  onSelect: (item: T) => void
  search: (query: string) => Promise<T[]>
  renderLabel: (item: T) => string
  renderSubLabel?: (item: T) => string | undefined | null
  keyExtractor: (item: T) => string
  placeholder?: string
  error?: string
  required?: boolean
  minChars?: number
}

export function Combobox<T>({
  label,
  value,
  onChangeText,
  onSelect,
  search,
  renderLabel,
  renderSubLabel,
  keyExtractor,
  placeholder,
  error,
  required = false,
  minChars = 2,
}: ComboboxProps<T>) {
  const [suggestions, setSuggestions] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    if (!open || value.trim().length < minChars) {
      setSuggestions([])
      return
    }

    const currentRequest = ++requestId.current
    const timer = setTimeout(() => {
      setLoading(true)
      search(value.trim())
        .then((results) => {
          if (requestId.current === currentRequest) setSuggestions(results)
        })
        .catch(() => {
          if (requestId.current === currentRequest) setSuggestions([])
        })
        .finally(() => {
          if (requestId.current === currentRequest) setLoading(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [value, open, minChars, search])

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={(text) => {
          onChangeText(text)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        autoCapitalize="words"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open && value.trim().length >= minChars ? (
        <View style={styles.dropdown}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.info} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : suggestions.length ? (
            suggestions.slice(0, 8).map((item) => (
              <TouchableOpacity
                key={keyExtractor(item)}
                style={styles.suggestionRow}
                onPress={() => {
                  onSelect(item)
                  setOpen(false)
                  setSuggestions([])
                }}
              >
                <Text style={styles.suggestionLabel}>{renderLabel(item)}</Text>
                {renderSubLabel?.(item) ? <Text style={styles.suggestionSub}>{renderSubLabel(item)}</Text> : null}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.suggestionRow}>
              <Text style={styles.noResultsText}>No catalog matches — your typed text will be used as-is.</Text>
            </View>
          )}
          <TouchableOpacity style={styles.closeRow} onPress={() => setOpen(false)}>
            <Text style={styles.closeText}>Close suggestions</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, color: colors.muted, fontSize: typography.small, fontWeight: typography.semibold },
  required: { color: colors.danger },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.primary,
    fontSize: typography.body,
  },
  inputError: { borderColor: colors.danger },
  errorText: { marginTop: spacing.xs, color: colors.danger, fontSize: typography.small, fontWeight: typography.medium },
  dropdown: { marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  loadingText: { color: colors.secondaryText, fontSize: typography.small },
  suggestionRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionLabel: { color: colors.primary, fontSize: typography.body, fontWeight: typography.medium },
  suggestionSub: { color: colors.secondaryText, fontSize: typography.small, marginTop: 2 },
  noResultsText: { color: colors.secondaryText, fontSize: typography.small, fontStyle: 'italic' },
  closeRow: { paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.background },
  closeText: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold },
})
