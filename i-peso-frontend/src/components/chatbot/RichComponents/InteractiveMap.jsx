import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter = [15.9761, 120.5714]; // Urdaneta City coordinates

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function InteractiveMap({ jobs = [] }) {
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  
  // Filter jobs with valid coordinates
  const mappedJobs = jobs.filter(job => job.latitude != null && job.longitude != null);
  
  useEffect(() => {
    if (mappedJobs.length > 0) {
      setMapCenter([mappedJobs[0].latitude, mappedJobs[0].longitude]);
    }
  }, [mappedJobs.length]);

  if (mappedJobs.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 shadow-sm my-3 z-0"
    >
      <MapContainer 
        center={mapCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        <MapController center={mapCenter} zoom={13} />
        
        {mappedJobs.map((job, idx) => (
          <Marker key={job.post_id || idx} position={[job.latitude, job.longitude]}>
            <Popup className="ipeso-map-popup">
              <div className="font-sans">
                <h3 className="font-bold text-xs text-gray-900 mb-0.5">{job.job_title}</h3>
                <p className="text-[10px] text-gray-600 mb-2">{job.employer}</p>
                <a 
                  href={`/jobs/${job.post_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded block text-center font-medium"
                >
                  View Job
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </motion.div>
  );
}
