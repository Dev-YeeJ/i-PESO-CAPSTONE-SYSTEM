import { Linking, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import type { OfficeInfo } from '@/services/seekerService'
import { colors, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/components/site-content/RichText.jsx and richTextUtils.js.
// Plain React Native Text only — staff-written answers are never rendered as HTML/markdown,
// and never in a WebView.

const TOKEN = /\{office\.(name|address|phone|email|facebook|hours)\}/g
// Same pattern as the website's LINKISH: http(s) links and email addresses.
const LINKISH = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi

/** Fills {office.address}-style placeholders; a field PESO hasn't filled in reads "not on record". */
export function fillOfficeTokens(text: string, office: OfficeInfo | null | undefined) {
  if (!text) return ''
  return text.replace(TOKEN, (_, key: string) => {
    const field = (key === 'name' ? 'office_name' : key) as keyof OfficeInfo
    return office?.[field] || 'not on record'
  })
}

const open = (url: string) => { Linking.openURL(url).catch(() => undefined) }

function linkify(text: string, keyPrefix: string, style?: StyleProp<TextStyle>) {
  return text.split(LINKISH).map((part, index) => {
    if (index % 2 === 1) {
      const isEmail = !/^https?:\/\//i.test(part)
      return (
        <Text
          key={`${keyPrefix}-l${index}`}
          style={[style, styles.link]}
          onPress={() => open(isEmail ? `mailto:${part}` : part)}
          accessibilityRole="link"
        >
          {part}
        </Text>
      )
    }
    return part ? <Text key={`${keyPrefix}-t${index}`} style={style}>{part}</Text> : null
  })
}

/** `**bold**` plus tappable links/emails within one line. */
function InlineText({ text, keyPrefix }: { text: string; keyPrefix: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((piece, index) =>
        index % 2 === 1
          ? <Text key={`${keyPrefix}-b${index}`} style={styles.bold}>{linkify(piece, `${keyPrefix}-b${index}`, styles.bold)}</Text>
          : linkify(piece, `${keyPrefix}-p${index}`))}
    </>
  )
}

/** Split one paragraph block into runs of plain lines and bullet lines (as runsOf on the website). */
function runsOf(block: string) {
  const runs: { bullet: boolean; lines: string[] }[] = []
  block.split('\n').forEach((line) => {
    const bullet = /^\s*[-•*]\s+/.test(line)
    const content = bullet ? line.replace(/^\s*[-•*]\s+/, '') : line
    const last = runs[runs.length - 1]
    if (last && last.bullet === bullet) last.lines.push(content)
    else runs.push({ bullet, lines: [content] })
  })
  return runs
}

/** A blank line starts a paragraph; "- " lines are bullets; **bold**, links and emails inline. */
export function FaqAnswer({ text, office }: { text: string; office?: OfficeInfo | null }) {
  const filled = fillOfficeTokens(text ?? '', office).replace(/\r\n?/g, '\n').trim()
  if (!filled) return null

  return (
    <View style={styles.wrap}>
      {filled.split(/\n\s*\n/).map((block, b) =>
        runsOf(block).map((run, r) => {
          const key = `${b}-${r}`
          if (run.bullet) {
            return (
              <View key={key} style={styles.list}>
                {run.lines.map((line, l) => (
                  <View key={l} style={styles.bulletRow}>
                    <Text style={styles.text} importantForAccessibility="no">•</Text>
                    <Text style={[styles.text, styles.flex]}><InlineText text={line} keyPrefix={`${key}-${l}`} /></Text>
                  </View>
                ))}
              </View>
            )
          }
          return (
            <Text key={key} style={styles.text}>
              {run.lines.map((line, l) => (
                <Text key={l}>
                  {l > 0 ? '\n' : ''}
                  <InlineText text={line} keyPrefix={`${key}-${l}`} />
                </Text>
              ))}
            </Text>
          )
        }))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  flex: { flex: 1 },
  text: { ...textStyles.small, color: colors.textPrimary, lineHeight: 20 },
  bold: { fontFamily: textStyles.smallBold.fontFamily },
  link: { color: colors.secondary, textDecorationLine: 'underline', fontFamily: textStyles.smallBold.fontFamily },
  list: { gap: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.xs },
})
