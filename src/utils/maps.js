// ─── Google Maps Integration ───
export const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || "";

let mapsLoaded = false;
let mapsLoadPromise = null;

export function loadGoogleMaps() {
  if (mapsLoaded && window.google?.maps) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { mapsLoaded = true; resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => { mapsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

// Decode Google polyline encoding
export function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
