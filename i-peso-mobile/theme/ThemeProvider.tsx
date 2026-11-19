import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { Appearance } from 'react-native'
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from '@react-navigation/native'
import { colorScheme, colors, isDark } from './index'

/**
 * App-wide theme (Phase 6 dark mode).
 *
 * The palette follows the phone's light/dark setting and is chosen once, before any screen
 * builds its StyleSheet (see `colorScheme` in theme/index.ts) — every screen keeps importing
 * `colors` by the same token names. Because those styles are created at import time, a
 * system-theme change while the app is open takes effect on the next launch;
 * `pendingScheme` exposes that so the UI can say so instead of half-switching.
 */
interface ThemeContextValue {
  scheme: 'light' | 'dark'
  isDark: boolean
  colors: typeof colors
  /** Set when the OS theme changed after launch: the new scheme, applied next start. */
  pendingScheme: 'light' | 'dark' | null
}

const ThemeContext = createContext<ThemeContextValue>({ scheme: colorScheme, isDark, colors, pendingScheme: null })

// React Navigation's container/scene colours, so transitions and empty frames never flash
// the library's default white/grey behind our screens.
const navigationTheme: Theme = {
  ...(isDark ? DarkTheme : DefaultTheme),
  colors: {
    ...(isDark ? DarkTheme : DefaultTheme).colors,
    primary: colors.secondary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pendingScheme, setPendingScheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: next }) => {
      const resolved = next === 'dark' ? 'dark' : 'light'
      setPendingScheme(resolved === colorScheme ? null : resolved)
    })
    return () => subscription.remove()
  }, [])

  return (
    <ThemeContext.Provider value={{ scheme: colorScheme, isDark, colors, pendingScheme }}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
