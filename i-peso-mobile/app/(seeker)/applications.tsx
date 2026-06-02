import { View, Text, StyleSheet } from 'react-native'

export default function ApplicationsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>My Applications</Text>
      <Text style={s.sub}>Application tracking coming in Phase 4</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container : { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title     : { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  sub       : { fontSize: 14, color: '#64748b', marginTop: 8 },
})