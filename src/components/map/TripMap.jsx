import React from 'react';
import { T } from '../../styles/tokens';
import { loadGoogleMaps } from '../../utils/maps';

// Trip Map Component — embedded Google Map with route + pins
export function TripMap({ places, routePolyline, height, onDirectionsLoaded, travelMode: travelModeProp }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const polylineRef = React.useRef(null);
  const rendererRef = React.useRef(null);
  const callbackRef = React.useRef(onDirectionsLoaded);
  const renderedPlacesKey = React.useRef("");
  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState(null);

  callbackRef.current = onDirectionsLoaded;

  const placesKey = (places || []).join("|") + "|" + (travelModeProp || "driving");

  React.useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapReady(true))
      .catch(() => setMapError("Maps failed to load"));
  }, []);

  React.useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    if (mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 7,
      center: { lat: 54.5, lng: -3.0 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      gestureHandling: "none", // small preview map — disable all gestures to prevent page scroll hijacking
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
    mapInstanceRef.current = map;
  }, [mapReady]);

  React.useEffect(() => {
    if (!mapInstanceRef.current || !places || places.length === 0) return;
    if (renderedPlacesKey.current === placesKey) return;
    renderedPlacesKey.current = placesKey;

    const map = mapInstanceRef.current;
    const google = window.google;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (rendererRef.current) { rendererRef.current.setMap(null); rendererRef.current = null; }

    const bounds = new google.maps.LatLngBounds();
    const geocoder = new google.maps.Geocoder();

    const isReturnTrip = places.length > 2 && places[0].toLowerCase().trim() === places[places.length - 1].toLowerCase().trim();
    const markerPlaces = isReturnTrip ? places.slice(0, -1) : places;

    const geocodePromises = markerPlaces.map((place, i) =>
      new Promise((resolve) => {
        geocoder.geocode({ address: place }, (results, status) => {
          if (status === "OK" && results[0]) {
            const pos = results[0].geometry.location;
            const isStart = i === 0;
            const isEnd = i === markerPlaces.length - 1;
            const pinColor = isStart ? "#1B8F6A" : isEnd ? "#D85A30" : "#2E7CC9";
            const stopLabel = isStart ? "Start" : isEnd ? (isReturnTrip ? "Last stop" : "End") : `Stop ${i + 1}`;
            const marker = new google.maps.Marker({
              position: pos, map, title: place,
              label: { text: `${i + 1}`, color: "#fff", fontWeight: "600", fontSize: "11px" },
              icon: {
                path: google.maps.SymbolPath.CIRCLE, scale: 14,
                fillColor: pinColor,
                fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2,
              },
            });
            const info = new google.maps.InfoWindow({ content: `<div style="font-family:DM Sans,sans-serif;padding:2px 4px"><b>${place}</b><br><span style="font-size:11px;color:#666">${stopLabel}</span></div>` });
            marker.addListener("click", () => info.open(map, marker));
            markersRef.current.push(marker);
            bounds.extend(pos);
            resolve({ place, location: { lat: pos.lat(), lng: pos.lng() } });
          } else {
            resolve(null);
          }
        });
      })
    );

    Promise.all(geocodePromises).then((resolved) => {
      const validLocations = resolved.filter(Boolean);
      if (validLocations.length > 1) {
        map.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });

        const dirOrigin = validLocations[0].place;
        const dirDestination = isReturnTrip ? validLocations[0].place : validLocations[validLocations.length - 1].place;
        const dirWaypoints = isReturnTrip
          ? validLocations.slice(1).map(l => ({ location: l.place, stopover: true }))
          : validLocations.slice(1, -1).map(l => ({ location: l.place, stopover: true }));

        const gmTravelMode = (() => {
          const m = (travelModeProp || "").toLowerCase();
          if (/train|rail|transit|bus|public/.test(m)) return google.maps.TravelMode.TRANSIT;
          if (/walk|hiking|foot/.test(m)) return google.maps.TravelMode.WALKING;
          if (/bicy|bike|cycling/.test(m)) return google.maps.TravelMode.BICYCLING;
          return google.maps.TravelMode.DRIVING;
        })();

        const directionsService = new google.maps.DirectionsService();
        directionsService.route({
          origin: dirOrigin,
          destination: dirDestination,
          waypoints: gmTravelMode === google.maps.TravelMode.TRANSIT ? [] : dirWaypoints,
          travelMode: gmTravelMode,
          optimizeWaypoints: false,
        }, (result, status) => {
          if (status === "OK") {
            const renderer = new google.maps.DirectionsRenderer({
              map,
              directions: result,
              suppressMarkers: true,
              polylineOptions: { strokeColor: "#1B8F6A", strokeOpacity: 0.8, strokeWeight: 4 },
            });
            rendererRef.current = renderer;

            if (callbackRef.current) {
              const legs = result.routes[0].legs;
              const totalDist = legs.reduce((s, l) => s + l.distance.value, 0);
              const totalDur = legs.reduce((s, l) => s + l.duration.value, 0);
              callbackRef.current({
                legs: legs.map(l => ({ start: l.start_address, end: l.end_address, distance: l.distance.text, duration: l.duration.text })),
                totalDistance: (totalDist / 1609.34).toFixed(1) + " mi",
                totalDuration: Math.floor(totalDur / 3600) + " hr " + Math.round((totalDur % 3600) / 60) + " min",
              });
            }
          }
        });
      } else if (validLocations.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(12);
      }
    });
  }, [mapReady, placesKey]);

  React.useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
      if (rendererRef.current) { rendererRef.current.setMap(null); rendererRef.current = null; }
      renderedPlacesKey.current = "";
    };
  }, []);

  if (mapError) {
    return (
      <div style={{ height: height || 200, background: T.s2, borderRadius: T.rs, display: "flex", alignItems: "center", justifyContent: "center", color: T.t3, fontSize: 12 }}>
        🗺️ Map unavailable
      </div>
    );
  }

  return (
    <div style={{ position: "relative", borderRadius: T.rs, overflow: "hidden", border: `.5px solid ${T.border}`, touchAction: "pan-y" }}>
      <div ref={mapRef} style={{ width: "100%", height: height || 200, touchAction: "pan-y" }} />
      {!mapReady && (
        <div style={{ position: "absolute", inset: 0, background: T.s2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: T.t3 }}>
          Loading map...
        </div>
      )}
    </div>
  );
}
