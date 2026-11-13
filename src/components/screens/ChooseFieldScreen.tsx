/**
 * AgroShift Gambia — Screen 2: Choose a Field
 * Faithful to Figma Page 2:
 * - Real, functional Leaflet + OpenStreetMap interactive map
 * - Unrestricted boundary editor:
 *   - Freely drag any vertex over any distance without snapping back
 *   - Add points by clicking on the map or midpoint handles
 *   - Delete unwanted vertices with minimum 3-vertex validation
 *   - Move entire boundary if needed
 *   - Real-time live synchronization with Turf.js:
 *     - Polygon area in m² and ha
 *     - Centroid [lat, lng]
 *     - Bounding box
 *     - Coordinates table
 *   - Edit modes: "Edit Boundary" (drag/add/delete vertices), "Draw Boundary", "Confirm Boundary"
 *   - Boundary validation (checks self-intersection using Turf.js kinks, minimum 3 points)
 *   - "Use My Location" via browser Geolocation API
 *   - "Select Existing" presets (Brikama Manduar, Kotu, Sukuta, Basse)
 *   - Search location / coordinate bar
 *   - State persistence across re-renders and navigation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { useAgroShift } from '../../context/AgroShiftContext';
import {
  Search,
  Crosshair,
  Plus,
  Minus,
  CheckCircle2,
  Navigation,
  Pencil,
  MapPin,
  FolderOpen,
  ArrowRight,
  RotateCcw,
  Trash2,
  Check,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Move,
  Scissors,
  CheckCheck,
} from 'lucide-react';

interface PresetField {
  id: string;
  name: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  size_ha: number;
  polygon: [number, number][]; // [lat, lng] array
}

// Gambian preset fields with accurate pilot polygons around Manduar, Kotu, Sukuta, Basse
const PRESET_FIELDS: PresetField[] = [
  {
    id: 'field-001',
    name: 'Brikama Manduar Pilot Field',
    district: 'Brikama Manduar',
    region: 'West Coast Region',
    lat: 13.24890667,
    lng: -16.61527333,
    size_ha: 2.5,
    polygon: [
      [13.2501, -16.6165],
      [13.2505, -16.6142],
      [13.2478, -16.6139],
      [13.2474, -16.6161],
    ],
  },
  {
    id: 'field-002',
    name: 'Kotu Community Field',
    district: 'Kotu',
    region: 'Kanifing Municipality',
    lat: 13.4421,
    lng: -16.7089,
    size_ha: 1.8,
    polygon: [
      [13.4430, -16.7100],
      [13.4435, -16.7075],
      [13.4412, -16.7078],
      [13.4408, -16.7098],
    ],
  },
  {
    id: 'field-003',
    name: 'Sukuta Farmland Plot',
    district: 'Sukuta',
    region: 'Kombo North',
    lat: 13.4115,
    lng: -16.7032,
    size_ha: 3.2,
    polygon: [
      [13.4130, -16.7050],
      [13.4135, -16.7015],
      [13.4100, -16.7010],
      [13.4095, -16.7045],
    ],
  },
  {
    id: 'field-004',
    name: 'Basse Santa Su Upland',
    district: 'Basse',
    region: 'Upper River Region',
    lat: 13.3142,
    lng: -14.2135,
    size_ha: 4.0,
    polygon: [
      [13.3160, -14.2155],
      [13.3165, -14.2115],
      [13.3125, -14.2110],
      [13.3120, -14.2150],
    ],
  },
];

// Custom HTML DivIcon generators
const createVertexIcon = (index: number, isSelected: boolean = false) => {
  return L.divIcon({
    className: 'custom-map-vertex-icon',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background-color: ${isSelected ? '#ea580c' : '#ffffff'};
        border: 2.5px solid ${isSelected ? '#9a3412' : '#166534'};
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        font-size: 10px;
        font-weight: bold;
        color: ${isSelected ? '#ffffff' : '#166534'};
        cursor: grab;
        user-select: none;
        transition: transform 0.15s ease;
      ">${index + 1}</div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const createMidpointIcon = () => {
  return L.divIcon({
    className: 'custom-map-midpoint-icon',
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background-color: #f0fdf4;
        border: 2px dashed #166534;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #166534;
        cursor: pointer;
      ">+</div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'custom-user-location-icon',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.25);
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 14px;
          height: 14px;
          margin: 5px;
          border-radius: 50%;
          background: #2563eb;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export const ChooseFieldScreen: React.FC = () => {
  const {
    location,
    setLocation,
    fieldDetails,
    setFieldDetails,
    setSelectedFieldId,
    nextStep,
  } = useAgroShift();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const vertexMarkersRef = useRef<L.Marker[]>([]);
  const midpointMarkersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Maintain active points in a ref to avoid stale closures in Leaflet events
  const pointsRef = useRef<[number, number][]>(
    (() => {
      if (location.boundary_geojson?.geometry?.coordinates?.[0]?.length >= 4) {
        const ring = location.boundary_geojson.geometry.coordinates[0];
        return ring.slice(0, -1).map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
      }
      return PRESET_FIELDS[0].polygon;
    })()
  );

  const [points, setPoints] = useState<[number, number][]>(pointsRef.current);
  const [history, setHistory] = useState<[number, number][][]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [isDrawingNew, setIsDrawingNew] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMode, setActiveMode] = useState<'draw' | 'edit' | 'select' | 'locate'>('edit');
  const [showPresets, setShowPresets] = useState(false);
  const [geoStatus, setGeoStatus] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [calculatedAreaHa, setCalculatedAreaHa] = useState<number>(fieldDetails.size_ha || 2.5);
  const [calculatedAreaM2, setCalculatedAreaM2] = useState<number>((fieldDetails.size_ha || 2.5) * 10000);
  const [centroidCoords, setCentroidCoords] = useState<[number, number]>([
    location.latitude || 13.24890667,
    location.longitude || -16.61527333,
  ]);
  const [bboxCoords, setBboxCoords] = useState<[number, number, number, number] | null>(null);
  const [hasSelfIntersection, setHasSelfIntersection] = useState<boolean>(false);

  // Sync ref with state
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Synchronise points with Turf.js calculation and AgroShiftContext
  const updateGeospatialMetrics = useCallback((currentPoints: [number, number][]) => {
    if (currentPoints.length < 3) {
      setHasSelfIntersection(false);
      return;
    }

    try {
      // Turf expects [lng, lat] coordinates
      const turfCoords = currentPoints.map(([lat, lng]) => [lng, lat]);
      // Close ring for turf polygon
      if (
        turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
        turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]
      ) {
        turfCoords.push([...turfCoords[0]]);
      }

      const polygonFeature = turf.polygon([turfCoords]);

      // Check self-intersection using turf.kinks
      const kinks = turf.kinks(polygonFeature);
      const isSelfIntersecting = kinks.features.length > 0;
      setHasSelfIntersection(isSelfIntersecting);

      if (isSelfIntersecting) {
        setGeoStatus({
          type: 'error',
          message: 'Warning: Boundary edges cross each other (self-intersection). Drag vertices to uncross them.',
        });
      }

      const areaM2 = turf.area(polygonFeature);
      const areaHa = Math.round((areaM2 / 10000) * 100) / 100;
      setCalculatedAreaM2(Math.round(areaM2));
      setCalculatedAreaHa(areaHa > 0 ? areaHa : 0.01);

      const centroid = turf.centroid(polygonFeature);
      const [cLng, cLat] = centroid.geometry.coordinates;
      setCentroidCoords([cLat, cLng]);

      const bbox = turf.bbox(polygonFeature) as [number, number, number, number];
      setBboxCoords(bbox);

      // Update shared context
      setFieldDetails((prev) => ({
        ...prev,
        size_ha: areaHa > 0 ? areaHa : prev.size_ha,
      }));

      setLocation((prev) => ({
        ...prev,
        latitude: cLat,
        longitude: cLng,
        coordinates: [cLat, cLng],
        boundary_geojson: polygonFeature,
      }));
    } catch (err) {
      console.warn('Geospatial calculation note:', err);
    }
  }, [setFieldDetails, setLocation]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = location.latitude || 13.24890667;
    const initialLng = location.longitude || -16.61527333;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    mapInstanceRef.current = map;

    // Initial metrics calculation
    updateGeospatialMetrics(pointsRef.current);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once

  // Render & sync map layers without recreating markers on every drag coordinate step
  const renderLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentPts = pointsRef.current;

    // 1. Clear old layers
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }
    vertexMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    vertexMarkersRef.current = [];
    midpointMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    midpointMarkersRef.current = [];

    // 2. Render Polygon if >= 3 points and not drawing fresh
    if (currentPts.length >= 3 && !isDrawingNew) {
      const polygon = L.polygon(currentPts, {
        color: hasSelfIntersection ? '#dc2626' : '#15803d',
        weight: 3,
        fillColor: hasSelfIntersection ? '#ef4444' : '#22c55e',
        fillOpacity: 0.35,
      }).addTo(map);

      polygonLayerRef.current = polygon;
    } else if (currentPts.length >= 2) {
      const polyline = L.polyline(currentPts, {
        color: '#15803d',
        weight: 2.5,
        dashArray: '6, 6',
      }).addTo(map);

      polylineLayerRef.current = polyline;
    }

    // 3. Render Draggable Vertex Markers if editing is active
    if (isEditing && !isConfirmed) {
      currentPts.forEach((coord, idx) => {
        const marker = L.marker(coord, {
          icon: createVertexIcon(idx),
          draggable: true,
          riseOnHover: true,
        }).addTo(map);

        // DRAG EVENT: Update polygon and live metrics WITHOUT triggering full state remount
        marker.on('drag', (e) => {
          const newLatLng = (e as any).target.getLatLng();
          pointsRef.current[idx] = [newLatLng.lat, newLatLng.lng];

          // Update active polygon stroke/fill live on map
          if (polygonLayerRef.current) {
            polygonLayerRef.current.setLatLngs(pointsRef.current);
          } else if (polylineLayerRef.current) {
            polylineLayerRef.current.setLatLngs(pointsRef.current);
          }

          // Move midpoints live
          updateMidpointPositions();
        });

        // DRAGSTART: Record history state for undo
        marker.on('dragstart', () => {
          setHistory((prev) => [...prev.slice(-10), [...pointsRef.current]]);
        });

        // DRAGEND: Commit permanent coordinates to React state and context
        marker.on('dragend', () => {
          const finalPoints = [...pointsRef.current];
          setPoints(finalPoints);
          updateGeospatialMetrics(finalPoints);
          setGeoStatus({
            type: 'success',
            message: `Vertex ${idx + 1} updated to ${finalPoints[idx][0].toFixed(5)}°N, ${finalPoints[idx][1].toFixed(5)}°W.`,
          });
        });

        // Right-click or double-click to delete vertex
        marker.on('contextmenu', (e) => {
          L.DomEvent.stopPropagation(e);
          if (pointsRef.current.length <= 3) {
            setGeoStatus({
              type: 'error',
              message: 'Cannot remove vertex: A farm boundary requires at least 3 vertices.',
            });
            return;
          }
          setHistory((prev) => [...prev, [...pointsRef.current]]);
          const updated = pointsRef.current.filter((_, i) => i !== idx);
          pointsRef.current = updated;
          setPoints(updated);
          updateGeospatialMetrics(updated);
          setGeoStatus({
            type: 'info',
            message: `Removed vertex ${idx + 1}.`,
          });
        });

        marker.bindTooltip(`Vertex ${idx + 1} (Drag to move · Right-click to remove)`, {
          direction: 'top',
          offset: [0, -12],
        });

        vertexMarkersRef.current.push(marker);
      });

      // 4. Render Edge Midpoint "Add Vertex" Handles
      if (currentPts.length >= 3 && !isDrawingNew) {
        for (let i = 0; i < currentPts.length; i++) {
          const p1 = currentPts[i];
          const p2 = currentPts[(i + 1) % currentPts.length];
          const midLat = (p1[0] + p2[0]) / 2;
          const midLng = (p1[1] + p2[1]) / 2;

          const midMarker = L.marker([midLat, midLng], {
            icon: createMidpointIcon(),
            riseOnHover: true,
          }).addTo(map);

          const insertIndex = i + 1;
          midMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setHistory((prev) => [...prev, [...pointsRef.current]]);
            const updated = [
              ...pointsRef.current.slice(0, insertIndex),
              [midLat, midLng] as [number, number],
              ...pointsRef.current.slice(insertIndex),
            ];
            pointsRef.current = updated;
            setPoints(updated);
            updateGeospatialMetrics(updated);
            setGeoStatus({
              type: 'success',
              message: `Added new vertex ${insertIndex + 1} along edge. Drag to position.`,
            });
          });

          midMarker.bindTooltip('Click to add vertex on this edge', {
            direction: 'center',
            offset: [0, -10],
          });

          midpointMarkersRef.current.push(midMarker);
        }
      }
    }
  }, [isEditing, isConfirmed, isDrawingNew, hasSelfIntersection, updateGeospatialMetrics]);

  // Fast helper to reposition midpoints during live vertex dragging
  const updateMidpointPositions = () => {
    const pts = pointsRef.current;
    if (pts.length < 3 || midpointMarkersRef.current.length !== pts.length) return;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;
      midpointMarkersRef.current[i].setLatLng([midLat, midLng]);
    }
  };

  // Re-render map layers whenever points array reference or editing modes change
  useEffect(() => {
    renderLayers();
  }, [points, isEditing, isConfirmed, isDrawingNew, renderLayers]);

  // Handle map click for adding points
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // If drawing brand new boundary
      if (isDrawingNew) {
        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];

        // Auto-close if clicked near start with >= 3 points
        if (pointsRef.current.length >= 3) {
          const firstPt = pointsRef.current[0];
          const dist = map.distance([firstPt[0], firstPt[1]], [newPoint[0], newPoint[1]]);
          if (dist < 30) {
            setIsDrawingNew(false);
            setIsEditing(true);
            updateGeospatialMetrics(pointsRef.current);
            setGeoStatus({
              type: 'success',
              message: `Boundary closed with ${pointsRef.current.length} vertices. You can now drag any point.`,
            });
            return;
          }
        }

        setHistory((prev) => [...prev, [...pointsRef.current]]);
        const next = [...pointsRef.current, newPoint];
        pointsRef.current = next;
        setPoints(next);
        if (next.length >= 3) {
          updateGeospatialMetrics(next);
        }
        return;
      }

      // If active mode is "add", click anywhere on map appends vertex
      if (activeMode === 'draw') {
        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng];
        setHistory((prev) => [...prev, [...pointsRef.current]]);
        const next = [...pointsRef.current, newPoint];
        pointsRef.current = next;
        setPoints(next);
        updateGeospatialMetrics(next);
        setGeoStatus({
          type: 'success',
          message: `Added vertex ${next.length}. Drag to reposition.`,
        });
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingNew, activeMode, updateGeospatialMetrics]);

  // Toolbar Actions
  const handleStartDrawNew = () => {
    setHistory((prev) => [...prev, [...pointsRef.current]]);
    pointsRef.current = [];
    setPoints([]);
    setIsDrawingNew(true);
    setIsEditing(true);
    setIsConfirmed(false);
    setActiveMode('draw');
    setGeoStatus({
      type: 'info',
      message: 'Click points around the perimeter of your field. Click the first point or "Finish Drawing" when done.',
    });
  };

  const handleFinishDrawing = () => {
    if (pointsRef.current.length < 3) {
      setGeoStatus({
        type: 'error',
        message: 'A field boundary requires at least 3 perimeter vertices.',
      });
      return;
    }
    setIsDrawingNew(false);
    setIsEditing(true);
    setActiveMode('edit');
    updateGeospatialMetrics(pointsRef.current);
    setGeoStatus({
      type: 'success',
      message: `Boundary established! Drag any vertex freely to fit field corners.`,
    });
  };

  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
    setIsConfirmed(false);
    setActiveMode('edit');
    setGeoStatus({
      type: 'info',
      message: isEditing ? 'Boundary locked.' : 'Boundary editing enabled. Drag vertices freely or click (+) midpoints to add corners.',
    });
  };

  const handleConfirmBoundary = () => {
    if (pointsRef.current.length < 3) {
      setGeoStatus({
        type: 'error',
        message: 'Cannot confirm: Farm boundary requires at least 3 vertices.',
      });
      return;
    }

    if (hasSelfIntersection) {
      setGeoStatus({
        type: 'error',
        message: 'Cannot confirm: Boundary edges are crossing. Please uncross vertices first.',
      });
      return;
    }

    setIsConfirmed(true);
    setIsEditing(false);
    updateGeospatialMetrics(pointsRef.current);
    setGeoStatus({
      type: 'success',
      message: `Boundary confirmed! Total area: ${calculatedAreaHa.toFixed(2)} ha (${calculatedAreaM2.toLocaleString()} m²).`,
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevPoints = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    pointsRef.current = prevPoints;
    setPoints(prevPoints);
    updateGeospatialMetrics(prevPoints);
    setGeoStatus({
      type: 'info',
      message: 'Reverted to previous boundary shape.',
    });
  };

  const handleClearBoundary = () => {
    setHistory((prev) => [...prev, [...pointsRef.current]]);
    pointsRef.current = [];
    setPoints([]);
    setIsDrawingNew(true);
    setIsEditing(true);
    setIsConfirmed(false);
    setGeoStatus({
      type: 'info',
      message: 'Boundary cleared. Click on the map to start tracing a new perimeter.',
    });
  };

  // Zoom helpers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleFitBounds = () => {
    if (!mapInstanceRef.current) return;
    if (pointsRef.current.length > 0) {
      const bounds = L.latLngBounds(pointsRef.current);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    } else {
      mapInstanceRef.current.setView([centroidCoords[0], centroidCoords[1]], 16);
    }
  };

  // Browser Geolocation ("Use My Location")
  const handleUseMyLocation = () => {
    setActiveMode('locate');
    setGeoStatus({
      type: 'info',
      message: 'Acquiring high-accuracy GPS position from your device...',
    });

    if (!navigator.geolocation) {
      setGeoStatus({
        type: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setGeoStatus({
          type: 'success',
          message: `GPS location acquired (±${Math.round(pos.coords.accuracy)}m). Centering map.`,
        });

        const map = mapInstanceRef.current;
        if (map) {
          map.setView([lat, lng], 17);

          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          const uMarker = L.marker([lat, lng], {
            icon: createUserLocationIcon(),
          }).addTo(map);

          uMarker.bindPopup(`<b>Your Current Location</b><br/>Lat: ${lat.toFixed(5)}<br/>Lng: ${lng.toFixed(5)}`).openPopup();
          userMarkerRef.current = uMarker;
        }

        setLocation((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          coordinates: [lat, lng],
          district: prev.district || 'My Farm Location',
        }));
      },
      (err) => {
        setGeoStatus({
          type: 'error',
          message: `Unable to retrieve device GPS (${err.message}). Centering on Gambian pilot field.`,
        });
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([13.24890667, -16.61527333], 16);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Preset Selection
  const handleSelectPreset = (preset: PresetField) => {
    setSelectedFieldId(preset.id);
    setHistory((prev) => [...prev, [...pointsRef.current]]);
    pointsRef.current = preset.polygon;
    setPoints(preset.polygon);
    setIsDrawingNew(false);
    setIsEditing(true);
    setIsConfirmed(false);

    setLocation({
      district: preset.district,
      region: preset.region,
      country: 'The Gambia',
      latitude: preset.lat,
      longitude: preset.lng,
      coordinates: [preset.lat, preset.lng],
    });

    setFieldDetails((prev) => ({
      ...prev,
      name: preset.name,
      size_ha: preset.size_ha,
    }));

    setShowPresets(false);
    updateGeospatialMetrics(preset.polygon);

    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(preset.polygon);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    }

    setGeoStatus({
      type: 'success',
      message: `Loaded ${preset.name} (${preset.size_ha} ha, ${preset.region}). Drag any vertex to customize.`,
    });
  };

  // Search District / Coordinates
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.toLowerCase().trim();
    const matchedPreset = PRESET_FIELDS.find(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q)
    );

    if (matchedPreset) {
      handleSelectPreset(matchedPreset);
      return;
    }

    const coordsMatch = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordsMatch) {
      const sLat = parseFloat(coordsMatch[1]);
      const sLng = parseFloat(coordsMatch[3]);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([sLat, sLng], 16);
        setGeoStatus({
          type: 'info',
          message: `Moved map to coordinates ${sLat.toFixed(5)}, ${sLng.toFixed(5)}. Click 'Draw Boundary' to outline farm.`,
        });
      }
      return;
    }

    setGeoStatus({
      type: 'info',
      message: `Searching for "${searchQuery}" in The Gambia. Try Brikama, Kotu, Sukuta, or Basse.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Bar Row (Figma Page 2) */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search location... (e.g. Brikama, Kotu, Sukuta, or Lat, Lng)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-800 shadow-xs"
          />
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          className="w-full sm:w-auto px-5 py-2.5 bg-green-800 hover:bg-green-900 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition shrink-0 cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
          <span>Use My Location</span>
        </button>
      </form>

      {/* Geolocation & Drawing Status Notification */}
      {geoStatus && (
        <div
          className={`flex items-start justify-between gap-3 p-3 rounded-lg text-xs transition ${
            geoStatus.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : geoStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {geoStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            ) : geoStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <MapPin className="w-4 h-4 shrink-0 text-blue-600" />
            )}
            <span>{geoStatus.message}</span>
          </div>
          <button
            onClick={() => setGeoStatus(null)}
            className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Map & Define Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Leaflet Map Container */}
        <div className="lg:col-span-8 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative h-[460px] sm:h-[530px] flex flex-col">
          {/* Real Leaflet Map DOM Mount Node */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Controls (+ / - / Recenter) in Top Left (Figma P2) */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 bg-white hover:bg-gray-50 text-gray-800 rounded-lg shadow-md border border-gray-200 flex items-center justify-center font-bold text-base transition cursor-pointer"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 bg-white hover:bg-gray-50 text-gray-800 rounded-lg shadow-md border border-gray-200 flex items-center justify-center font-bold text-base transition cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitBounds}
              className="w-9 h-9 bg-white hover:bg-gray-50 text-gray-800 rounded-lg shadow-md border border-gray-200 flex items-center justify-center transition cursor-pointer mt-0.5"
              title="Fit to Farm Boundary"
              aria-label="Fit to farm boundary"
            >
              <Maximize2 className="w-4 h-4 text-green-800" />
            </button>
          </div>

          {/* Interactive Boundary Editor Toolbar floating over Top Right of Map */}
          <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2 z-10">
            {isDrawingNew ? (
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl border border-gray-200 shadow-md">
                <span className="text-[11px] font-semibold text-emerald-800 px-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Drawing ({points.length} pts)
                </span>
                <button
                  type="button"
                  onClick={handleFinishDrawing}
                  disabled={points.length < 3}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
                  title="Finish and close polygon"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Finish</span>
                </button>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0 && points.length === 0}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs rounded-lg transition cursor-pointer"
                  title="Undo point"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClearBoundary}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs rounded-lg transition cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl border border-gray-200 shadow-md">
                <button
                  type="button"
                  onClick={handleToggleEdit}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    isEditing && !isConfirmed
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                  title="Toggle vertex drag editing"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isEditing && !isConfirmed ? 'Editing Vertices' : 'Edit Boundary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBoundary}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    isConfirmed
                      ? 'bg-green-800 text-white'
                      : 'bg-green-700 hover:bg-green-800 text-white shadow-xs'
                  }`}
                  title="Confirm boundary coordinates"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{isConfirmed ? 'Confirmed' : 'Confirm Boundary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-xs rounded-lg transition cursor-pointer"
                  title="Undo last change"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClearBoundary}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs rounded-lg transition cursor-pointer"
                  title="Redraw boundary"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Left Scale & Centroid Indicator (Figma P2) */}
          <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-2.5 z-10 shadow-md">
            <span>Lat {centroidCoords[0].toFixed(5)}°N</span>
            <span className="text-gray-400">|</span>
            <span>Lng {Math.abs(centroidCoords[1]).toFixed(5)}°W</span>
            <span className="text-gray-400">|</span>
            <span>Zoom {zoomLevel}x</span>
          </div>

          {/* Bottom Right Live Area & Instructions Badge */}
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs text-xs px-3.5 py-2 rounded-xl border border-gray-200 shadow-md z-10 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${hasSelfIntersection ? 'bg-red-500 animate-pulse' : 'bg-green-600'}`}></div>
            <div>
              <span className="font-semibold text-gray-900">Area:</span>{' '}
              <span className="font-bold text-green-900">{calculatedAreaHa.toFixed(2)} ha</span>
              <span className="text-gray-500 text-[11px] ml-1.5">({calculatedAreaM2.toLocaleString()} m²)</span>
            </div>
          </div>
        </div>

        {/* Right Side Card: Define your field (Matching Figma Page 2) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Define your field</h3>
              {isConfirmed && (
                <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Confirmed
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Unrestricted perimeter editor · One field per analysis</p>
          </div>

          <div className="space-y-3">
            {/* Button 1: Draw Boundary (Fresh polygon drawing) */}
            <button
              onClick={handleStartDrawNew}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-between transition cursor-pointer ${
                isDrawingNew
                  ? 'bg-green-800 text-white shadow-sm ring-2 ring-green-600 ring-offset-1'
                  : 'bg-green-800 hover:bg-green-900 text-white shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <Pencil className="w-4 h-4 shrink-0" />
                <span>{isDrawingNew ? 'Click Map to Trace Points' : 'Draw Boundary'}</span>
              </div>
              {isDrawingNew && (
                <span className="text-[11px] bg-green-700 text-green-100 px-2 py-0.5 rounded-full">
                  Drawing
                </span>
              )}
            </button>

            {/* Button 2: Select Existing (Dropdown with Gambian Pilot Plots) */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveMode('select');
                  setShowPresets(!showPresets);
                }}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-between transition cursor-pointer ${
                  showPresets || activeMode === 'select'
                    ? 'bg-green-50 text-green-900 border border-green-300'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-4 h-4 shrink-0 text-gray-500" />
                  <span>Select Existing Field</span>
                </div>
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  4 Plots
                </span>
              </button>

              {/* Preset Selector Dropdown */}
              {showPresets && (
                <div className="mt-2 p-2 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 shadow-sm">
                  {PRESET_FIELDS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className="w-full text-left p-2.5 rounded-lg text-xs hover:bg-white hover:shadow-xs transition border border-transparent hover:border-gray-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-semibold text-gray-800">
                        <span>{preset.name}</span>
                        <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-mono">
                          {preset.size_ha} ha
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {preset.region} · {preset.lat.toFixed(4)}°N, {Math.abs(preset.lng).toFixed(4)}°W
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Button 3: Use My Location */}
            <button
              onClick={handleUseMyLocation}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition cursor-pointer"
            >
              <Navigation className="w-4 h-4 shrink-0 text-gray-500" />
              <span>Use My Location (GPS)</span>
            </button>
          </div>

          {/* Active Farm Geometry Summary Card */}
          <div className="pt-4 border-t border-gray-100 space-y-2.5 text-xs text-gray-600 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/60">
            <div className="flex items-center justify-between font-semibold text-gray-900 border-b border-gray-200/60 pb-1.5">
              <span>Geospatial Summary</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                {points.length} Vertices Active
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Field Name:</span>
              <span className="text-gray-900 font-semibold">{fieldDetails.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Calculated Farm Area:</span>
              <span className="text-green-800 font-bold font-mono text-sm">
                {calculatedAreaHa.toFixed(2)} ha
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Area in Square Metres:</span>
              <span className="font-mono">{calculatedAreaM2.toLocaleString()} m²</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Centroid (Lat/Lng):</span>
              <span className="font-mono text-[11px] text-gray-800">
                {centroidCoords[0].toFixed(5)}°, {centroidCoords[1].toFixed(5)}°
              </span>
            </div>

            {bboxCoords && (
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Bounding Box:</span>
                <span className="font-mono text-[10px]">
                  {bboxCoords[1].toFixed(4)}°N - {bboxCoords[3].toFixed(4)}°N
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-gray-200/50">
              <span>District & Region:</span>
              <span className="text-gray-800 font-medium">
                {location.district}, {location.region}
              </span>
            </div>
          </div>

          {/* Vertex Coordinates Inspector List */}
          <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2 max-h-40 overflow-y-auto">
            <div className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
              <span>Vertex Coordinates</span>
              <span className="text-[10px] text-gray-400 font-normal">Drag on map to edit</span>
            </div>
            <div className="space-y-1">
              {points.map((pt, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] font-mono py-1 px-1.5 rounded bg-gray-50 hover:bg-green-50 transition">
                  <span className="font-bold text-green-800">P{i + 1}</span>
                  <span className="text-gray-600">{pt[0].toFixed(5)}°N, {Math.abs(pt[1]).toFixed(5)}°W</span>
                  {points.length > 3 && (
                    <button
                      onClick={() => {
                        setHistory((h) => [...h, [...pointsRef.current]]);
                        const updated = points.filter((_, idx) => idx !== i);
                        pointsRef.current = updated;
                        setPoints(updated);
                        updateGeospatialMetrics(updated);
                      }}
                      className="text-red-500 hover:text-red-700 font-sans text-xs px-1"
                      title="Remove vertex"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Farmer Editor Help Guide */}
          <div className="text-[11px] text-gray-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/80 space-y-1">
            <div className="font-semibold text-emerald-900 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Boundary Editor Tips:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
              <li>Drag numbered circles freely over any distance.</li>
              <li>Click the dashed (+) circles along edges to add vertices.</li>
              <li>Right-click or click (×) on any vertex to remove it.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Step 1 of 8 · Boundary coordinates ({points.length} vertices) will be submitted to the decision engine
        </div>
        <button
          onClick={() => {
            if (hasSelfIntersection) {
              setGeoStatus({
                type: 'error',
                message: 'Please uncross boundary lines before continuing.',
              });
              return;
            }
            if (points.length < 3) {
              setGeoStatus({
                type: 'error',
                message: 'A complete farm boundary requires at least 3 vertices.',
              });
              return;
            }
            // Ensure confirmed before leaving
            handleConfirmBoundary();
            nextStep();
          }}
          className="px-8 py-3 bg-green-800 hover:bg-green-900 text-white font-semibold rounded-lg text-sm shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>Next</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
