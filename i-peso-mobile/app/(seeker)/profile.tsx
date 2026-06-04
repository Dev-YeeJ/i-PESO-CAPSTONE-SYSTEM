import { View, Text, StyleSheet } from 'react-native'

export default function ProfileScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>My Profile</Text>
      <Text style={s.sub}>Profile editing coming in Phase 2</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container : { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title     : { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  sub       : { fontSize: 14, color: '#64748b', marginTop: 8 },
})