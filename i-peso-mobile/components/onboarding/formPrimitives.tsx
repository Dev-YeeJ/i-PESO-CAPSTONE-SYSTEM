import { ReactNode, useState } from 'react'
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
} from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, radii, spacing, typography } from '@/theme'

// ── Server error helpers ───────────────────────────────────────────────────

export type ServerErrors = Record<string, string[]>

export function fieldError(errors: ServerErrors | undefined, path: string): string | undefined {
  return errors?.[path]?.[0]
}

/**
 * Folds every error key matching one of the given prefixes (exact match, or
 * "prefix.*") onto a single message — for backend rules that key errors by
 * an array/nested path (e.g. occupation_preferences.0.occupation_id) but
 * the UI only has one field to show them under.
 */
export function collapsedFieldError(errors: ServerErrors | undefined, prefixes: string[]): string | undefined {
  if (!errors) return undefined
  for (const key of Object.keys(errors)) {
    if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))) {
      return errors[key]?.[0]
    }
  }
  return undefined
}

export function firstServerError(errors: ServerErrors = {}) {
  const key = Object.keys(errors)[0]
  return key ? errors[key]?.[0] : ''
}

// ── Field ───────────────────────────────────────────────────────────────

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  error,
  required = false,
  autoCapitalize = 'words',
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  multiline?: boolean
  error?: string
  required?: boolean
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

// ── Choice chip group (single-select) ─────────────────────────────────────

export function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.choice, active && styles.choiceActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  error,
  required = false,
  columns = true,
}: {
  label: string
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  columns?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={columns ? styles.choiceGrid : styles.choiceRow}>
        {options.map((option) => (
          <Choice key={option.value} label={option.label} active={value === option.value} onPress={() => onChange(option.value)} />
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

// ── SelectField — modal dropdown (mirrors web's native <select>) ──────────
// Same prop shape as ChoiceGroup so call sites can swap between the two freely.
// Use this instead of ChoiceGroup wherever the website renders an actual <select>
// dropdown (chevron, single tap-to-open list) rather than a button/chip group —
// and always for long option lists, where inline chips don't scale.

export function SelectField({
  label,
  options,
  value,
  onChange,
  error,
  required = false,
  placeholder = 'Select',
}: {
  label: string
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity
        style={[styles.input, styles.selectInput, error && styles.inputError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={selected ? styles.selectValueText : styles.selectPlaceholderText} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={22} color={colors.muted} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.selectOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity style={styles.selectSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.selectSheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(option) => option.value}
              style={styles.selectList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectOption}
                  onPress={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                >
                  <Text style={[styles.selectOptionText, item.value === value && styles.selectOptionTextActive]}>
                    {item.label}
                  </Text>
                  {item.value === value ? <MaterialIcons name="check" size={18} color={colors.info} /> : null}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.selectCloseBtn} onPress={() => setOpen(false)}>
              <Text style={styles.selectCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

export function MultiChoiceGroup({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string
  options: { label: string; value: string }[]
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}) {
  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceGrid}>
        {options.map((option) => (
          <Choice key={option.value} label={option.label} active={value.includes(option.value)} onPress={() => toggle(option.value)} />
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

export function ToggleGroup({
  label,
  value,
  onChange,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  trueLabel?: string
  falseLabel?: string
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        <Choice label={falseLabel} active={!value} onPress={() => onChange(false)} />
        <Choice label={trueLabel} active={value} onPress={() => onChange(true)} />
      </View>
    </View>
  )
}

// ── Repeatable section ──────────────────────────────────────────────────

export function RepeatableSection({
  title,
  hint,
  items,
  onAdd,
  onRemove,
  addLabel = 'Add another',
  renderItem,
  minItems = 0,
  emptyLabel = 'None added yet.',
}: {
  title: string
  hint?: string
  items: unknown[]
  onAdd: () => void
  onRemove: (index: number) => void
  addLabel?: string
  renderItem: (index: number) => ReactNode
  minItems?: number
  emptyLabel?: string
}) {
  return (
    <View style={styles.repeatableSection}>
      <View style={styles.repeatableHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onAdd} style={styles.addBtn} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ {addLabel}</Text>
        </TouchableOpacity>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {items.length === 0 ? <Text style={styles.emptyText}>{emptyLabel}</Text> : null}

      {items.map((_, index) => (
        <View key={index} style={styles.repeatableItem}>
          <View style={styles.repeatableItemHeader}>
            <Text style={styles.repeatableItemLabel}>#{index + 1}</Text>
            {items.length > minItems ? (
              <TouchableOpacity onPress={() => onRemove(index)} activeOpacity={0.85}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {renderItem(index)}
        </View>
      ))}
    </View>
  )
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.infoNote}>
      <Text style={styles.infoNoteText}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, color: colors.muted, fontSize: typography.small, fontFamily: typography.family.bold },
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
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  errorText: { marginTop: spacing.xs, color: colors.danger, fontSize: typography.small, fontFamily: typography.family.medium },
  choiceRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  choiceActive: { borderColor: colors.info, backgroundColor: colors.infoBackground },
  choiceText: { color: colors.muted, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'capitalize' },
  choiceTextActive: { color: colors.info },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold },
  hint: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginBottom: spacing.md },
  repeatableSection: { marginTop: spacing.sm, marginBottom: spacing.lg },
  repeatableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder },
  addBtnText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  emptyText: { color: colors.secondaryText, fontSize: typography.small, fontStyle: 'italic', marginBottom: spacing.sm },
  repeatableItem: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  repeatableItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  repeatableItemLabel: { color: colors.subtle, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase' },
  removeBtnText: { color: colors.danger, fontSize: typography.small, fontFamily: typography.family.bold },
  infoNote: { backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  infoNoteText: { color: colors.info, fontSize: typography.small, lineHeight: 18 },
  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValueText: { color: colors.primary, fontSize: typography.body, flex: 1 },
  selectPlaceholderText: { color: colors.subtle, fontSize: typography.body, flex: 1 },
  selectOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  selectSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, maxHeight: '70%' },
  selectSheetTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.md },
  selectList: { flexGrow: 0 },
  selectOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectOptionText: { color: colors.primary, fontSize: typography.body, flex: 1 },
  selectOptionTextActive: { color: colors.info, fontFamily: typography.family.bold },
  selectCloseBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.md },
  selectCloseBtnText: { color: colors.muted, fontSize: typography.body, fontFamily: typography.family.bold },
})
