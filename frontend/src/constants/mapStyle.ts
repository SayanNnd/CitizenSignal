/** Google Maps night style, applied through MapView.customMapStyle in dark mode. */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#161d25' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a96a3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1217' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a3541' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14261f' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26323e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#161d25' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2f3d4b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4a5a' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#66737f' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1016' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5865' }] },
];
