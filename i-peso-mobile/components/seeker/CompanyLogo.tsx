import { useState } from 'react'
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radii, textStyles } from '@/theme'

// Mirrors CompanyMark in i-peso-frontend's JobSeekerHome.jsx: the logo when it loads, the
// company's initials when there is no logo or the image fails (a broken or moved file used to
// leave an empty box).

export function companyInitials(value: string | null | undefined) {
  return (value ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PE'
}

interface CompanyLogoProps {
  uri: string | null | undefined
  name: string | null | undefined
  size?: number
  /** 'initials' (default) or 'none' — render nothing when there's no usable logo. */
  fallback?: 'initials' | 'none'
  style?: StyleProp<ViewStyle>
}

export function CompanyLogo({ uri, name, size = 48, fallback = 'initials', style }: CompanyLogoProps) {
  // Keyed by uri so a new logo gets a fresh attempt after an earlier one failed.
  return <CompanyLogoInner key={uri ?? 'none'} uri={uri} name={name} size={size} fallback={fallback} style={style} />
}

function CompanyLogoInner({ uri, name, size = 48, fallback, style }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false)
  const box = { width: size, height: size }

  if (uri && !failed) {
    return (
      <View style={[styles.frame, box, style]}>
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
          onError={() => setFailed(true)}
          accessibilityLabel={name ? `${name} logo` : 'Company logo'}
        />
      </View>
    )
  }

  if (fallback === 'none') return null

  return (
    <View style={[styles.initials, box, style]} accessibilityLabel={name ? `${name} logo` : 'Company logo'}>
      <Text style={[styles.initialsText, size >= 64 && styles.initialsLarge]}>{companyInitials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  initials: { borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue50 },
  initialsText: { ...textStyles.smallBold, color: colors.blue700 },
  initialsLarge: { ...textStyles.title, color: colors.blue700 },
})
