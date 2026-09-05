import { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import WebView from 'react-native-webview'

export interface LeafletMarker {
  postId: string
  lat: number
  lng: number
  color: string
}

interface LeafletMapProps {
  region: { latitude: number; longitude: number }
  markers: LeafletMarker[]
  onMarkerPress: (postId: string) => void
}

/**
 * Mirrors i-peso-frontend's JobVacancyMap.jsx fallback path (LeafletFallbackMap.jsx) —
 * Leaflet + free OpenStreetMap tiles, no API key required. Web only reaches this as a
 * fallback when its Google Maps key is missing/broken; mobile uses it as the primary
 * (and only) map so it never depends on Google Cloud Console config at all.
 */
function buildHtml(region: LeafletMapProps['region'], markers: LeafletMarker[]) {
  const markersJson = JSON.stringify(markers)
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
  var map = L.map('map', { zoomControl: false }).setView([${region.latitude}, ${region.longitude}], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  L.circleMarker([${region.latitude}, ${region.longitude}], { radius: 8, fillColor: '#2563EB', color: '#fff', weight: 2, fillOpacity: 1 }).addTo(map);
  var markers = ${markersJson};
  markers.forEach(function (item) {
    var marker = L.circleMarker([item.lat, item.lng], { radius: 9, fillColor: item.color, color: '#fff', weight: 2, fillOpacity: 1 }).addTo(map);
    marker.on('click', function () {
      window.ReactNativeWebView.postMessage(item.postId);
    });
  });
</script>
</body>
</html>`
}

export function LeafletMap({ region, markers, onMarkerPress }: LeafletMapProps) {
  const html = useMemo(
    () => buildHtml(region, markers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region.latitude, region.longitude, JSON.stringify(markers)]
  )

  return (
    <WebView
      style={styles.webview}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={(event) => onMarkerPress(event.nativeEvent.data)}
    />
  )
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
})
