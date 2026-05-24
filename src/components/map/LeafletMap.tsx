'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';

export type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  slug?: string;
  state?: string;
  suburb?: string;
};

type Props = {
  points: MapPoint[];
  // When true: render a single pin centred on it, no cluster, fixed zoom.
  // When false (default): cluster many pins, fit bounds to all of them.
  single?: boolean;
  height?: number | string;
};

// Default Leaflet marker icons reference asset paths that don't resolve under
// Webpack/Next bundling. We rebind to the CDN copies so the pin actually shows
// up instead of a broken-image triangle.
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const AUSTRALIA_CENTRE: [number, number] = [-25.2744, 133.7751];
const AUSTRALIA_ZOOM = 4;

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function LeafletMap({ points, single = false, height = 500 }: Props) {
  const validPoints = useMemo(
    () => points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [points],
  );

  if (validPoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-ink-100 bg-sand-100 text-sm text-ink-500"
        style={{ height }}
      >
        No coordinates available to plot.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100" style={{ height }}>
      <MapContainer
        center={AUSTRALIA_CENTRE}
        zoom={AUSTRALIA_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={validPoints} />
        {single ? (
          validPoints.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
              <Popup>
                <strong>{p.name}</strong>
                {p.suburb && (
                  <>
                    <br />
                    {p.suburb}
                    {p.state ? `, ${p.state}` : ''}
                  </>
                )}
              </Popup>
            </Marker>
          ))
        ) : (
          <MarkerClusterGroup chunkedLoading>
            {validPoints.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
                <Popup>
                  <strong>{p.name}</strong>
                  {p.suburb && (
                    <>
                      <br />
                      {p.suburb}
                      {p.state ? `, ${p.state}` : ''}
                    </>
                  )}
                  {p.slug && (
                    <>
                      <br />
                      <a href={`/communities/${p.slug}`} className="text-teal-700 underline">
                        View details →
                      </a>
                    </>
                  )}
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
}
