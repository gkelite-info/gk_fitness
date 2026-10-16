import { ShortestPathResult } from '@/helpers/geofence/pathfinding';
import { GymMapTarget, POINTER_COLOR } from './types';
import { LEAFLET_JS, LEAFLET_CSS } from './vendor/leafletAssets';

interface GenerateMapHtmlOptions {
  activeGym: GymMapTarget;
  userLocation: { latitude: number; longitude: number } | null;
  heading: number | null;
  bearingDegrees: number;
  accurateDistance: string;
  radiusMeters: number;
  routeToDisplay?: ShortestPathResult | null;
  pointerColor?: string;
  hasGpsSignal?: boolean;
}

export function generateMapHtml({
  activeGym,
  userLocation,
  heading,
  bearingDegrees,
  accurateDistance,
  radiusMeters,
  routeToDisplay,
  pointerColor = POINTER_COLOR,
  hasGpsSignal = true,
}: GenerateMapHtmlOptions): string {
  const userLat = userLocation?.latitude || activeGym.latitude + 0.002;
  const userLng = userLocation?.longitude || activeGym.longitude + 0.002;
  const gymLat = activeGym.latitude;
  const gymLng = activeGym.longitude;
  const initialHeading = heading || bearingDegrees || 0;
  const routeCoords = routeToDisplay?.coordinates || [];
  const routeDist = routeToDisplay?.distanceFormatted || accurateDistance;
  const routeDur = routeToDisplay?.durationFormatted || '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          ${LEAFLET_CSS}
        </style>
        <script>
          ${LEAFLET_JS}
        </script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; background: #090A0C; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          
          /* High-Precision Pulsing User Beacon with Dark Blue (#0075DC) Heading Direction Pointer */
          .user-beacon-wrapper {
            position: relative;
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .user-pulse {
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background-color: rgba(0, 117, 220, 0.3);
            animation: pulse-ring 2s infinite ease-out;
            z-index: 1;
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.4); opacity: 1; }
            100% { transform: scale(1.9); opacity: 0; }
          }
          
          /* Directional Heading Cone in Dark Blue (#0075DC) */
          .user-heading-pointer {
            position: absolute;
            top: 4px;
            left: 50%;
            width: 0;
            height: 0;
            margin-left: -8px;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 18px solid ${pointerColor};
            transform-origin: 50% 22px;
            filter: drop-shadow(0 0 6px rgba(0, 117, 220, 0.6));
            transition: transform 0.25s cubic-bezier(0.2, 0, 0.2, 1);
            z-index: 3;
            pointer-events: none;
          }

          .user-dot {
            position: relative;
            width: 18px;
            height: 18px;
            background-color: ${pointerColor};
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 14px ${pointerColor}, 0 2px 6px rgba(0,0,0,0.6);
            z-index: 4;
          }

          /* Custom Gym Pin */
          .gym-pin {
            background: #CCFF00;
            color: #000;
            font-weight: 800;
            padding: 6px 12px;
            border-radius: 14px;
            font-size: 11px;
            border: 2px solid #000;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
          }

          .leaflet-popup-content-wrapper {
            background: #141519 !important;
            color: #FFFFFF !important;
            border: 1px solid #2B2D33 !important;
            border-radius: 16px !important;
            box-shadow: 0 8px 30px rgba(0,0,0,0.7) !important;
            padding: 4px !important;
          }
          .leaflet-popup-tip {
            background: #141519 !important;
          }
          
          .leaflet-bar { border: none !important; box-shadow: none !important; }

          /* Strict Black & White filter when offline / GPS lost: applied cleanly to tiles & pins */
          body.gps-lost .leaflet-tile-pane,
          body.gps-lost .leaflet-tile {
            filter: grayscale(100%) contrast(1.08) brightness(0.92) !important;
            -webkit-filter: grayscale(100%) contrast(1.08) brightness(0.92) !important;
            transition: filter 0.4s ease, -webkit-filter 0.4s ease;
          }
          body.gps-lost .gym-pin {
            filter: grayscale(100%) !important;
            -webkit-filter: grayscale(100%) !important;
          }

          /* Ensure the A* Route stands out with crystal-clear brightness on Black & White map */
          body.gps-lost .leaflet-overlay-pane path.route-main-path {
            stroke: #FFFFFF !important;
            stroke-opacity: 1 !important;
            stroke-width: 6.5px !important;
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) !important;
          }
          body.gps-lost .leaflet-overlay-pane path.route-glow-path {
            stroke: #FFFFFF !important;
            stroke-opacity: 0.5 !important;
            stroke-width: 10px !important;
          }
        </style>
        <style id="dynamic-bw-style">
          ${hasGpsSignal ? '' : '.leaflet-tile-pane, .leaflet-tile { filter: grayscale(100%) contrast(1.08) brightness(0.92) !important; -webkit-filter: grayscale(100%) contrast(1.08) brightness(0.92) !important; } .gym-pin { filter: grayscale(100%) !important; } .leaflet-overlay-pane path.route-main-path { stroke: #FFFFFF !important; stroke-opacity: 1 !important; stroke-width: 6.5px !important; filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) !important; } .leaflet-overlay-pane path.route-glow-path { stroke: #FFFFFF !important; stroke-opacity: 0.5 !important; stroke-width: 10px !important; }'}
        </style>
      </head>
      <body class="${hasGpsSignal ? '' : 'gps-lost'}">
        <div id="map"></div>
        <script>
          // Multi-Tier Local Storage Engine for 100% Offline Map Operation
          var DB_NAME = 'GkFitnessOfflineMap_v3';
          var STORE_NAME = 'offline_tiles';
          var dbInstance = null;
          var memoryTileCache = {};

          // Auto-purge any stale DB containing invalid third-party API key watermark tiles
          try {
            if (typeof indexedDB !== 'undefined' && indexedDB.deleteDatabase) {
              indexedDB.deleteDatabase('GkFitnessOfflineMap_v2');
              indexedDB.deleteDatabase('GkFitnessOfflineMap_v1');
            }
          } catch(e) {}

          function initStorage(callback) {
            if (dbInstance) { if (callback) callback(dbInstance); return; }
            try {
              if (typeof indexedDB === 'undefined') {
                if (callback) callback(null);
                return;
              }
              var req = indexedDB.open(DB_NAME, 1);
              req.onupgradeneeded = function(e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                  db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
              };
              req.onsuccess = function(e) {
                dbInstance = e.target.result;
                if (callback) callback(dbInstance);
              };
              req.onerror = function() {
                if (callback) callback(null);
              };
            } catch(e) {
              if (callback) callback(null);
            }
          }
          initStorage();

          function getStoredTile(tileKey, callback) {
            if (memoryTileCache[tileKey]) {
              callback(memoryTileCache[tileKey]);
              return;
            }
            initStorage(function(db) {
              if (!db) { callback(null); return; }
              try {
                var tx = db.transaction(STORE_NAME, 'readonly');
                var store = tx.objectStore(STORE_NAME);
                var req = store.get(tileKey);
                req.onsuccess = function() {
                  if (req.result && req.result.data) {
                    memoryTileCache[tileKey] = req.result.data;
                    callback(req.result.data);
                  } else {
                    callback(null);
                  }
                };
                req.onerror = function() { callback(null); };
              } catch(e) {
                callback(null);
              }
            });
          }

          function storeTile(tileKey, dataUrl) {
            if (!tileKey || !dataUrl) return;
            memoryTileCache[tileKey] = dataUrl;
            initStorage(function(db) {
              if (!db) return;
              try {
                var tx = db.transaction(STORE_NAME, 'readwrite');
                var store = tx.objectStore(STORE_NAME);
                store.put({ id: tileKey, data: dataUrl, timestamp: Date.now() });
              } catch(e) {}
            });
          }

          window.storeOfflineTile = function(key, dataUrl) {
            storeTile(key, dataUrl);
          };

          window.clearOfflineTiles = function() {
            memoryTileCache = {};
            initStorage(function(db) {
              if (!db) return;
              try {
                var tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).clear();
              } catch(e) {}
            });
          };

          var currentLayerName = 'traffic';

          // Helper to fetch and persist tile into IndexedDB as Base64 data URL
          function fetchAndStoreTile(z, x, y, layerName) {
            var activeLyr = layerName || currentLayerName || 'traffic';
            var tileKey = activeLyr + '_' + z + '_' + x + '_' + y;
            if (memoryTileCache[tileKey]) return Promise.resolve(true);
            return new Promise(function(resolve) {
              getStoredTile(tileKey, function(stored) {
                if (stored) {
                  memoryTileCache[tileKey] = stored;
                  resolve(true);
                  return;
                }
                var sub = Math.abs(x + y) % 4;
                var lyrsParam = activeLyr === 'satellite' ? 'lyrs=y' : (activeLyr === 'streets' ? 'lyrs=m' : 'lyrs=m,traffic');
                var url = 'https://mt' + sub + '.google.com/vt/' + lyrsParam + '&x=' + x + '&y=' + y + '&z=' + z;
                fetch(url, { mode: 'cors' })
                  .then(function(res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.blob();
                  })
                  .then(function(blob) {
                    var reader = new FileReader();
                    reader.onloadend = function() {
                      var dataUrl = reader.result;
                      if (dataUrl && typeof dataUrl === 'string' && dataUrl.indexOf('data:image') === 0) {
                        storeTile(tileKey, dataUrl);
                        resolve(true);
                      } else {
                        resolve(false);
                      }
                    };
                    reader.readAsDataURL(blob);
                  })
                  .catch(function() {
                    // Fallback to OpenStreetMap CORS-enabled tile if Google fails
                    var osmUrl = 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
                    fetch(osmUrl, { mode: 'cors' })
                      .then(function(r) { return r.ok ? r.blob() : null; })
                      .then(function(b) {
                        if (!b) { resolve(false); return; }
                        var rdr = new FileReader();
                        rdr.onloadend = function() {
                          var dUrl = rdr.result;
                          if (dUrl && typeof dUrl === 'string' && dUrl.indexOf('data:image') === 0) {
                            storeTile(tileKey, dUrl);
                            resolve(true);
                          } else {
                            resolve(false);
                          }
                        };
                        rdr.readAsDataURL(b);
                      })
                      .catch(function() { resolve(false); });
                  });
              });
            });
          }

          // Offline-Resilient TileLayer with local IndexedDB storage backing
          var OfflineTileLayer = L.TileLayer.extend({
            initialize: function(url, options, layerId) {
              this.layerId = layerId || 'traffic';
              L.TileLayer.prototype.initialize.call(this, url, options);
            },
            createTile: function(coords, done) {
              var tile = document.createElement('img');
              var url = this.getTileUrl(coords);
              var tileKey = this.layerId + '_' + coords.z + '_' + coords.x + '_' + coords.y;
              tile.setAttribute('role', 'presentation');

              var isOffline = (typeof navigator !== 'undefined' && navigator.onLine === false) || isNetworkActive === false;

              // When offline, immediately retrieve stored tile from IndexedDB
              if (isOffline) {
                getStoredTile(tileKey, function(dataUrl) {
                  if (dataUrl) {
                    tile.onload = function() { done(null, tile); };
                    tile.onerror = function() { done(null, tile); };
                    tile.src = dataUrl;
                  } else {
                    // Clean sleek fallback tile so black boxes never appear
                    tile.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23121316"/><path d="M0 0h256v256H0z" fill="none" stroke="%231E2025" stroke-width="1"/></svg>';
                    done(null, tile);
                  }
                });
                return tile;
              }

              // Online: load live tile and opportunistically cache into IndexedDB in background
              var lyrId = this.layerId;
              tile.onload = function() {
                done(null, tile);
                if (!memoryTileCache[tileKey]) {
                  fetchAndStoreTile(coords.z, coords.x, coords.y, lyrId);
                }
              };

              tile.onerror = function() {
                getStoredTile(tileKey, function(stored) {
                  if (stored) {
                    tile.src = stored;
                  } else if (tile.src.indexOf('mt0.google.com') === -1) {
                    tile.src = url.replace(/mt[0-3]\.google\.com/, 'mt0.google.com');
                  } else {
                    tile.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23121316"/><path d="M0 0h256v256H0z" fill="none" stroke="%231E2025" stroke-width="1"/></svg>';
                    done(null, tile);
                  }
                });
              };

              if (memoryTileCache[tileKey]) {
                tile.src = memoryTileCache[tileKey];
              } else {
                tile.src = url;
              }
              return tile;
            }
          });

          // Street-level close zoom (zoom 19) centered directly on the user pin
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            minZoom: 2,
            maxZoom: 21
          }).setView([${userLat}, ${userLng}], 19);

          var trafficLayer = new OfflineTileLayer('https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
            maxZoom: 21,
            subdomains: ['0', '1', '2', '3']
          }, 'traffic');

          var streetsLayer = new OfflineTileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 21,
            subdomains: ['0', '1', '2', '3']
          }, 'streets');

          var satelliteLayer = new OfflineTileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 21,
            subdomains: ['0', '1', '2', '3']
          }, 'satellite');

          trafficLayer.addTo(map);

          window.switchLayer = function(layerName) {
            currentLayerName = layerName || 'traffic';
            map.removeLayer(streetsLayer);
            map.removeLayer(trafficLayer);
            map.removeLayer(satelliteLayer);
            if (layerName === 'streets') {
              streetsLayer.addTo(map);
            } else if (layerName === 'satellite') {
              satelliteLayer.addTo(map);
            } else {
              trafficLayer.addTo(map);
            }
          };

          // Geofence Circle (100m) - Solid continuous perimeter
          var geofenceCircle = L.circle([${gymLat}, ${gymLng}], {
            color: '#CCFF00',
            fillColor: '#CCFF00',
            fillOpacity: 0.18,
            weight: 2.5,
            radius: ${radiusMeters}
          }).addTo(map);

          // GPS Accuracy Confidence Circle
          var accuracyCircle = L.circle([${userLat}, ${userLng}], {
            color: '${pointerColor}',
            fillColor: '${pointerColor}',
            fillOpacity: 0.1,
            weight: 1,
            radius: 15
          }).addTo(map);

          // Gym Marker
          var gymIcon = L.divIcon({
            className: 'gym-marker-icon',
            html: '<div class="gym-pin">🏋️ ${activeGym.gymName}</div>',
            iconSize: [130, 36],
            iconAnchor: [65, 18]
          });
          var gymMarker = L.marker([${gymLat}, ${gymLng}], { icon: gymIcon }).addTo(map);
          gymMarker.bindPopup('<div style="padding:4px;"><b style="color:#CCFF00;font-size:13px;">🏋️ ' + ${JSON.stringify(activeGym.gymName)} + '</b><br/><span style="color:#A1A4AC;font-size:11px;">📍 ' + ${JSON.stringify(activeGym.address || activeGym.city || 'Fitness Center')} + ' ' + ${JSON.stringify(activeGym.pinCode ? '• PIN ' + activeGym.pinCode : '')} + '</span><br/><span style="color:#0075DC;font-size:11px;font-weight:600;">🎯 Geofence Radius: ' + ${radiusMeters} + 'm</span></div>');

          // User Marker with Heading Direction Pointer
          var userIcon = L.divIcon({
            className: 'user-marker-icon',
            html: '<div class="user-beacon-wrapper"><div class="user-pulse"></div><div id="user-heading-cone" class="user-heading-pointer" style="transform: rotate(${initialHeading}deg);"></div><div class="user-dot"></div></div>',
            iconSize: [52, 52],
            iconAnchor: [26, 26]
          });
          var userMarker = L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);
          userMarker.bindPopup('<div style="padding:6px;min-width:145px;"><b style="color:#0075DC;font-size:13px;">📍 You (Live GPS)</b><br/><span style="color:#A1A4AC;font-size:11px;">Coords: <b id="popup-coords" style="color:#CCFF00;">' + Number(${userLat}).toFixed(5) + ', ' + Number(${userLng}).toFixed(5) + '</b></span><br/><span style="color:#A1A4AC;font-size:11px;">Distance: <b id="popup-distance" style="color:#FFF;">' + ${JSON.stringify(routeDist)} + '</b></span><br/><span style="color:#A1A4AC;font-size:11px;">Heading: <b id="popup-heading" style="color:#0075DC;">${initialHeading}°</b></span></div>');

          var routePolyline = null;
          var routeGlow = null;

          // Always maintain street-level close-up view centered on the user pin
          map.setView([${userLat}, ${userLng}], 19);

          setTimeout(function() {
            map.invalidateSize();
          }, 300);

          var isLocationActive = ${hasGpsSignal ? 'true' : 'false'};
          var isNetworkActive = (typeof navigator !== 'undefined' && navigator.onLine !== false);

          function applyMapColorTheme() {
            // Strict dual condition: BOTH location active AND internet active required for color
            var isFullyActive = Boolean(isLocationActive && isNetworkActive);
            var styleEl = document.getElementById('dynamic-bw-style');

            if (isFullyActive) {
              document.body.classList.remove('gps-lost');
              if (styleEl) styleEl.innerHTML = '';
            } else {
              document.body.classList.add('gps-lost');
              if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'dynamic-bw-style';
                document.head.appendChild(styleEl);
              }
              styleEl.innerHTML = '.leaflet-tile-pane, .leaflet-tile { filter: grayscale(100%) contrast(1.08) brightness(0.92) !important; -webkit-filter: grayscale(100%) contrast(1.08) brightness(0.92) !important; } .gym-pin { filter: grayscale(100%) !important; } .leaflet-overlay-pane path.route-main-path { stroke: #FFFFFF !important; stroke-opacity: 1 !important; stroke-width: 6.5px !important; filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) !important; } .leaflet-overlay-pane path.route-glow-path { stroke: #FFFFFF !important; stroke-opacity: 0.5 !important; stroke-width: 10px !important; }';
            }
          }

          window.setConnectionState = function(locActive, netActive) {
            isLocationActive = Boolean(locActive);
            if (typeof netActive === 'boolean') {
              isNetworkActive = netActive;
            }
            applyMapColorTheme();
          };

          window.setGpsSignalState = function(hasGps, isNet) {
            window.setConnectionState(hasGps, isNet);
          };

          // Preload map tiles along the route from start to destination for offline viewing
          function latLngToTileCoords(lat, lng, z) {
            var x = Math.floor((lng + 180) / 360 * Math.pow(2, z));
            var latRad = lat * Math.PI / 180;
            var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
            return { x: x, y: y, z: z };
          }

          function preloadRouteTiles(coords) {
            if (typeof coords === 'string') {
              try { coords = JSON.parse(coords); } catch(e) {}
            }
            if (!coords || !coords.length) {
              coords = [[${userLat}, ${userLng}], [${gymLat}, ${gymLng}]];
            }
            try {
              var zoomLevels = [14, 15, 16, 17, 18, 19];
              var neededTiles = {};

              // 1. Interpolate points along every segment of the route (step ~60m)
              var sampledPoints = [];
              for (var i = 0; i < coords.length; i++) {
                var pt = coords[i];
                var pLat = Array.isArray(pt) ? pt[0] : (pt && (pt.latitude || pt.lat));
                var pLng = Array.isArray(pt) ? pt[1] : (pt && (pt.longitude || pt.lng));
                if (typeof pLat !== 'number' || typeof pLng !== 'number') continue;
                sampledPoints.push([pLat, pLng]);

                if (i < coords.length - 1) {
                  var nextPt = coords[i + 1];
                  var nLat = Array.isArray(nextPt) ? nextPt[0] : (nextPt && (nextPt.latitude || nextPt.lat));
                  var nLng = Array.isArray(nextPt) ? nextPt[1] : (nextPt && (nextPt.longitude || nextPt.lng));
                  if (typeof nLat === 'number' && typeof nLng === 'number') {
                    var dLat = nLat - pLat;
                    var dLng = nLng - pLng;
                    var distApprox = Math.sqrt(dLat * dLat + dLng * dLng);
                    var step = 0.0006; // approx 60 meters
                    var numSteps = Math.floor(distApprox / step);
                    for (var s = 1; s <= numSteps; s++) {
                      var frac = s / (numSteps + 1);
                      sampledPoints.push([pLat + dLat * frac, pLng + dLng * frac]);
                    }
                  }
                }
              }

              // 2. Collect tile keys for all sampled points along the route
              for (var sp = 0; sp < sampledPoints.length; sp++) {
                var sLat = sampledPoints[sp][0];
                var sLng = sampledPoints[sp][1];
                for (var zi = 0; zi < zoomLevels.length; zi++) {
                  var z = zoomLevels[zi];
                  var tc = latLngToTileCoords(sLat, sLng, z);
                  // Add tile and immediate 1-tile neighborhood for panning buffer
                  for (var dx = -1; dx <= 1; dx++) {
                    for (var dy = -1; dy <= 1; dy++) {
                      var key = z + '_' + (tc.x + dx) + '_' + (tc.y + dy);
                      neededTiles[key] = { x: tc.x + dx, y: tc.y + dy, z: z };
                    }
                  }
                }
              }

              var tileKeys = Object.keys(neededTiles);
              var totalKeys = tileKeys.slice(0, 300);
              var completed = 0;
              var batchSize = 6;
              var idx = 0;

              function runNextBatch() {
                if (idx >= totalKeys.length) {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'TILES_PRELOADED',
                      count: completed
                    }));
                  }
                  return;
                }
                var batch = totalKeys.slice(idx, idx + batchSize);
                idx += batchSize;
                var promises = batch.map(function(k) {
                  var t = neededTiles[k];
                  return fetchAndStoreTile(t.z, t.x, t.y, currentLayerName).then(function(ok) {
                    if (ok) completed++;
                  });
                });
                Promise.all(promises).then(function() {
                  setTimeout(runNextBatch, 10);
                });
              }

              runNextBatch();
            } catch(e) {}
          }

          window.preloadRouteTiles = preloadRouteTiles;

          window.reloadMapTiles = function() {
            try {
              if (map && map.invalidateSize) {
                map.invalidateSize({ pan: false });
              }
              // CRITICAL: NEVER redraw tiles if offline, because redrawing purges all loaded DOM tiles!
              var isBrowserOnline = (typeof navigator !== 'undefined' && navigator.onLine !== false && isNetworkActive !== false);
              if (isBrowserOnline) {
                var active = (streetsLayer && map.hasLayer(streetsLayer) && streetsLayer) ||
                             (satelliteLayer && map.hasLayer(satelliteLayer) && satelliteLayer) ||
                             trafficLayer;
                if (active && active.redraw) {
                  active.redraw();
                }
              }
              applyMapColorTheme();
            } catch(e) {}
          };

          window.addEventListener('online', function() {
            isNetworkActive = true;
            applyMapColorTheme();
            if (window.reloadMapTiles) window.reloadMapTiles();
            if (window.centerOnUser) window.centerOnUser();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'INTERNET_RESTORED' }));
            }
          });

          window.addEventListener('offline', function() {
            isNetworkActive = false;
            applyMapColorTheme();
          });

          window.updatePositions = function(uLat, uLng, gLat, gLng, radius, inside, distStr, headDeg) {
            if (userMarker) {
              userMarker.setLatLng([uLat, uLng]);
              var popupCoords = document.getElementById('popup-coords');
              if (popupCoords) {
                popupCoords.innerText = Number(uLat).toFixed(5) + ', ' + Number(uLng).toFixed(5);
              }
              var popupDist = document.getElementById('popup-distance');
              if (popupDist && distStr) {
                popupDist.innerText = distStr;
              }
              var popupHead = document.getElementById('popup-heading');
              if (popupHead) {
                popupHead.innerText = Math.round(headDeg || 0) + '°';
              }
            }
            var cone = document.getElementById('user-heading-cone');
            if (cone && typeof headDeg === 'number') {
              cone.style.transform = 'rotate(' + Math.round(headDeg) + 'deg)';
            }
            if (accuracyCircle) {
              accuracyCircle.setLatLng([uLat, uLng]);
            }
            if (routePolyline && routePolyline.getLatLngs) {
              try {
                var currentPath = routePolyline.getLatLngs();
                if (currentPath && currentPath.length > 0) {
                  currentPath[0] = L.latLng(uLat, uLng);
                  routePolyline.setLatLngs(currentPath);
                  if (routeGlow) routeGlow.setLatLngs(currentPath);
                }
              } catch(e) {}
            }
            if (geofenceCircle) {
              geofenceCircle.setLatLng([gLat, gLng]);
              geofenceCircle.setRadius(radius);
              geofenceCircle.setStyle({
                color: inside ? '#CCFF00' : '#FF4444',
                fillColor: inside ? '#CCFF00' : '#FF4444',
                fillOpacity: inside ? 0.25 : 0.12
              });
            }
          };

          window.centerOnCoords = function(lat, lng) {
            if (map.getZoom() < 18) {
              map.setView([lat, lng], 19, { animate: true });
            } else {
              map.panTo([lat, lng], { animate: true, duration: 0.8 });
            }
          };

          window.centerOnUser = function() {
            if (userMarker) map.setView(userMarker.getLatLng(), 19, { animate: true });
          };

          window.centerOnGym = function() {
            if (gymMarker) map.panTo(gymMarker.getLatLng(), { animate: true });
          };

          window.fitBoth = function() {
            var bounds = new L.featureGroup([gymMarker, userMarker]).getBounds();
            map.fitBounds(bounds.pad(0.25), { animate: true });
          };

          window.zoomInMap = function() {
            if (map) map.zoomIn(1);
          };

          window.zoomOutMap = function() {
            if (map) map.zoomOut(1);
          };

          window.displayNavigationRoute = function(coords, distStr, durStr, autoFit) {
            if (typeof coords === 'string') coords = JSON.parse(coords);
            if (!coords || coords.length === 0) return;

            if (routePolyline) map.removeLayer(routePolyline);
            if (routeGlow) map.removeLayer(routeGlow);

            routeGlow = L.polyline(coords, {
              className: 'route-glow-path',
              color: '${pointerColor}',
              weight: 8,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);

            routePolyline = L.polyline(coords, {
              className: 'route-main-path',
              color: '${pointerColor}',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);

            // Preload and store route tiles in device storage
            preloadRouteTiles(coords);

            if (autoFit === true) {
              map.fitBounds(routePolyline.getBounds().pad(0.2), { animate: true });
            }
          };

          window.clearNavigationRoute = function() {
            if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
            if (routeGlow) { map.removeLayer(routeGlow); routeGlow = null; }
          };

          // Render initial route and pre-cache route tiles
          var initCoords = ${JSON.stringify(routeCoords)};
          if (initCoords && initCoords.length > 0) {
            displayNavigationRoute(initCoords, ${JSON.stringify(routeDist)}, ${JSON.stringify(routeDur)}, false);
            preloadRouteTiles(initCoords);
          } else {
            preloadRouteTiles([[${userLat}, ${userLng}], [${gymLat}, ${gymLng}]]);
          }

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          }
        </script>
      </body>
    </html>
  `;
}
