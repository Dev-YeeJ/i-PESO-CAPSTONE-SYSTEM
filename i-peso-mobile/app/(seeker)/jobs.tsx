import { View, Text, StyleSheet } from 'react-native'

export default function JobsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Find Jobs</Text>
      <Text style={s.sub}>Job search coming in Phase 3</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container : { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title     : { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  sub       : { fontSize: 14, color: '#64748b', marginTop: 8 },
})