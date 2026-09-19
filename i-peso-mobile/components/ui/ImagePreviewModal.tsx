import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, spacing } from '@/theme'

interface ImagePreviewModalProps {
  visible: boolean
  uri: string | null
  headers?: Record<string, string>
  onClose: () => void
}

/** Full-screen, tap-to-close preview for a single remote image — used wherever a card shows
 * a thumbnail that deserves a closer look (poster images, submitted documents, etc.). */
export function ImagePreviewModal({ visible, uri, headers, onClose }: ImagePreviewModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
          hitSlop={12}
        >
          <MaterialIcons name="close" size={26} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageWrap} activeOpacity={1} onPress={onClose}>
          {uri ? (
            <Image
              source={{ uri, headers }}
              style={styles.image}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  closeBtn: { position: 'absolute', top: spacing.xxl, right: spacing.lg, zIndex: 1, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
})
