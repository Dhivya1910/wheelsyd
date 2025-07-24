<script setup>
import 'maplibre-gl/dist/maplibre-gl.css';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import 'primeicons/primeicons.css';
import Select from 'primevue/select';
import { onMounted, ref, onUnmounted } from 'vue';
import maplibregl from 'maplibre-gl';
import AutoComplete from 'primevue/autocomplete';
import CryptoJS from 'crypto-js';
const selectedPlace = ref();
const fromLocation = ref('');
const locationSource = ref('gps');
const allAddresses = ref([]);
const suggestions = ref([]);
const tramStops = ref([]);
const busStops = ref([]);
const selectedDestination = ref(null);
const stopMarkers = ref([]);
const routeTypeMap = { tram: 1, bus: 2 }; // Based on PTV API spec
import Papa from 'papaparse';
const routeCache = {};
const runCache = {};
const showHeatmap = ref(false);
let currentPopup = null;
const isLiveLocationActive = ref(false);
let locationWatchId = null;
let locationRefreshInterval = null;
const hasArrived = ref(false);
const hasAlerted = ref(false);
let isFirstFix = true;
// At the very top of your <script> (outside any function):
let _lastGeoTs    = 0;
let _lastLat      = null, _lastLon      = null;
let lastRouteCalc = { lat: null, lon: null };


onUnmounted(() => {
  stopLiveLocationUpdates();
});

const formatDepartureTime = (utcTime) => {
  if (!utcTime) return 'N/A';
  const depTime = new Date(utcTime);
  const now = new Date();
  const diff = Math.round((depTime - now) / 60000);
  return diff <= 0 ? 'Now' : `${diff} min${diff > 1 ? 's' : ''}`;
};

const fetchNearbyStopId = async (lat, lon, routeType = 1) => {
  try {
    const url = generateSignedURL(
      `/v3/stops/location/${lat},${lon}?route_types=${routeType}&max_distance=60`
    );
    const res = await fetch(url);
    const data = await res.json();
    const nearby = data.stops?.[0];
    if (nearby) {
      return nearby.stop_id.toString();
    }
    return null;
  } catch (err) {
    console.error("🚨 Error fetching nearby stop:", err);
    return null;
  }
};

const tramStopFallbackMap = {
  '4-Collins St/William St (Melbourne City)': {
    route_number: '11',
    route_name: 'West Preston - Docklands',
    direction: 'To Docklands'
  },
  '5-Collins St/Queen St (Melbourne City)': {
    route_number: '48',
    route_name: 'North Balwyn - Docklands',
    direction: 'To North Balwyn'
  },
  '6-Collins St/Elizabeth St (Melbourne City)': {
    route_number: '12',
    route_name: 'Victoria Gardens - St Kilda',
    direction: 'To Victoria Gardens'
  },
  '8-Peel St/Victoria St (Melbourne City)': {
    route_number: '59',
    route_name: 'Airport West - Flinders St',
    direction: 'To Airport West'
  },
  '8-Spring St/Flinders St (Melbourne City)': {
    route_number: '75',
    route_name: 'Vermont South - Central Pier Docklands',
    direction: 'To Docklands'
  }
};

const searchRouteFromStopName = async (stopName, stopId, lat, lon) => {
  try {
    const url = generateSignedURL(
      `/v3/search/${encodeURIComponent(stopName)}?route_types=1&latitude=${lat}&longitude=${lon}&max_distance=300`
    );
    const res = await fetch(url);
    const data = await res.json();

    const matchedStop = (data.stops || []).find(s => s.stop_id === parseInt(stopId));
    const route = matchedStop?.routes?.[0] || data.routes?.[0];

    return route || null;
  } catch (err) {
    console.error("🚨 Search fallback failed:", err);
    return null;
  }
};


const fetchDepartures = async (routeType, stopId) => {
  if (!routeType || !stopId) return [];

  try {
    const depUrl = generateSignedURL(`/v3/departures/route_type/${routeType}/stop/${stopId}?include_directions=true`);
    const depRes = await fetch(depUrl);
    const depData = await depRes.json();

    const departures = depData.departures || [];
    const directions = depData.directions || {};

    return departures.map(dep => ({
      ...dep,
      route_number: routeCache[dep.route_id]?.route_number || 'Unknown',
      destination: directions[dep.direction_id]?.direction_name || 'Unknown'
    }));
  } catch (err) {
    console.error("🚨 Error fetching departures:", err);
    return [];
  }
};


const fetchRouteDetails = async (routeId) => {
  try {
    const routeRes = await fetch(generateSignedURL(`/v3/routes/${routeId}`));
    const routeData = await routeRes.json();
    return routeData.route;
  } catch (err) {
    console.error("🚨 Error fetching route details:", err);
    return null;
  }
};

const fetchDirections = async (routeId) => {
  try {
    const dirRes = await fetch(generateSignedURL(`/v3/directions/route/${routeId}`));
    const dirData = await dirRes.json();
    return dirData.directions || [];
  } catch (err) {
    console.error("🚨 Error fetching directions:", err);
    return [];
  }
};

const fetchRouteIdFromStop = async (stopId, routeType) => {
  try {
    const stopRes = await fetch(generateSignedURL(`/v3/stops/${stopId}/route_type/${routeType}`));
    const stopData = await stopRes.json();
    return stopData.routes?.[0]?.route_id || null;
  } catch (err) {
    console.error("🚨 Error fetching routes from stop:", err);
    return null;
  }
};

const buildPopupHTML = (stopName, stopType, routeDetails, directionName) => {
  return `
    <div class="popup-content" style="max-width: 280px;">
      <h3>${stopName}</h3>
      <p><strong>Type:</strong> ${stopType}</p>
      <hr style="margin: 8px 0;" />
      <p><strong>Route:</strong> 🚍 ${routeDetails?.route_number || 'Unknown'} — ${routeDetails?.route_name || 'Unknown route'}</p>
      <p><strong>Direction:</strong> ➡️ ${directionName || 'Unknown direction'}</p>
    </div>
  `;
};


const createStopPopup = async (stop, marker) => {
  try {
    // Save the current scroll position before doing anything
    const originalScrollPos = {
      x: window.pageXOffset || document.documentElement.scrollLeft,
      y: window.pageYOffset || document.documentElement.scrollTop
    };
    
    // Track scroll position to prevent automatic scrolling
    const preventScroll = () => {
      window.scrollTo(originalScrollPos.x, originalScrollPos.y);
    };
    
    // Add scroll prevention listeners
    window.addEventListener('scroll', preventScroll, { passive: false });
    
    const routeType = routeTypeMap[stop.type.toLowerCase()] ?? 0;
    let stopId = stop.stop_id?.toString().trim();

    // Fallback for missing IDs or unreliable tram stop IDs
    if (!stopId || stop.type?.toLowerCase() === 'tram') {
      stopId = await fetchNearbyStopId(stop.lat, stop.lon, routeType);
    }

    if (!stopId) {
      window.removeEventListener('scroll', preventScroll);
      return null;
    }

    // Create loading popup - NOT showing it yet
    const loadingPopup = new maplibregl.Popup({ 
      offset: 25, 
      anchor: 'bottom', 
      autoPan: false, 
      trackPointer: false,
      closeOnClick: false,
      className: 'loading-popup'
    }).setHTML(`<div style="padding: 10px; font-style: italic;">Loading details...</div>`);
    
    // Set popup but delay showing it to avoid scroll issues
    marker.setPopup(loadingPopup);
    
    // Use requestAnimationFrame to show popup in next frame after DOM updates
    requestAnimationFrame(() => {
      marker.togglePopup();
      // Ensure scroll position is maintained
      window.scrollTo(originalScrollPos.x, originalScrollPos.y);
    });

    let routeDetails = null;
    let directionName = '';

    // Get route details via departures
    const departures = await fetchDepartures(routeType, stopId);
    if (departures.length > 0) {
      const firstDep = departures[0];
      const routeId = firstDep.route_id;

      if (routeCache[routeId]) {
        routeDetails = routeCache[routeId];
      } else {
        const res = await fetch(generateSignedURL(`/v3/routes/${routeId}`));
        if (res.ok) {
          const data = await res.json();
          routeDetails = data.route;
          routeCache[routeId] = data.route;
        }
      }

      const directions = await fetchDirections(routeId);
      const dir = directions.find(d => d.direction_id === firstDep.direction_id);
      directionName = dir?.direction_name || '';
    }

    // Fallback via route_type and stop
    if (!routeDetails) {
      const fallbackRouteId = await fetchRouteIdFromStop(stopId, routeType);
      if (fallbackRouteId) {
        routeDetails = await fetchRouteDetails(fallbackRouteId);
        const directions = await fetchDirections(fallbackRouteId);
        directionName = directions[0]?.direction_name || '';
      }
    }

    // Search fallback
    if (!routeDetails) {
      const searchedRoute = await searchRouteFromStopName(stop.name, stopId, stop.lat, stop.lon);
      if (searchedRoute) {
        routeDetails = {
          route_number: searchedRoute.route_number,
          route_name: searchedRoute.route_name
        };
        const directions = await fetchDirections(searchedRoute.route_id);
        directionName = directions[0]?.direction_name || '';
      }
    }

    // Static fallback for trams
    if (!routeDetails && stop.type?.toLowerCase() === 'tram' && tramStopFallbackMap[stop.name]) {
      const fallback = tramStopFallbackMap[stop.name];
      routeDetails = {
        route_number: fallback.route_number,
        route_name: fallback.route_name
      };
      directionName = fallback.direction;
    }

    // Store scroll position again before replacing popup
    const finalScrollX = window.scrollX;
    const finalScrollY = window.scrollY;

    const popupHTML = buildPopupHTML(stop.name, stop.type, routeDetails, directionName);
    const popup = new maplibregl.Popup({ 
      offset: 25, 
      anchor: 'bottom', 
      autoPan: false, 
      trackPointer: false,
      className: 'stop-details-popup'
    }).setHTML(popupHTML);
    
    // Add close handler to clear currentPopup
    popup.on('close', () => {
      if (currentPopup === popup) {
        currentPopup = null;
      }
    });
    
    // Use requestAnimationFrame to ensure DOM is ready before we swap popups
    requestAnimationFrame(() => {
      // Replace loading popup with actual popup without triggering scroll
      marker.setPopup(popup);
      
      // Use another frame to ensure popup displays properly
      requestAnimationFrame(() => {
        marker.togglePopup();
        loadingPopup.remove();
        
        // Remove scroll lock once everything is settled
        setTimeout(() => {
          window.removeEventListener('scroll', preventScroll);
        }, 100);
        
        // Make sure scroll position is still maintained
        window.scrollTo(originalScrollPos.x, originalScrollPos.y);
      });
    });
    
    // Set as current popup
    currentPopup = popup;
    
    return popup;
  } catch (err) {
    console.error("🚨 Error creating popup:", err);
    // Make sure to clean up event listeners on error
    window.removeEventListener('scroll', preventScroll);
    return null;
  }
};

const createStopMarker = (stop) => {
  const el = document.createElement('div');
  let typeClass = '';
  let symbol = '📍';
  //'♿🚻'

  switch (stop.type?.toLowerCase()) {
    case 'tram': typeClass = 'tram-stop'; symbol = '🚋'; break;
    case 'bus': typeClass = 'bus-stop'; symbol = '🚌'; break;
    case 'toilet':
    case 'accessible toilet': 
      typeClass = 'toilet-stop'; 
      symbol = '♿'; 
      break;
    default: typeClass = 'default-stop';
  }

  el.className = `stop-icon ${typeClass}`;
  el.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${symbol}</div>`;
  el.title = stop.name || 'Accessible Location';

  const lat = parseFloat(stop.lat);
  const lon = parseFloat(stop.lon);
  if (isNaN(lat) || isNaN(lon)) {
    console.error("❌ Invalid stop coordinates:", stop);
    return null;
  }

  const marker = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]);

  marker.getElement().addEventListener('click', async (e) => {
  e.stopPropagation();
  
  // Close any existing popup
  if (currentPopup) {
    currentPopup.remove();
  }

  // Special handling for toilets
  if (stop.type?.toLowerCase() === 'toilet' || stop.type?.toLowerCase() === 'accessible toilet') {
    const distance = haversineDistance(center.value[1], center.value[0], stop.lat, stop.lon);
    const friendlyDistance = distance < 1 
      ? `${(distance * 1000).toFixed(0)} m` 
      : `${distance.toFixed(2)} km`;
    
    const popupHTML = `
      <div class="popup-content" style="max-width: 280px;">
        <h3>${stop.name || 'Accessible Toilet'}</h3>
        ${stop.suburb ? `<p><strong>Suburb:</strong> ${stop.suburb}</p>` : ''}
        <p><strong>Distance:</strong> ${friendlyDistance}</p>
        <hr style="margin: 8px 0;" />
        <p><strong>Type:</strong> Accessible Toilet</p>
        <p><strong>Wheelchair Access:</strong> <span style="color: green;">✓ Available</span></p>
      </div>
    `;
    
    const popup = new maplibregl.Popup({ offset: 25, anchor: 'bottom', autoPan: false, trackPointer: false })
      .setHTML(popupHTML);
    
    currentPopup = popup;
    marker.setPopup(popup).togglePopup();
    return;
  }
  
  // Existing popup logic for other stop types
  const popup = await createStopPopup(stop, marker);
  if (popup) {
    currentPopup = popup;
    marker.setPopup(popup).togglePopup();
  }
});

  return marker;
};

const steepnessPoints = ref([]); // ⛰️ store steepness points

// Load steepness CSV when page loads
onMounted(() => {
  Papa.parse('./footpath-steepness.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rawData = results.data;
      steepnessPoints.value = rawData
        .filter(row => row['gradepc']) // only rows with valid steepness
        .map(row => ({
          lat: parseFloat(row['Geo Point'].split(',')[0].trim()),
          lon: parseFloat(row['Geo Point'].split(',')[1].trim()),
          gradepc: parseFloat(row['gradepc'])
        }));

      // After loading -> Add heatmap
      if (map.value && steepnessPoints.value.length > 0) {
        addSteepnessHeatmap();
      }
    }
  });
});



const clearLocation = () => {
  stopLiveLocationUpdates();
  hasArrived.value = false;
  // 1) Clear any UI selection
  if (selectedCardEl) {
    selectedCardEl.classList.remove('selected-card');
    selectedCardEl = null;
  }
  if (selectedMarker) {
    selectedMarker.remove();
    selectedMarker = null;
  }

  // 2) Clear input & suggestions
  fromLocation.value = '';
  suggestions.value = [];
  hideBoxList('listBoxContainer');

  // 3) Remove all destination markers from the map
  removeAllDestinationMarkers();

  // 4) Remove all transport/toilet/tram/bus markers
  stopMarkers.value.forEach(m => m.remove());
  stopMarkers.value = [];

  // 5) Clear your search results array
  searchResults.value = [];

  // 6) Remove any polyline route layer & endpoint markers
  removeRoute();

  // 7) Close any open popups
  document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
  selectedDestination.value = null;
};


const sydneySuburbs = [
  "Alexandria", "Annandale", "Barangaroo", "Beaconsfield", "Camperdown",
  "Centennial Park", "Chippendale", "Darlinghurst", "Darlington", "Dawes Point",
  "Elizabeth Bay", "Erskineville", "Eveleigh", "Forest Lodge", "Glebe",
  "Haymarket", "Millers Point", "Moore Park", "Newtown", "Paddington",
  "Potts Point", "Pyrmont", "Redfern", "Rosebery", "Rushcutters Bay",
  "St Peters", "Surry Hills", "Sydney", "The Rocks", "Ultimo",
  "Waterloo", "Woolloomooloo", "Zetland"
];




onMounted(async () => {
  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
    center: center.value,
    zoom: zoom.value
  });

  map.value.on('styleimagemissing', (e) => {
    map.value.addImage(e.id, new ImageData(1, 1, new Uint8ClampedArray([0, 0, 0, 0])));
  });

  currentLocationMarker = addCurrentLocationMarker(center.value);

  // 1) Grab the map-container DIV
const container = mapContainer.value;  // your ref to <div ref="mapContainer">

// 2) Outside-click handler
container.addEventListener('click', (e) => {
  if (
    e.target.closest('.stop-icon') ||
    e.target.closest('.list-item') ||
    e.target.closest('.route-endpoint-marker')
  ) return;

  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }

  // clear selection
  if (selectedCardEl) {
    selectedCardEl.classList.remove('selected-card');
    selectedCardEl = null;
  }
  if (selectedMarker) {
    selectedMarker.remove();
    selectedMarker = null;
  }
  removeRoute();
  selectedDestination.value = null;
  
  // if in stop mode… re-draw all from searchResults
  const code = selectedPlace.value?.code;
  if (code === 'bus_stop' || code === 'tram_stop' || code === 'accessible_toilets') {
    stopMarkers.value.forEach(m => m.remove());
    stopMarkers.value = [];
    searchResults.value.forEach(r => {
      if (r.stopData) {
        const m = createStopMarker(r.stopData).addTo(map.value);
        stopMarkers.value.push(m);
      }
    });
    return;
  }

  // otherwise restore all destinations
  reAddAllMarkers();
});




  // Load public transport stops near the initial center
  const lat = center.value[1];
  const lon = center.value[0];
  const liveStops = await fetchLiveStops(lat, lon);
  tramStops.value = liveStops.filter(s => s.type === 'tram');
  busStops.value = liveStops.filter(s => s.type === 'bus');
});


let csvData = []

onMounted(() => {
  fetch('/sydney_addresses_by_suburb.csv')
    .then(res => res.text())
    .then(csv => {
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Parsed rows:", results.data); // ✅ Check this!
          allAddresses.value = results.data.map(row => ({
            label: row.address_pnt,
            lat: parseFloat(row.latitude),
            lon: parseFloat(row.longitude),
            suburb: row.suburb
          }));
        },
        error: (err) => {
          console.error("CSV parsing error:", err);
        }
      });
    })
    .catch(err => console.error("CSV fetch failed:", err));
});

const searchSuggestions = (event) => {
  console.log("Searching for:", event.query); // ✅ Add this
  if (!event.query) {
    suggestions.value = [];
    return;
  }

  const query = event.query.toLowerCase();

  suggestions.value = allAddresses.value
    .filter(row =>
      row.label?.toLowerCase().includes(query) ||
      row.suburb?.toLowerCase().includes(query)
    )
    .slice(0, 5);

  console.log("Found suggestions:", suggestions.value); // ✅ Add this
};

const selectedMode = ref('wheelchair'); // default

const places = ref([
  // { name: 'Tram Stops', code: 'tram_stop' },
  { name: 'Cafe', code: 'catering.cafe' },
  { name: 'Supermarket', code: 'commercial.supermarket' },
  { name: 'Accessible Toilets', code: 'accessible_toilets' },
  { name: 'Clothing', code: 'commercial.clothing' },
  { name: 'Shopping Mall', code: 'commercial.shopping_mall' },
  { name: 'Hotel', code: 'accommodation.hotel' }   
]);


onMounted(() => {
  fetch('/sydney_addresses_by_suburb.csv')
    .then(res => res.text())
    .then(csv => {
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          allAddresses.value = results.data.map(row => ({
            label: row.address_pnt,
            lat: parseFloat(row.latitude),
            lon: parseFloat(row.longitude),
            suburb: row.suburb
          }));
        }
      });
    });
});

const center = ref([151.2093, -33.8688]); // Sydney CBD
const mapContainer = ref(null);
const map = ref(null);
const zoom = ref(13);
const radius = ref(2);
const apiKey = '93777ee2179d476786624b0f9b58bea5';
//const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

const searchResults = ref([]);
const allMarkers = ref([]);
let selectedCardEl = null;
let selectedMarker = null;
let routeStartMarker = null;
let routeEndMarker = null;
let currentLocationMarker = null;

const addCurrentLocationMarker = (lngLat) => {
  const currentLocationEl = document.createElement('div');
  currentLocationEl.className = 'current-location-marker';
  currentLocationEl.innerHTML = `
    <div style="text-align:center; background-color: white; padding: 5px; border-radius: 8px; border: 2px solid lightblue;">
      <i class="pi pi-wheelchair" style="font-size: 24px; color: #ff0000;"></i>
      <br>
      <span style="font-size:12px; color:#333; font-weight: bold;">You are here</span>
    </div>
  `;
  return new maplibregl.Marker(currentLocationEl).setLngLat(lngLat).addTo(map.value);
};

onMounted(() => {
  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
    center: center.value,
    zoom: zoom.value
  });

  map.value.on('styleimagemissing', (e) => {
    map.value.addImage(e.id, new ImageData(1, 1, new Uint8ClampedArray([0, 0, 0, 0])));
  });

  // Add initial marker at default center
  currentLocationMarker = addCurrentLocationMarker(center.value);
/*
  map.value.on('click', () => {
    if (selectedCardEl) {
      selectedCardEl.classList.remove('selected-card');
      selectedCardEl = null;
    }
    if (selectedMarker) {
      selectedMarker.remove();
      selectedMarker = null;
    }
    removeRoute();
    reAddAllMarkers();
  });
  */
});
// ✅ Generate proxy URL
const generateSignedURL = (path, query = '') => {
  const base = 'https://fit5120.vercel.app/api/proxy';
  const fullPath = `${base}${path}`;
  return query ? `${fullPath}?${query}` : fullPath;
};

// ✅ Get route types (tram, bus, etc.)
const fetchPTVRouteTypes = async () => {
  try {
    const url = generateSignedURL('/v3/route_types');
    const res = await fetch(url);
    const data = await res.json();
    console.log("PTV Route Types:", data);
  } catch (err) {
    console.error("Error fetching PTV route types:", err);
  }
};

// ✅ Get nearby stops from lat/lon
const fetchLiveStops = async (lat, lon) => {
  const path = `/v3/stops/location/${lat},${lon}`;
  const query = `max_distance=1500&include_geopath=false`;
  const url = generateSignedURL(path, query);

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.stops || [];
  } catch (err) {
    console.error('Failed to fetch live PTV stops:', err);
    return [];
  }
};

const addSteepnessHeatmap = () => {
  if (!map.value || steepnessPoints.value.length === 0 || !showHeatmap.value) return;

  const features = steepnessPoints.value.map(point => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat]
    },
    properties: {
      gradepc: point.gradepc
    }
  }));

  const geojson = {
    type: 'FeatureCollection',
    features: features
  };

  if (map.value.getSource('steepness-heatmap')) {
    map.value.removeLayer('steepness-heatmap-layer');
    map.value.removeSource('steepness-heatmap');
  }

  map.value.addSource('steepness-heatmap', {
    type: 'geojson',
    data: geojson
  });

  map.value.addLayer({
    id: 'steepness-heatmap-layer',
    type: 'heatmap',
    source: 'steepness-heatmap',
    maxzoom: 19,
    paint: {
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0, 255, 0, 0)',    
        0.3, 'rgba(255, 255, 0, 0.5)', 
        0.6, 'rgba(255, 165, 0, 0.7)', 
        1, 'rgba(255, 0, 0, 0.9)'
      ],
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        12, 0.5,
        15, 1.5
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        12, 8,
        15, 20
      ],
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'gradepc'],
        0, 0,
        10, 0.2,
        30, 1
      ]
    }
  });
};



// 🌏 Manual Geocode using CSV dataset
const geocodeFromText = async () => {
  if (!fromLocation.value || typeof fromLocation.value !== 'object') {
    alert('Please select an address from the dropdown.');
    return false;
  }

  const { lat, lon } = fromLocation.value;

  if (!isValidCoordinate(lon, lat)) {
    console.error("Invalid fromLocation coordinates:", fromLocation.value);
    alert("The selected location has invalid coordinates.");
    return false;
  }

  center.value = [lon, lat];
  locationSource.value = 'manual';

  if (map.value) {
    map.value.setCenter(center.value);
    if (currentLocationMarker) {
      currentLocationMarker.setLngLat(center.value);
    } else {
      currentLocationMarker = addCurrentLocationMarker(center.value);
    }
  }

  return true;
};





// 📍 Live Location via GPS
const getLiveLocation = () => {
  clearLocation();
  
  // Clear any existing interval
  if (locationRefreshInterval) {
    clearInterval(locationRefreshInterval);
    locationRefreshInterval = null;
  }
  
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  // First get immediate position
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await updateLocation(position);
      isLiveLocationActive.value = true;
      
      // Then set up continuous updates
      locationWatchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleLocationError,
        { 
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );
      
      // Set up 3-second refresh interval
      locationRefreshInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          updateLocation,
          handleLocationError,
          { enableHighAccuracy: true }
        );
      }, 3000);
    },
    handleLocationError
  );
};

const handleLocationError = (error) => {
  console.error("Location error:", error);
  if (error.code === error.PERMISSION_DENIED) {
    alert("Location permission denied. Please allow access to use live navigation.");
  }
  stopLiveLocationUpdates();
};

//── at the top of your <script> (outside of any function) ──

//── your existing updateLocation, revised ──
// ── Revised updateLocation ──
const updateLocation = async (position) => {
  const now = Date.now();
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  // 1) Throttle: if <3s since last AND <5m moved, skip API calls
  const movedM = _lastLat !== null
    ? haversineDistance(_lastLat, _lastLon, lat, lon) * 1000
    : Infinity;
  if (now - _lastGeoTs < 3_000 && movedM < 5) {
    // You can still update the marker visually if you like:
    if (map.value && currentLocationMarker) {
      currentLocationMarker.setLngLat([lon, lat]);
    }
    if (routeStartMarker) {
     routeStartMarker.setLngLat([lon, lat]);
   }
    return;
  }
  // record this fix
  _lastGeoTs = now;
  _lastLat   = lat;
  _lastLon   = lon;

  // 2) reverse-geocode
  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    fromLocation.value = {
      label: data.features?.[0]?.properties?.formatted || "Current Location",
      lat, lon
    };
  } catch (err) {
    console.error("Reverse geocode failed:", err);
  }

  // 3) update map center & “you are here” marker
  center.value = [lon, lat];
  if (map.value) {
    if (isFirstFix) {
      map.value.easeTo({ center: center.value, duration: 800 });
      isFirstFix = false;
    }
    if (currentLocationMarker) {
      currentLocationMarker.setLngLat(center.value);
    } else {
      currentLocationMarker = addCurrentLocationMarker(center.value);
    }
  }
  locationSource.value = 'gps';

  // 4) arrival-alert logic (unchanged) …
  if (selectedDestination.value) {
    const distM = haversineDistance(
      lat, lon,
      selectedDestination.value.lat,
      selectedDestination.value.lon
    ) * 1000;
    if (distM <= 25 && !hasAlerted.value) {
      hasAlerted.value = true;
      alert('You have arrived at your destination!');
      if (selectedCardEl) {
        selectedCardEl.classList.remove('selected-card');
        selectedCardEl = null;
      }
      if (selectedMarker) {
        selectedMarker.remove();
        selectedMarker = null;
      }
      removeRoute(); 
      selectedDestination.value = null;
      reAddAllMarkers();
    } else if (distM > 25) {
      hasAlerted.value = false;
    }
  }

  // 5) Only recalc route if moved >5m since last route calc
  if (selectedDestination.value && selectedMode.value === 'wheelchair') {
    const routeMovedM = lastRouteCalc.lat !== null
      ? haversineDistance(lastRouteCalc.lat, lastRouteCalc.lon, lat, lon) * 1000
      : Infinity;
    if (routeMovedM > 5) {
      updateRoute();
      lastRouteCalc = { lat, lon };
    }
  }

  // 5b) Live-update transport recommendation if user moved >5m
if (selectedDestination.value && selectedMode.value === 'transport') {
  const routeMovedM = lastRouteCalc.lat !== null
    ? haversineDistance(lastRouteCalc.lat, lastRouteCalc.lon, lat, lon) * 1000
    : Infinity;
  if (routeMovedM > 5) {
    recommendViaTransport();
    lastRouteCalc = { lat, lon };
  }
}

};


//── the new helper to add/update your GeoJSON route + endpoint markers ──
// ── updateRoute (unchanged) ──
const updateRoute = async () => {
  const [currentLon, currentLat] = center.value;
  const { lat: destLat, lon: destLon } = selectedDestination.value;

  const waypoints = `${currentLat},${currentLon}|${destLat},${destLon}`;
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypoints)}&mode=walk&format=geojson&apiKey=${apiKey}`
    );
    const json = await response.json();
    const route = json.features?.[0];
    if (!route) return;

    if (map.value.getSource('route')) {
      map.value.getSource('route').setData(route);
    } else {
      map.value.addSource('route', { type: 'geojson', data: route });
      map.value.addLayer({
        id: 'routeLine',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#003366', 'line-width': 8, 'line-dasharray': [2, 2] }
      });

      // create your two endpoint markers
      const startEl = document.createElement('div');
      startEl.className = 'route-endpoint-marker start-marker';
      startEl.innerHTML = `<div class="endpoint-label">YOU ARE HERE</div>`;

      const lastCoord = route.geometry.coordinates.slice(-1)[0];
      const endEl = document.createElement('div');
      endEl.className = 'route-endpoint-marker end-marker';
      endEl.innerHTML = `<div class="endpoint-label">DESTINATION</div>`;

      routeStartMarker = new maplibregl.Marker({ element: startEl })
        .setLngLat([currentLon, currentLat])
        .addTo(map.value);

      routeEndMarker = new maplibregl.Marker({ element: endEl })
        .setLngLat([lastCoord[0], lastCoord[1]])
        .addTo(map.value);
    }

    // reposition markers on every update
    routeStartMarker.setLngLat([currentLon, currentLat]);
    const last = route.geometry.coordinates.slice(-1)[0];
    routeEndMarker.setLngLat([last[0], last[1]]);

  } catch (err) {
    console.error("🚨 updateRoute error:", err);
  }
};




const showArrivalNotification = () => {
  // Create a toast notification
  const toast = document.createElement('div');
  toast.className = 'arrival-toast';
  toast.innerHTML = `
    <div class="toast-content">
      <i class="pi pi-check-circle" style="color: green; font-size: 1.5rem;"></i>
      <span>You have arrived at your destination!</span>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(toast);
  
  // Show with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 5000);
};

const stopLiveLocationUpdates = () => {
  if (locationWatchId) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
  if (locationRefreshInterval) {
    clearInterval(locationRefreshInterval);
    locationRefreshInterval = null;
  }
  _lastGeoTs    = 0;
  _lastLat      = null;
  _lastLon      = null;
  isFirstFix    = true;
  lastRouteCalc = { lat: null, lon: null };
  isLiveLocationActive.value = false;
  hasArrived.value = false; // Reset arrival status
};
const combinedStops = ref([]);

onMounted(() => {
  Papa.parse('/cleaned_transport_stops_for_map.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      combinedStops.value = results.data.map(row => ({
      lat: parseFloat(row.lat),
      lon: parseFloat(row.lon),
      name: row.name,
      type: row.type,
      stop_id: row.STOP_ID?.trim()
    }));

      // Render only when user location is known
      if (center.value) {
        renderAllStops(center.value[1], center.value[0]);
      }
    }
  });
});

const accessibleToilets = ref([]);

onMounted(() => {
  Papa.parse('/Filtered_Accessible_Toilets.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      accessibleToilets.value = results.data.map(row => ({
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon),
        name: row.name || 'Accessible Toilet',
        suburb: row.suburb || '',
        type: 'toilet'
      }));
    }
  });
});


const renderAllStops = () => {
  // Only run this when specifically requested, not by default
  if (!map.value || !center.value || selectedPlace.value?.code === 'bus_stop' || selectedPlace.value?.code === 'tram_stop') return;

  // 🧹 Remove old markers
  stopMarkers.value.forEach(marker => marker.remove());
  stopMarkers.value = [];
  
  // Only show stops in transport mode
  if (selectedMode.value !== 'transport') return;

  const userLat = center.value[1];
  const userLon = center.value[0];

  combinedStops.value.forEach(stop => {
    const distance = haversineDistance(userLat, userLon, stop.lat, stop.lon);
    if (distance > 0.5) return; // Only show stops within 500m

    const marker = createStopMarker(stop).addTo(map.value);
    stopMarkers.value.push(marker);
  });
};




const handleSearch = async () => {
  if (!selectedPlace.value) {
    alert("Please select a place type.");
    return;
  }

  if (!fromLocation.value || typeof fromLocation.value !== 'object' || !isValidCoordinate(fromLocation.value.lon, fromLocation.value.lat)) {
    alert("Please select a valid location from the dropdown or use GPS.");
    return;
  }

  if (typeof fromLocation.value === 'object') {
    locationSource.value = 'manual';
  } else if (typeof fromLocation.value === 'string' && fromLocation.value.trim() !== '') {
    locationSource.value = 'manual';
  }

  if (locationSource.value === 'manual') {
    const valid = await geocodeFromText();
    if (!valid) return;
  }

  if (!selectedMode.value || (selectedMode.value !== 'wheelchair' && selectedMode.value !== 'transport')) {
    alert("Please select a valid mode.");
    return;
  }

  // ✅ Fetch places without automatically showing stops
  hideBoxList('courseContainer');
  fetchPlaces();
  // Only show transport stops in transport mode AND when not specifically looking for stops
  if (selectedMode.value === 'transport' && 
      selectedPlace.value.code !== 'bus_stop' && 
      selectedPlace.value.code !== 'tram_stop') {
    renderAllStops();
  }
  
  // Add smooth scrolling to bottom of page after fetching results
  setTimeout(() => {
  const pageHeight = document.body.scrollHeight;
  // Scroll to 40% down the page (adjust percentage as needed)
  window.scrollTo({
    top: pageHeight * 0.4,
    behavior: 'smooth'
  });
}, 300);// Small delay to ensure content has loaded
};



// Helper to hide the search results container.
const hideBoxList = (className) => {
  const element = document.querySelector(`.${className}`);
  if (element) {
    element.style.display = 'none';
  }
};

// When the dropdown value changes, clear routes, selected markers, search results,
// and also remove all destination markers from the map.
// When the dropdown value changes, clear routes, selected markers, search results,
// and also remove all destination markers from the map.
const onPlaceChange = () => {
  removeRoute();
  selectedDestination.value = null;
  if (selectedMarker) {
    selectedMarker.remove();
    selectedMarker = null;
  }

  if (selectedCardEl) {
    selectedCardEl.classList.remove('selected-card');
    selectedCardEl = null;
  }

  const listBox = document.querySelector('.listBox');
  if (listBox) {
    listBox.scrollTop = 0;
    listBox.innerHTML = '';
  }
  
  hideBoxList('listBoxContainer');

  // Remove all destination markers (points) from the map.
  removeAllDestinationMarkers();
  
  // Also clear all stop markers when changing place type
  stopMarkers.value.forEach(marker => marker.remove());
  stopMarkers.value = [];
  
  // Clear search results
  searchResults.value = [];
};

// Helper function to create a generic destination marker.
const createDestinationMarker = (lng, latCoord) => {
  const destEl = document.createElement('div');
  destEl.innerHTML = `
    <div style="text-align:center;">
      <i class="pi pi-map-marker" style="font-size: 24px; color: #2a9d8f;"></i>
      <br>
      <span style="font-size:10px;">Destination</span>
    </div>
  `;
  return new maplibregl.Marker(destEl)
    .setLngLat([lng, latCoord])
    .addTo(map.value);
};

// Remove the red route and endpoint markers if they exist.
const removeRoute = () => {
  if (map.value.getSource('route')) {
    if (map.value.getLayer('routeLine')) {
      map.value.removeLayer('routeLine');
    }
    map.value.removeSource('route');
  }
  if (routeStartMarker) {
    routeStartMarker.remove();
    routeStartMarker = null;
  }
  if (routeEndMarker) {
    routeEndMarker.remove();
    routeEndMarker = null;
  }
};

// Remove all destination markers from the map.
const removeAllDestinationMarkers = () => {
  allMarkers.value.forEach(marker => marker.remove());
  allMarkers.value = [];
};

// Re-create and display all destination markers from stored search results.
const reAddAllMarkers = () => {
  removeAllDestinationMarkers();
  
  // Check if we're displaying transport stops
  const isStopMode = selectedPlace.value?.code === 'bus_stop' || selectedPlace.value?.code === 'tram_stop';
  
  searchResults.value.forEach(place => {
    if (isStopMode && place.stopData) {
      // For bus/tram stops
      const marker = createStopMarker(place.stopData);
      marker.addTo(map.value);
      
      if (place.listItem) {
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
          place.listItem.click();
        });
      }
      
      allMarkers.value.push(marker);
    } else {
      // For regular places
      const [lng, latCoord] = place.geometry.coordinates;
      const marker = createDestinationMarker(lng, latCoord);
      
      if (place.listItem) {
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
          place.listItem.click();
        });
      }
      
      allMarkers.value.push(marker);
    }
  });
};

const fetchPlaces = () => {
  if (!selectedPlace.value || !selectedPlace.value.code) {
    alert('Please select a place type before searching.');
    return;
  }

  // Show the search results container when the button is clicked.
  const listBoxContainer = document.querySelector('.listBoxContainer');
  if (listBoxContainer) {
    listBoxContainer.style.display = 'block';
  }

  const lat = center.value[1];
  const lon = center.value[0];

// Updated renderSpecificStops function to handle selection and routes
const renderSpecificStops = (stopType) => {
  // Clear previous markers
  stopMarkers.value.forEach(marker => marker.remove());
  stopMarkers.value = [];

  // Clear and prepare list
  const listBox = document.querySelector('.listBox');
  listBox.innerHTML = '';
  listBox.scrollTop = 0;

  const userLat = center.value[1];
  const userLon = center.value[0];

  // Set specific distance filter
  const maxDistance = 2; // both bus and tram now have 2km

  // Filter stops by type and distance
  const filteredStops = combinedStops.value.filter(stop => {
    const distance = haversineDistance(userLat, userLon, stop.lat, stop.lon);
    return stop.type.toLowerCase() === stopType.toLowerCase() && distance <= maxDistance;
  });

  if (filteredStops.length === 0) {
  const isTram = stopType.toLowerCase() === 'tram';
  const stopName = isTram ? 'Tram Stops' : 'Bus Stops';
  const limitStr = '2 km';  // bus and tram both same
  const message = `Only wheelchair-accessible ${stopName} within ${limitStr} in City of Sydney are supported.`;

  listBox.innerHTML = `<div class="list-item">${message}</div>`;
  alert(message);
  return;
}



  // Sort by distance
  filteredStops.sort((a, b) => {
    return haversineDistance(userLat, userLon, a.lat, a.lon) -
           haversineDistance(userLat, userLon, b.lat, b.lon);
  });

  // Save to searchResults for re-rendering on map click
  searchResults.value = filteredStops.map(stop => ({
    geometry: { coordinates: [stop.lon, stop.lat] },
    properties: { name: stop.name, type: stop.type },
    stopData: stop
  }));

  // Add markers and list items
  filteredStops.forEach(stop => {
    const marker = createStopMarker(stop).addTo(map.value);
    stopMarkers.value.push(marker);

    const distance = haversineDistance(userLat, userLon, stop.lat, stop.lon);
    const friendlyDistance = distance < 1
      ? `${(distance * 1000).toFixed(0)} m`
      : `${distance.toFixed(2)} km`;

    const listItem = document.createElement('div');
    listItem.className = 'list-item';
    listItem.innerHTML = `
      <h3>${stop.name}</h3>
      <p><strong>Type:</strong> ${stop.type}</p>
      <p><strong>Distance:</strong> ${friendlyDistance}</p>
    `;

    // Add click event for stop selection and deselection
    listItem.addEventListener('click', async () => {
  // Check if this item is already selected
  if (selectedCardEl === listItem) {
    // Deselection logic
    listItem.classList.remove('selected-card');
    selectedCardEl = null;
    
    if (selectedMarker) {
      selectedMarker.remove();
      selectedMarker = null;
    }
    
    removeRoute();
    selectedDestination.value = null;
    
    // Redraw all stop markers
    stopMarkers.value.forEach(m => m.remove());
    stopMarkers.value = [];
    
    // Recreate all markers from filteredStops
    filteredStops.forEach(stop => {
      const marker = createStopMarker(stop).addTo(map.value);
      stopMarkers.value.push(marker);
    });
    
    return;
  }
  // 1) clear any existing selection
  if (selectedCardEl) {
    selectedCardEl.classList.remove('selected-card');
  }
  if (selectedMarker) {
    selectedMarker.remove();
    selectedMarker = null;
  }
  removeRoute();

  // 2) remove all stop markers
  stopMarkers.value.forEach(m => m.remove());
  stopMarkers.value = [];

  // 3) mark this card as selected
  listItem.classList.add('selected-card');
  selectedCardEl = listItem;
  
  // Ensure the selected card is visible
  listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 4) Create highlighted marker for the selected stop
  const el = document.createElement('div');
  el.className = `stop-icon ${stop.type.toLowerCase() === 'tram' ? 'tram-stop' : 'bus-stop'}`;
  el.style.border = '3px solid #ffea00';
  el.style.backgroundColor = '#ffff99';
  el.style.width = '36px';
  el.style.height = '36px';
  el.style.fontSize = '22px';
  el.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
      ${stop.type.toLowerCase() === 'tram' ? '🚋' : '🚌'}
    </div>
  `;

  selectedMarker = new maplibregl.Marker({ element: el })
    .setLngLat([stop.lon, stop.lat])
    .addTo(map.value);

  // Create and show the popup
  const popup = await createStopPopup(stop, selectedMarker);
  if (popup) {
    selectedMarker.setPopup(popup).togglePopup();
  }

  // Store the marker in the stopMarkers array so it can be cleared later
  stopMarkers.value.push(selectedMarker);

  // 5) Save destination and display route
  selectedDestination.value = {
    lat: stop.lat,
    lon: stop.lon,
    name: stop.name
  };
  hasAlerted.value = false;
  hasArrived.value = false;
  // Display route in wheelchair mode, otherwise use transport recommendation
  if (selectedMode.value === 'wheelchair') {
    displayRoute(stop.lat, stop.lon);
  } else if (selectedMode.value === 'transport') {
    recommendViaTransport();
  }
  
  map.value.flyTo({
    center: [stop.lon, stop.lat],
    zoom: 15
  });
});

    // Add click handler to the marker
    //marker.getElement().addEventListener('click', (e) => {
     // e.stopPropagation();  // Prevent map click from interfering
     // listItem.click();     // Trigger the list item click to handle everything
   // });
    
    // Save reference to the list item for future reference
    marker.listItem = listItem;
    
    listBox.appendChild(listItem);
  });
};


  // Clear previous markers and list.
  removeAllDestinationMarkers();
  const listBox = document.querySelector('.listBox');
  listBox.innerHTML = '';
  listBox.scrollTop = 0;

  // Handle bus and tram stops differently
  if (selectedPlace.value.code === 'bus_stop' || selectedPlace.value.code === 'tram_stop') {
    renderSpecificStops(selectedPlace.value.code === 'tram_stop' ? 'tram' : 'bus');
    return;
  }

// Inside the fetchPlaces function, modify the section where you handle accessible toilets:

if (selectedPlace.value.code === 'accessible_toilets') {
  stopMarkers.value.forEach(marker => marker.remove());
  stopMarkers.value = [];

  const userLat = center.value[1];
  const userLon = center.value[0];

  // Get and filter toilets by distance
  const filtered = accessibleToilets.value
    .map(toilet => ({
      ...toilet,
      distance: haversineDistance(userLat, userLon, toilet.lat, toilet.lon)
    }))
    .filter(toilet => toilet.distance <= 2)
    .sort((a, b) => a.distance - b.distance); // Sort by distance ascending

  searchResults.value = filtered.map(t => ({
    geometry: { coordinates: [t.lon, t.lat] },
    properties: { name: t.name, type: 'Accessible Toilet' },
    stopData: t
  }));

  const listBox = document.querySelector('.listBox');
  listBox.scrollTop = 0;
  listBox.innerHTML = '';

  if (filtered.length === 0) {
  listBox.innerHTML = `<div class="list-item">Only wheelchair-accessible Toilets within 2km in City of Sydney are supported.</div>`;
  alert("Only wheelchair-accessible Toilets within 2km in City of Sydney are supported.");
  return;
}


  // Create a distinct, better looking icon for toilets
  const createToiletIcon = (selected = false) => {
    const el = document.createElement('div');
    el.className = 'stop-icon toilet-stop';
    
    // Highlight if selected
    if (selected) {
      el.style.border = '3px solid #ffea00';
      el.style.backgroundColor = '#ffff99';
      el.style.width = '36px';
      el.style.height = '36px';
      el.style.fontSize = '22px';
    }
    
    el.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
        ♿
      </div>
    `;
    return el;
  };

  // Inside the section where you're adding markers for accessible toilets
filtered.forEach(toilet => {
  // Format distance for display
  const friendlyDistance = toilet.distance < 1 
    ? `${(toilet.distance * 1000).toFixed(0)} m` 
    : `${toilet.distance.toFixed(2)} km`;
  
  // Create the regular marker
  const marker = new maplibregl.Marker({ 
    element: createToiletIcon(false) 
  })
  .setLngLat([toilet.lon, toilet.lat])
  .addTo(map.value);
  
  stopMarkers.value.push(marker);

  const listItem = document.createElement('div');
  listItem.className = 'list-item';
  listItem.innerHTML = `
    <h3>${toilet.name}</h3>
    <p><strong>Distance:</strong> ${friendlyDistance}</p>
  `;
  
  // Add click event to list item for toilet selection
// Update the listItem click handler for toilets to show popup and route
listItem.addEventListener('click', async () => {
  if (selectedCardEl === listItem) {
    // Deselection logic
    listItem.classList.remove('selected-card');
    selectedCardEl = null;
    
    if (selectedMarker) {
      selectedMarker.remove();
      selectedMarker = null;
    }
    
    removeRoute();
    selectedDestination.value = null;
    
    // Redraw all toilet markers
    stopMarkers.value.forEach(m => m.remove());
    stopMarkers.value = [];
    filtered.forEach(t => {
      const m = new maplibregl.Marker({ 
        element: createToiletIcon(false) 
      })
      .setLngLat([t.lon, t.lat])
      .addTo(map.value);
      stopMarkers.value.push(m);
    });
    
    return;
  }
  
  // 1) clear any existing selection
  if (selectedCardEl) {
    selectedCardEl.classList.remove('selected-card');
    removeRoute();
    if (selectedMarker) {
      selectedMarker.remove();
      selectedMarker = null;
    }
    // Redraw all toilet markers when switching selection
    stopMarkers.value.forEach(m => m.remove());
    stopMarkers.value = [];
    filtered.forEach(t => {
      const m = new maplibregl.Marker({ 
        element: createToiletIcon(false) 
      })
      .setLngLat([t.lon, t.lat])
      .addTo(map.value);
      stopMarkers.value.push(m);
    });
  }
  
  // 2) mark this card as selected
  listItem.classList.add('selected-card');
  selectedCardEl = listItem;
  
  // 3) Remove all toilet markers except the selected one
  stopMarkers.value.forEach(m => m.remove());
  stopMarkers.value = [];
  
  // 4) Create highlighted marker only for selected toilet
  selectedMarker = new maplibregl.Marker({
    element: createToiletIcon(true)
  })
    .setLngLat([toilet.lon, toilet.lat])
    .addTo(map.value);


  // 4) Create and show the popup
  const distance = haversineDistance(center.value[1], center.value[0], toilet.lat, toilet.lon);
  const friendlyDistance = distance < 1 
    ? `${(distance * 1000).toFixed(0)} m` 
    : `${distance.toFixed(2)} km`;
  
  const popupHTML = `
    <div class="popup-content" style="max-width: 280px;">
      <h3>${toilet.name || 'Accessible Toilet'}</h3>
      ${toilet.suburb ? `<p><strong>Suburb:</strong> ${toilet.suburb}</p>` : ''}
      <p><strong>Distance:</strong> ${friendlyDistance}</p>
      <hr style="margin: 8px 0;" />
      <p><strong>Type:</strong> Accessible Toilet</p>
      <p><strong>Wheelchair Access:</strong> <span style="color: green;">✓ Available</span></p>
    </div>
  `;
  
  //const popup = new maplibregl.Popup({ offset: 25, anchor: 'bottom', autoPan: false, trackPointer: false }).setHTML(popupHTML);
  
  //selectedMarker.setPopup(popup).togglePopup();

  if (currentPopup) currentPopup.remove();

  // createStopPopup now handles scroll-locking, autoPan:false, etc.
  const popup = await createStopPopup(toilet, selectedMarker);
  if (popup) {
    currentPopup = popup;
    selectedMarker.setPopup(popup).togglePopup();
  }

  // Store the marker in the stopMarkers array so it can be cleared later
  stopMarkers.value.push(selectedMarker);

  // 5) Save destination and display route
  selectedDestination.value = {
    lat: toilet.lat,
    lon: toilet.lon,
    name: toilet.name
  };
  hasAlerted.value = false;
  hasArrived.value = false;
  // Display route in wheelchair mode
  if (selectedMode.value === 'wheelchair') {
    displayRoute(toilet.lat, toilet.lon);
  } else if (selectedMode.value === 'transport') {
    recommendViaTransport();
  }
  
  map.value.flyTo({
    center: [toilet.lon, toilet.lat],
    zoom: 15
  });
});
  
  // Add click handler to the marker
  //marker.getElement().addEventListener('click', (e) => {
   // e.stopPropagation();  // Prevent map click from interfering
  //  listItem.click();     // Trigger the list item click to handle everything
 // });
  
  // Save reference to the list item on the marker for future reference

  // Update the marker click handler for toilets
marker.getElement().addEventListener('click', (e) => {
  e.stopPropagation();
  
  // Close any existing popup
  if (currentPopup) {
    currentPopup.remove();
  }

  // Only show popup, don't trigger route or selection
  const distance = haversineDistance(center.value[1], center.value[0], toilet.lat, toilet.lon);
  const friendlyDistance = distance < 1 
    ? `${(distance * 1000).toFixed(0)} m` 
    : `${distance.toFixed(2)} km`;
  
  const popupHTML = `
    <div class="popup-content" style="max-width: 280px;">
      <h3>${toilet.name || 'Accessible Toilet'}</h3>
      ${toilet.suburb ? `<p><strong>Suburb:</strong> ${toilet.suburb}</p>` : ''}
      <p><strong>Distance:</strong> ${friendlyDistance}</p>
      <hr style="margin: 8px 0;" />
      <p><strong>Type:</strong> Accessible Toilet</p>
      <p><strong>Wheelchair Access:</strong> <span style="color: green;">✓ Available</span></p>
    </div>
  `;
  
  const popup = new maplibregl.Popup({ offset: 25, anchor: 'bottom', autoPan: false, trackPointer: false })
    .setHTML(popupHTML);
  
  currentPopup = popup;
  marker.setPopup(popup).togglePopup();
  
  // Don't trigger list item click or route display
  
  // Also trigger the list item click to highlight the card
  
});
  
  
  listBox.appendChild(listItem);
});

  return;
}

  const bias = `proximity:${lon},${lat}`;
  const maxDistanceKm = selectedMode.value === 'wheelchair' ? 2 : 10; // 2km for wheelchair, 10km for transport
  const circleFilter = `circle:${lon},${lat},${maxDistanceKm * 1000}`;

  map.value.setCenter([lon, lat]);

  const url = `https://api.geoapify.com/v2/places?categories=${selectedPlace.value.code}&conditions=wheelchair.yes&filter=${circleFilter}&bias=${bias}&limit=20&apiKey=${apiKey}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (!result.features || result.features.length === 0) {
  const listBox = document.querySelector('.listBox');
  if (listBox) {
    listBox.innerHTML = `<div class="list-item">Only wheelchair-accessible places within 2km in City of Sydney are supported.</div>`;
  }
  alert("Only wheelchair-accessible places within 2km in City of Sydney are supported.");
  return;
}


      // Calculate distances, filter out places beyond 2km, and sort results.
      const sorted = result.features
  .map(place => {
    const pLat = place.geometry.coordinates[1];
    const pLon = place.geometry.coordinates[0];
    const distance = haversineDistance(lat, lon, pLat, pLon);
    return { ...place, distance };
  })
  .filter(place => {
    const suburb = place.properties.suburb || place.properties.city || "";
    const withinSydney = sydneySuburbs.some(s => suburb.includes(s));
    if (selectedMode.value === 'wheelchair') {
      return place.distance <= 2 && withinSydney;
    } else if (selectedMode.value === 'transport') {
      return withinSydney; // allow > 2km
    }
    return false;
  })
  .sort((a, b) => a.distance - b.distance);

// if nothing passes the 2 km filter, show your no‐results message and bail out
if (selectedMode.value === 'wheelchair' && sorted.length === 0) {
  const listBox = document.querySelector('.listBox')
  listBox.innerHTML = `
    <div class="list-item">
      Only wheelchair-accessible places within 2 km in City of Sydney are supported.
    </div>`;
  alert("Only wheelchair-accessible places within 2 km in City of Sydney are supported.");
  return;
}

      // Save search results for later.
      searchResults.value = sorted;

      // For each place, add a marker and create a clickable list item.
      sorted.forEach(place => {
        const [lng, latCoord] = place.geometry.coordinates;
        const name = place.properties.name || "Unnamed";
        const address = place.properties.formatted || "";
        const distance = place.distance;
        const friendlyDistance = distance < 1 
          ? `${(distance * 1000).toFixed(0)} m` 
          : `${distance.toFixed(2)} km`;

        // Determine wheelchair accessibility status.
        let wheelchair = "unknown";
        if (place.properties.wheelchair) {
          wheelchair = place.properties.wheelchair;
        } else if (place.properties.facilities?.wheelchair !== undefined) {
          wheelchair = place.properties.facilities.wheelchair === true ? "yes" : "no";
        } else if (place.properties.categories?.includes("wheelchair.yes")) {
          wheelchair = "yes";
        }
        const hasToilet = place.properties.details?.includes("details.facilities") ? "Available" : "Not listed";
        const wheelchairBadge = {
          yes: '<span class="badge badge-success">♿ Accessible</span>',
          limited: '<span class="badge badge-warning">♿ Limited</span>',
          no: '<span class="badge badge-danger">♿ Not Accessible</span>',
          unknown: '<span class="badge badge-secondary">♿ Unknown</span>',
        }[wheelchair] || '<span class="badge badge-secondary">♿ Unknown</span>';
        const toiletBadge =
          hasToilet === "Available"
            ? '<span class="badge badge-info">🚻 Toilet Available</span>'
            : '<span class="badge badge-secondary">🚻 Not listed</span>';

        // Create and add destination marker.
        const marker = createDestinationMarker(lng, latCoord);
        allMarkers.value.push(marker);

        // Create a list item for the destination.
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.innerHTML = `
          <h3>${name}</h3>
          <p>${address}</p>
          <p><strong>Distance:</strong> ${friendlyDistance}</p>
        `;
        // Save a reference to the list item on the place object.
        place.listItem = listItem;

        // Add click event for toggling selection.
        // Updated listItem click event handler inside the fetchPlaces function
listItem.addEventListener('click', () => {
  if (selectedCardEl === listItem) {
    // User clicked on already selected card - deselect it
    removeRoute();
    if (selectedMarker) {
      selectedMarker.remove();
      selectedMarker = null;
    }
    listItem.classList.remove('selected-card');
    selectedCardEl = null;
    selectedDestination.value = null; // Reset selected destination
    reAddAllMarkers();
  } else {
    // User clicked on a new card - select it
    if (selectedCardEl) {
      selectedCardEl.classList.remove('selected-card');
      removeRoute();
      if (selectedMarker) {
        selectedMarker.remove();
        selectedMarker = null;
      }
      reAddAllMarkers();
    }
    listItem.classList.add('selected-card');
    selectedCardEl = listItem;
    selectedDestination.value = {
      lat: latCoord,
      lon: lng,
      name: name
    };
    hasAlerted.value = false;
    hasArrived.value = false;
    listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    removeAllDestinationMarkers();
    const selectedMarkerElement = document.createElement('div');
    selectedMarkerElement.innerHTML = `
      <div style="text-align:center;">
        <i class="pi pi-map-marker" style="font-size: 24px; color: #2a9d8f;"></i>
        <br>
        <span style="font-size:10px;">${name}</span>
      </div>
    `;
    selectedMarker = new maplibregl.Marker(selectedMarkerElement)
      .setLngLat([lng, latCoord])
      .addTo(map.value);
    const popupHTML = `
      <div class="popup-content">
        <h3>${name}</h3>
        <p>${address}</p>
        ${wheelchairBadge}
        ${toiletBadge}
        <p><strong>Distance:</strong> ${friendlyDistance}</p>
      </div>
    `;
    const popup = new maplibregl.Popup({ offset: 25, anchor: 'bottom', autoPan: false, trackPointer: false  })
      .setHTML(popupHTML);
    selectedMarker.setPopup(popup);
    popup.on('close', () => {
      removeRoute();
      if (selectedMarker) {
        selectedMarker.remove();
        selectedMarker = null;
      }
      if (selectedCardEl) {
        selectedCardEl.classList.remove('selected-card');
        selectedCardEl = null;
      }
      reAddAllMarkers();
    });
    
    // Only call displayRoute if in wheelchair mode
    if (selectedMode.value === 'wheelchair') {
      displayRoute(latCoord, lng);
    } else if (selectedMode.value === 'transport') {
      recommendViaTransport();
    }
  }
});

        // Attach click event to the marker.
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
          listItem.click();
        });

        listBox.appendChild(listItem);
      });
    })
    .catch(error => {
      console.error("error", error);
      alert("Something went wrong while fetching places.");
    });
};
const onLocationSelect = (e) => {
  const selected = e.value;
  if (selected?.lat && selected?.lon) {
    center.value = [selected.lon, selected.lat];
    locationSource.value = 'manual';
  }
};


const isValidCoordinate = (lng, lat) =>
  typeof lng === 'number' && !isNaN(lng) &&
  typeof lat === 'number' && !isNaN(lat);

  const displayRoute = (destinationLat, destinationLon) => {
  removeRoute();

  const currentLat = center.value[1];
  const currentLon = center.value[0];

  // ✅ Validate coordinates
  if (!isValidCoordinate(currentLon, currentLat)) {
    console.error("Invalid current location coordinates:", currentLon, currentLat);
    return;
  }

  if (!isValidCoordinate(destinationLon, destinationLat)) {
    console.error("Invalid destination coordinates:", destinationLon, destinationLat);
    return;
  }

  const waypoints = `${currentLat},${currentLon}|${destinationLat},${destinationLon}`;
  const routeUrl = `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypoints)}&mode=walk&format=geojson&apiKey=${apiKey}`;

  fetch(routeUrl)
    .then(res => res.json())
    .then(routeData => {
      if (routeData.features && routeData.features.length > 0) {
        const routeGeoJSON = routeData.features[0];

        map.value.addSource('route', {
          type: 'geojson',
          data: routeGeoJSON
        });

        map.value.addLayer({
          id: 'routeLine',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#003366',
            'line-width': 8,
            'line-dasharray': [2, 2]
          }
        });

        // ✅ FIXED: Use [lng, lat] order here
        const startEl = document.createElement('div');
        startEl.className = 'route-endpoint-marker';
        startEl.innerHTML = `
          <div class="endpoint-marker start-marker">
            <div class="endpoint-label">YOU ARE HERE</div>
          </div>
        `;
        routeStartMarker = new maplibregl.Marker({ element: startEl })
          .setLngLat([currentLon, currentLat])  // ✅ [lng, lat]
          .addTo(map.value);

        const coords = routeGeoJSON.geometry.coordinates;
        const [endLng, endLat] = coords[coords.length - 1];

        const endEl = document.createElement('div');
        endEl.className = 'route-endpoint-marker';
        endEl.innerHTML = `
          <div class="endpoint-marker end-marker">
            <div class="endpoint-label">DESTINATION</div>
            <div class="endpoint-icon end-icon"></div>
          </div>
        `;
        routeEndMarker = new maplibregl.Marker({ element: endEl })
          .setLngLat([endLng, endLat])  // ✅ [lng, lat]
          .addTo(map.value);
      } else {
        console.error("No route features found", routeData);
      }
    })
    .catch(error => {
      console.error("Error fetching route:", error);
    });
};



const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const showBoxList = (className) => {
  const element = document.querySelector(`.${className}`);
  if (element && getComputedStyle(element).display === 'none') {
    element.style.display = 'block';
  }
};

const recommendViaTransport = () => {
  if (!selectedDestination.value) {
    alert("Please select a destination.");
    return;
  }

  const allStops = [...tramStops.value, ...busStops.value];
  const userLat = center.value[1];
  const userLon = center.value[0];
  const destLat = selectedDestination.value.lat;
  const destLon = selectedDestination.value.lon;

  if (
    isNaN(userLat) || isNaN(userLon) ||
    isNaN(destLat) || isNaN(destLon)
  ) {
    console.error("Invalid coordinates passed to recommendViaTransport");
    return;
  }

  const nearestToUser = allStops.map(stop => ({
    ...stop,
    distance: haversineDistance(userLat, userLon, stop.lat, stop.lon)
  })).sort((a, b) => a.distance - b.distance)[0];

  const nearestToDest = allStops.map(stop => ({
    ...stop,
    distance: haversineDistance(destLat, destLon, stop.lat, stop.lon)
  })).sort((a, b) => a.distance - b.distance)[0];

  if (!nearestToUser || !nearestToDest) {
    alert("No suitable transport stops found.");
    return;
  }

  const coordsValid = coord => (
    typeof coord?.lon === 'number' && typeof coord?.lat === 'number'
  );

  if (!coordsValid(nearestToUser) || !coordsValid(nearestToDest)) {
    console.error("Invalid tram/bus stop coordinates");
    return;
  }

  // draw line
  const line = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [nearestToUser.lon, nearestToUser.lat],
        [nearestToDest.lon, nearestToDest.lat]
      ]
    }
  };

  map.value.getSource('transitLine')?.setData(line) ||
    map.value.addSource('transitLine', { type: 'geojson', data: line });

  map.value.addLayer({
    id: 'transitLine',
    type: 'line',
    source: 'transitLine',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#9c27b0',
      'line-width': 5,
      'line-dasharray': [4, 2]
    }
  });

  // add markers safely
  const userMarker = createStopMarker(nearestToUser);
  const destMarker = createStopMarker(nearestToDest);

  if (userMarker) userMarker.addTo(map.value);
  if (destMarker) destMarker.addTo(map.value);


};
const toggleHeatmap = () => {
  showHeatmap.value = !showHeatmap.value;
  if (showHeatmap.value) {
    addSteepnessHeatmap();
  } else {
    if (map.value.getLayer('steepness-heatmap-layer')) {
      map.value.removeLayer('steepness-heatmap-layer');
      map.value.removeSource('steepness-heatmap');
    }
  }
};

// Add this method to your component
const openGoogleMapsNavigation = async () => {
  if (!selectedDestination.value) {
    alert("Please select a destination first");
    return;
  }

  const startLat = center.value[1];
  const startLng = center.value[0];
  const endLat = selectedDestination.value.lat;
  const endLng = selectedDestination.value.lon;

  // Validate coordinates
  if (!isValidCoordinate(startLng, startLat) || !isValidCoordinate(endLng, endLat)) {
    alert("Invalid coordinates for navigation");
    return;
  }

  try {
    // Get the route from Geoapify
    const waypoints = `${startLat},${startLng}|${endLat},${endLng}`;
    const routeUrl = `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypoints)}&mode=walk&format=geojson&apiKey=${apiKey}`;
    
    const response = await fetch(routeUrl);
    const routeData = await response.json();

    let googleMapsUrl;
    
    if (routeData.features && routeData.features.length > 0) {
      // Extract coordinates from the Geoapify route
      const coordinates = routeData.features[0].geometry.coordinates;
      const path = coordinates.map(coord => `${coord[1]},${coord[0]}`).join('|');
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=walking&path=${encodeURIComponent(path)}`;
    } else {
      // Fallback to simple directions
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=walking`;
    }
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open Google Maps app directly
      const appUrl = `comgooglemaps://?saddr=${startLat},${startLng}&daddr=${endLat},${endLng}&directionsmode=walking`;
      
      // Open app or fallback to browser
      window.location.href = appUrl;
      setTimeout(() => {
        if (!document.hidden) {
          window.open(googleMapsUrl, '_blank');
        }
      }, 500);
    } else {
      window.open(googleMapsUrl, '_blank');
    }
    
  } catch (error) {
    console.error("Error generating Google Maps route:", error);
    // Simple fallback
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=walking`;
    window.open(fallbackUrl, '_blank');
  }
};




</script>

<template>
  <div class="main-container">
    <div class="introduceContainer">
      <div class="overlay"></div>
      <h1>Accessible Places Finder</h1>
      <h3>Find Accessible Places in Sydney CBD and Navigate through Wheelchair Paths</h3>
      <div class="buttonBottonLine">

      </div>
    </div>

    <div class="selectBox wow animate__animated animate__fadeInLeft">
      <div class="selectContainer">

        <div class="horizontalInputs">
          <!-- Place Type Dropdown -->
          <div class="card place-type-card">
            <label for="place">Select Place Type</label>
            <Select
              v-model="selectedPlace"
              :options="places"
              optionLabel="name"
              placeholder="Select a Place"
              @change="onPlaceChange"
            />
          </div>

          <!-- Location Input Group -->
          <div class="card location-card">
            <label for="location">Location</label>
            <div class="location-input-group">
              <span class="p-input-icon-right">
                <AutoComplete
                  v-model="fromLocation"
                  :suggestions="suggestions"
                  optionLabel="label"
                  placeholder="Enter address from the dropdown or use live location"
                  @complete="searchSuggestions"
                  @item-select="onLocationSelect"

                />

                  
    
                <i 
                  v-if="fromLocation" 
                  class="pi pi-times clear-icon" 
                  @click="clearLocation"
                />
              </span>
               <span class="or-separator">OR</span>
              <Button
              
                label="My Location"
                class="button location-button"
                @click="getLiveLocation"
                icon="pi pi-map-marker"
                :severity="isLiveLocationActive ? 'success' : 'secondary'"
              />
              <span v-if="isLiveLocationActive" class="live-location-indicator">
  <i class="pi pi-circle-fill" style="color: green; font-size: 0.8rem;"></i>
  Live updating
</span>
            </div>
          </div>

          <!-- Search Button -->
          <div class="card button-card">
            <label for="start">Search Places</label>
            <Button
              id="start"
              class="button"
              type="button"
              @click="handleSearch"
            >
              Find Places
            </Button>
          </div>


          <!-- <Button
  v-if="selectedDestination"
  label="Navigate with Google Maps"
  icon="pi pi-external-link"
  @click="openGoogleMapsNavigation"
  class="button google-maps-button"
  style="margin-top: 1rem; background-color: #34a853;"
/> -->
        </div>

        <!-- ✅ NEW: Toggle Heatmap Button -->
        <div style="display: flex; justify-content: center; margin: 1.5rem 0 1rem;">
          <!-- <Button
  :label="showHeatmap ? 'Hide Footpath Steepness Map' : 'Show Footpath Steepness Map'"
  :icon="showHeatmap ? 'pi pi-eye-slash' : 'pi pi-eye'"
  @click="toggleHeatmap"
  class="button" -->
<!-- /> -->

        </div>

        <!-- Map + Results section -->
        <div class="mapBox">
          <!-- 🗺️ Map container -->
          <div ref="mapContainer" class="map-container">
            <div class="footpath-legend" v-if="showHeatmap">
              <strong>Footpath Steepness</strong>
              <div class="legend-gradient"></div>
              <div class="legend-labels">
                <span>Flat</span>
                <span>Moderate</span>
                <span>Steep</span>
                <span>Very Steep</span>
              </div>
            </div>
          </div>
          <!-- <Button
  v-if="selectedDestination"
  label="Navigate with Google Maps"
  icon="pi pi-external-link"
  @click="openGoogleMapsNavigation"
  class="button google-maps-button-mobile"
  style="margin-top: 1rem; background-color: #34a853;"
/> -->
          <div class="courseContainer">
            <h3 style="text-align: center; font-weight: bold;">How to use Navigator</h3>
            <div class="courseBox">
              <h3>First, choose the place you want to visit.</h3>
              <h3>Second, use your current location.</h3>
              <h3>Finally, click on "Search Place" and enjoy your trip!</h3>
            </div>
          </div>
          <!-- 📋 List container -->
          <div class="listBoxContainer">
            <h3 style="text-align: center; font-weight: bold;">Wheelchair-Friendly Navigator</h3>
            <div class="listBox"></div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>






<!-- Scoped Styles -->
<style scoped>
@import "maplibre-gl/dist/maplibre-gl.css";

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); 
}
.arrival-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-weight: bold;
  border: 2px solid #4CAF50;
}

.arrival-toast.show {
  opacity: 1;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.live-location-indicator {
  margin-left: 0.5rem;
  color: green;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Add this to your styles */
.google-maps-button {
  background-color: #4263ce !important;
  border-color: #4263ce !important;
}

.google-maps-button:hover {
  background-color: #4263ce !important;
  border-color: #4263ce !important;
}

.google-maps-button-mobile {
  display: none;
  background-color: #4263ce !important;
  border-color: #4263ce !important;
}

.google-maps-button-mobile:hover {
  background-color: #4263ce !important;
  border-color: #4263ce !important;
}

.main-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #ffffff;
  /* padding: 2rem 0; */
}

.clear-icon {
  cursor: pointer;
  color: #6c757d;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.clear-icon:hover {
  color: #495057;
}

.p-input-icon-right {
  position: relative;
  flex: 2;
  min-width: 0;
}

/* Adjust the input padding to prevent text under the icon */
:deep(.p-autocomplete-input) {
  padding-right: 2rem !important;
}
.footpath-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 10px 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  z-index: 5;
}

.legend-gradient {
  width: 180px;
  height: 12px;
  margin-top: 8px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: linear-gradient(to right, 
    rgba(0, 255, 0, 0.6) 0%, 
    rgba(255, 255, 0, 0.6) 33%, 
    rgba(255, 165, 0, 0.7) 66%, 
    rgba(255, 0, 0, 0.9) 100%);
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #333;
}

/* Mobile styles */
@media (max-width: 768px) {
  .p-input-icon-right {
    width: 100%;
  }
  
  :deep(.p-autocomplete) {
    width: 100%;
  }
}

/* Base styles for all screens */
.horizontalInputs {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  align-items: flex-end;
}

.place-type-card {
  min-width: 180px;
  max-width: 200px;
}

.location-card {
  flex: 2;
  min-width: 300px;
}

.location-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.location-input {
  flex: 2;
  min-width: 0;
}

.location-button {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.or-separator {
  padding: 0 0.5rem;
  font-weight: bold;
  color: #666;
  text-align: center;
}


/* Mobile responsive styles */
@media (max-width: 768px) {
  .horizontalInputs {
    flex-direction: column;
    gap: 1rem;
  }
  
  .place-type-card,
  .location-card,
  .button-card {
    min-width: 100%;
    max-width: 100%;
  }
  
  .location-input-group {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .location-input,
  .location-button {
    width: 100%;
  }
  
  .or-separator {
    display: block;
    width: 100%;
    padding: 0.5rem 0;
    text-align: center;
  }
  
  .location-button .p-button-label {
    display: inline-block; /* Show text on mobile */
  }
  
  .location-button .pi {
    margin-right: 0.5rem;
  }
}

/* Tablet responsive styles */
@media (min-width: 769px) and (max-width: 1024px) {
  .place-type-card {
    min-width: 160px;
  }
  
  .location-card {
    min-width: 250px;
  }
  
  .location-button .p-button-label {
    display: none; /* Hide text on tablet */
  }
  
  .location-button .pi {
    margin-right: 0;
    font-size: 1.2rem;
  }
}

/* PrimeVue component overrides */
:deep(.p-autocomplete) {
  width: 100%;
}

:deep(.p-autocomplete-input) {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
}

:deep(.p-dropdown) {
  width: 100%;
}

:deep(.p-button) {
  white-space: nowrap;
}

.buttonBottonLine {
  position: absolute;
  bottom: 0;
  width: 100vw;
  height: 34px;
  background-color: #ffffff;
  border-top-left-radius: 34px;
  border-top-right-radius: 34px;
}

.introduceContainer {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center; 
  align-items: center;    
  width: 100vw;
  height: auto;
  text-align: center;
  /* margin-top: 4rem; */
  /* margin-bottom: 2rem; */
  background-image: url('./image/new-7.png');
  /* background-color: rgba(255, 255, 255, 0.495); */
  /* background-blend-mode: lighten; */
  aspect-ratio: 3/1;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  /* border-radius: 20px; */
  overflow: hidden;
  color: #2f2f2f;
}

.introduceContainer h1 {
  font-size: 50px;
  font-weight: bold;
  margin-bottom: 1rem;
  color: rgb(255, 255, 255);
  z-index: 1;
}

.introduceContainer h3 {
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 1rem;
  color: rgb(255, 255, 255);
  z-index: 1;
}

.introduceContainer p {
  font-size: 24px;
}
@media (max-width: 960px) {
  .introduceContainer h3 {
    display: none;
  }
}
/* Mobile Responsive Header and Image */
@media (max-width: 768px) {
  .introduceContainer {
    /* width: 90%; */
    /* margin-top: 2rem; */
    /* margin-bottom: 1rem; */
    /* aspect-ratio: auto; */
    padding: 1rem;
  }
  .introduceContainer h1 {
    font-size: 2rem;
  }
  /* .introduceContainer h3 {
    font-size: 1.25rem;
  } */
}

@media (max-width: 430px) {
  .introduceContainer {
    aspect-ratio: 2/1;
  }
  .introduceContainer h1 {
    font-size: 1.3rem;
  }
}

.selectBox {
  width: 100%;
  /* margin-bottom: 2rem; */
}

.selectContainer {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #ccc;
  /* border: 1px solid #ccc; */
  /* border-radius: 12px; */
}

:deep(.p-dropdown),
:deep(.p-inputtext) {
  background: white !important;
  color: black !important;
}

:deep(.p-dropdown .p-dropdown-label) {
  color: black !important;
}

:deep(.p-dropdown-panel) {
  background: white !important;
  color: black !important;
}

.horizontalInputs {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  /* margin-bottom: 2rem; */
  align-items: flex-end;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 250px;
}

.card label {
  font-weight: bold;
}

.button-card {
  display: flex;
  justify-content: center;
}

.button {
  background-color: #1e3a8a;
  color: white;
  font-weight: bold;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
}

.button:hover {
  background-color: #2e4ea3 !important; /* A deeper blue shade */
  border-color: #2e4ea3 !important;
}


/* @media (prefers-color-scheme: dark) {
  .main-container {
    background: linear-gradient(135deg, #e0d3f5, #fbeaff, #d5e1f2);
    color: black;
  }
  .selectContainer {
    background-color: white;
    border: none;
  }
  .card {
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 10px;
  }
  .card label,
  .introduceContainer p {
    color: black;
  }
  .mapBox {
    background-color: transparent;
  }
  .listBox {
    background-color: #f5f5f5;
    color: black;
  }
  .list-item {
    border-bottom: 1px solid #ccc;
    background-color: #fff !important;
    color: black;
  }
  .list-item:not(.selected-card):hover {
    background-color: #e6f0ff;
  }
  .list-item p {
    color: #666;
  }
  .map-container a {
    background-color: transparent !important;
    color: inherit !important;
  }
  .button {
    background-color: #0066cc;
    color: white;
  }
  .button:hover {
    background-color: #004999;
  }
  .maplibregl-popup-content {
    background-color: white !important;
    color: black !important;
    border-radius: 8px !important;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
  .maplibregl-popup-tip {
    border-top-color: white !important;
  }
  .listBoxContainer h2 {
    background-color: transparent;
    border: 1px solid #ccc;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
} */

.mapBox {
  display: flex;
  width: 100%;
  height: 500px;
  gap: 1rem;
}

.map-container {
  width: 70%;
  height: 100%;
  border: 1px solid #ccc;
  border-radius: 12px;
}

.listBoxContainer {
  background-color: var(--p-sky-100);
  width: 30%;
  height: 100%;
  border: 1px solid #ccc;
  border-radius: 12px;
  display: none;
}

.courseContainer {
  background-color: var(--p-sky-100);
  width: 30%;
  height: 100%;
  border: 1px solid #ccc;
  border-radius: 12px;
  /* display: none; */
}


@media (max-width: 1100px) {
  .mapBox {
    flex-direction: column;
    align-items: center;
    height: 800px;
  }
  .map-container {
    width: 100%;
    height: 500px;
  }
  .listBoxContainer {
    width: 100%;
    height: 280px;
    margin-bottom: 20px;
  }
  .courseContainer {
    width: 100%;
    height: 280px;
    margin-bottom: 20px;
  }

  .google-maps-button{
    display: none;
  }

  .google-maps-button-mobile {
    display: block;
  }
}

.listBox {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100% - 2.5rem);
  background-color: #f5f5f5;
  overflow-y: auto;
  padding: 1rem;
  gap: 10px;
  border: 1px solid #ccc;
  /* border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px; */
}

.courseBox {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100% - 2.5rem);
  background-color: #f5f5f5;
  overflow-y: auto;
  padding: 1rem;
  gap: 10px;
  border: 1px solid #ccc;
}

.listBoxContainer h2 {
  text-align: center;
  font-weight: 700;
  margin-top: 0;
  border-bottom: 2px solid #ccc;
  height: 2.5rem;
}
</style>

<!-- Additional non-scoped styles -->
<style>
.route-endpoint-marker {
  width: auto;
  height: auto;
  z-index: 100;
}

.endpoint-marker {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.endpoint-marker.start-marker .endpoint-label {
  background-color: green;
}

.endpoint-marker.start-marker .endpoint-icon {
  background-color: green;
}

.endpoint-label {
  background-color: #ff0000;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 4px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  text-align: center;
  opacity: 0.9;
}

.endpoint-icon {
  width: 20px;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background-color: #ff0000;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.endpoint-marker .end-marker .endpoint-label {
  background-color: #e91e63;
}

.endpoint-marker .end-marker .endpoint-icon {
  background-color: #e91e63;
}

.end-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.badge {
  display: inline-block;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-right: 4px;
}

.badge-success {
  background-color: #28a745;
  color: white;
}

.badge-warning {
  background-color: #ffc107;
  color: #212529;
}

.badge-danger {
  background-color: #dc3545;
  color: white;
}

.badge-secondary {
  background-color: #6c757d;
  color: white;
}

.badge-info {
  background-color: #17a2b8;
  color: white;
}

.maplibregl-popup-content span {
  margin-bottom: 0.2rem;
}

</style>

<style>
.list-item {
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 10px;
  padding: 16px;
  background-color: #fff;
  transition: all 0.3s ease;
  margin-bottom: 10px;
}

.list-item h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.list-item p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.highlight {
  font-weight: bold;
  color: red;
}

:deep(.p-dropdown) {
  background-color: white !important;
  border: 1px solid #ced4da !important;
}

:deep(.p-dropdown:not(.p-disabled).p-focus) {
  border-color: #2196F3 !important;
  box-shadow: 0 0 0 0.2rem rgba(33, 150, 243, 0.25) !important;
}

:deep(.p-dropdown .p-dropdown-label) {
  color: #495057 !important;
  background: white !important;
}

:deep(.p-dropdown-panel) {
  background: white !important;
  border: 1px solid #ddd !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1) !important;
}

:deep(.p-dropdown-panel .p-dropdown-items) {
  background: white !important;
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item) {
  color: #495057 !important;
  background: white !important;
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item.p-highlight) {
  background-color: #e6f0ff !important;
  color: #495057 !important;
}

:deep(.p-dropdown-panel .p-dropdown-items .p-dropdown-item:hover) {
  background-color: #f5f5f5 !important;
}

:deep(.p-dropdown .p-dropdown-trigger) {
  background: white !important;
}

:deep(.p-dropdown .p-dropdown-trigger-icon) {
  color: #6c757d !important;
}

.list-item:hover {
  box-shadow: 0 0 10px rgba(0, 119, 254, 0.4) !important;
  transform: scale(1.02); 
}


.list-item.selected-card {
  border-color: #0077fe !important;
  background-color: #e6f0ff !important; 
  box-shadow: 0 0 10px rgba(0, 119, 254, 0.4) !important;
  transform: scale(1.02); 
}
</style>

<style>
.stop-icon {
  width: 30px;
  height: 30px;
  font-size: 18px;
  text-align: center;
  line-height: 30px;
  background: white;
  border: 2px solid #888;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.tram-stop {
  color: #2e7d32;
}

.bus-stop {
  color: #f57c00;
}

.location-button {
  background-color: #1e3a8a !important;
  color: white !important;
  font-weight: bold;
  border-radius: 8px;
  border: none;
}

.location-button:hover {
  background-color: #2e4ea3 !important;
  color: white !important;
}


</style>
