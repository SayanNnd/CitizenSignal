/**
 * Google Maps night style, applied through MapView.customMapStyle in dark mode.
 * Tinted to match darkPalette in theme.ts: land is Midnight Violet, water Coffee Bean,
 * streets step up through the berry shades, and main roads use Dark Amaranth.
 */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#191528' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9a8ca6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#110e1b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3c162f' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1c1a2e' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2140' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#191528' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3c162f' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#7c162e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#7d7088' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#110e1b' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5c4f68' }] },
];

/**
 * Day style tinted to match lightPalette in theme.ts: land is Powder Petal, water and parks Alabaster
 * Grey, main roads Cherry Blossom, labels Dusty Mauve.
 * Must always be a list, never undefined: react-native-maps ignores an undefined style on Android,
 * so switching back from dark mode would leave the dark style in place.
 */
export const LIGHT_MAP_STYLE: typeof DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#fff1ea' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a6168' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fff4ee' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#d8c9c4' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d8e2dc' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#f2dcd6' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffe5d9' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f4acb7' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9d8189' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d8d0' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7a8c82' }] },
];
