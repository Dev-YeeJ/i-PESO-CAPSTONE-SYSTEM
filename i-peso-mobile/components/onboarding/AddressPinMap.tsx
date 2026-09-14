import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'
import { colors, radii } from '@/theme'

interface AddressPinMapProps {
  latitude: number
  longitude: number
  onPinMoved: (lat: number, lng: number) => void
}

/**
 * Mirrors i-peso-frontend's AddressPicker.jsx draggable-pin preview — once
 * coordinates are set (via search or current location), shows them on an
 * inline Leaflet map with a draggable marker so the user can fine-tune the
 * exact spot instead of trusting geocoding/GPS alone. Uses the same
 * WebView + Leaflet/OSM approach as LeafletMap.tsx (no Google Maps key
 * needed).
 */
function buildHtml(latitude: number, longitude: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:#EEF1F6;}.leaflet-control-attribution{font-size:9px;}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: false }).setView([${latitude}, ${longitude}], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  var pinIcon = L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    html: '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3)"></span>'
  });
  var marker = L.marker([${latitude}, ${longitude}], { icon: pinIcon, draggable: true }).addTo(map);
  marker.on('dragend', function () {
    var position = marker.getLatLng();
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: position.lat, lng: position.lng }));
  });
</script>
</body>
</html>`
}

export function AddressPinMap({ latitude, longitude, onPinMoved }: AddressPinMapProps) {
  const html = useMemo(() => buildHtml(latitude, longitude), [latitude, longitude])

  return (
    <View style={styles.wrap}>
      <WebView
        style={styles.webview}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          try {
            const { lat, lng } = JSON.parse(event.nativeEvent.data)
            onPinMoved(lat, lng)
          } catch {
            // ignore malformed messages
          }
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { height: 220, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginTop: 8, marginBottom: 8 },
  webview: { flex: 1 },
})
