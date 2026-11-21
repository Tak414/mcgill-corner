"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { EventItem } from "@/lib/demo-data";

type Props = { events: EventItem[]; onSelect: (event: EventItem) => void };

export function InteractiveMap({ events, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!hostRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({ container: hostRef.current, style: "mapbox://styles/mapbox/dark-v11", center: [-73.579, 45.51], zoom: 12.3, attributionControl: true });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => {
      const neighborhoods = { type: "FeatureCollection" as const, features: [
        { type: "Feature" as const, properties: { name: "McGill Ghetto", explored: true }, geometry: { type: "Polygon" as const, coordinates: [[[-73.584,45.499],[-73.57,45.499],[-73.568,45.51],[-73.581,45.514],[-73.587,45.507],[-73.584,45.499]]] } },
        { type: "Feature" as const, properties: { name: "Mile End", explored: false }, geometry: { type: "Polygon" as const, coordinates: [[[-73.607,45.516],[-73.582,45.514],[-73.573,45.527],[-73.595,45.535],[-73.61,45.527],[-73.607,45.516]]] } },
        { type: "Feature" as const, properties: { name: "Plateau", explored: false }, geometry: { type: "Polygon" as const, coordinates: [[[-73.57,45.499],[-73.549,45.496],[-73.543,45.515],[-73.568,45.51],[-73.57,45.499]]] } },
      ] };
      map.addSource("unlock-neighborhoods", { type: "geojson", data: neighborhoods });
      map.addLayer({ id: "neighborhood-fill", type: "fill", source: "unlock-neighborhoods", paint: { "fill-color": ["case", ["get", "explored"], "#83ad94", "#53647c"], "fill-opacity": 0.11 } });
      map.addLayer({ id: "neighborhood-outline", type: "line", source: "unlock-neighborhoods", paint: { "line-color": ["case", ["get", "explored"], "#a2c9ad", "#8295b3"], "line-opacity": 0.48, "line-width": 1.3, "line-dasharray": [2, 2] } });
      map.addLayer({ id: "neighborhood-label", type: "symbol", source: "unlock-neighborhoods", layout: { "text-field": ["get", "name"], "text-size": 10, "text-letter-spacing": 0.1 }, paint: { "text-color": "#a6b5c2", "text-halo-color": "#111820", "text-halo-width": 1.5 } });
      map.on("click", "neighborhood-fill", (event) => { if (event.features?.[0]?.properties?.name) map.easeTo({ center: event.lngLat, zoom: Math.max(map.getZoom(), 13.2), duration: 450 }); });
      map.on("mouseenter", "neighborhood-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "neighborhood-fill", () => { map.getCanvas().style.cursor = ""; });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers: mapboxgl.Marker[] = [];
    const renderMarkers = () => events.forEach((event, index) => {
      const el = document.createElement("button"); el.className = "mb-event-marker"; el.type = "button";
      el.setAttribute("aria-label", `Open ${event.title}`); el.style.setProperty("--marker-color", event.color);
      el.innerHTML = `<span>${["✳", "⌁", "◌", "↟", "▦"][index % 5]}</span>`;
      el.addEventListener("click", () => onSelectRef.current(event));
      markers.push(new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([event.lng, event.lat]).addTo(map));
    });
    if (map.isStyleLoaded()) renderMarkers(); else map.once("load", renderMarkers);
    const locate = (event: Event) => { const detail = (event as CustomEvent<{ longitude: number; latitude: number }>).detail; if (detail) map.easeTo({ center: [detail.longitude, detail.latitude], zoom: 14, duration: 700 }); };
    window.addEventListener("unlock:locate", locate);
    return () => { map.off("load", renderMarkers); window.removeEventListener("unlock:locate", locate); markers.forEach((marker) => marker.remove()); };
  }, [events]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return null;
  return <div className="mapbox-surface" ref={hostRef} aria-label="Interactive map of campus and nearby events" />;
}
