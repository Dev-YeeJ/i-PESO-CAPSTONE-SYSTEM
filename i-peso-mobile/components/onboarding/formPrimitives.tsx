import { ReactNode } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
} from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

// ── Server error helpers ───────────────────────────────────────────────────

export type ServerErrors = Record<string, string[]>

export function fieldError(errors: ServerErrors | undefined, path: string): string | undefined {
  return errors?.[path]?.[0]
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
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  errorText: { marginTop: spacing.xs, color: colors.danger, fontSize: typography.small, fontWeight: typography.medium },
  choiceRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  choiceActive: { borderColor: colors.info, backgroundColor: colors.infoBackground },
  choiceText: { color: colors.muted, fontSize: typography.small, fontWeight: typography.semibold, textTransform: 'capitalize' },
  choiceTextActive: { color: colors.info },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold },
  hint: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginBottom: spacing.md },
  repeatableSection: { marginTop: spacing.sm, marginBottom: spacing.lg },
  repeatableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder },
  addBtnText: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold },
  emptyText: { color: colors.secondaryText, fontSize: typography.small, fontStyle: 'italic', marginBottom: spacing.sm },
  repeatableItem: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  repeatableItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  repeatableItemLabel: { color: colors.subtle, fontSize: typography.small, fontWeight: typography.bold, textTransform: 'uppercase' },
  removeBtnText: { color: colors.danger, fontSize: typography.small, fontWeight: typography.bold },
  infoNote: { backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  infoNoteText: { color: colors.info, fontSize: typography.small, lineHeight: 18 },
})
