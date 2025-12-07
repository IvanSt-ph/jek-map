// js/map.js

(function () {
  const MAP_DEFAULT = {
    lat: 46.8340,
    lng: 29.6185,
    zoom: 15
  };

  // Карта
  const map = L.map("map", {
    zoomControl: true,
    attributionControl: false
  }).setView([MAP_DEFAULT.lat, MAP_DEFAULT.lng], MAP_DEFAULT.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // Прыгающий divIcon
  const bouncingIcon = L.divIcon({
    className: "",
    html: '<div class="marker-bounce"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });

  let activeMarker  = null;
  let activePolygon = null;

  function clearHighlight() {
    if (activeMarker) {
      map.removeLayer(activeMarker);
      activeMarker = null;
    }
    if (activePolygon) {
      map.removeLayer(activePolygon);
      activePolygon = null;
    }
  }

  function showMarker(addr) {
    if (!addr) {
      if (activeMarker) {
        map.removeLayer(activeMarker);
        activeMarker = null;
      }
      return;
    }

    if (activeMarker) {
      map.removeLayer(activeMarker);
    }

    activeMarker = L.marker([addr.lat, addr.lng], { icon: bouncingIcon }).addTo(map);
    activeMarker.bindPopup(addr.name);
    activeMarker.openPopup();
  }

  async function highlightBuilding(addr) {
    clearHighlight();
    if (!addr) return;

    // Маркер
    showMarker(addr);

    // Полигон здания
    if (typeof window.getBuildingPolygon !== "function") {
      console.warn("getBuildingPolygon не определена");
      map.setView([addr.lat, addr.lng], 18, { animate: true });
      return;
    }

    const polyPoints = window.getBuildingPolygon(addr);

    if (!polyPoints) {
      // Нет полигона — просто фокус на точку
      map.setView([addr.lat, addr.lng], 18, { animate: true });
      return;
    }

    activePolygon = L.polygon(polyPoints, {
      className: "building-highlight"
    }).addTo(map);

    // Умное приближение по контуру
    const bounds = activePolygon.getBounds();
    map.fitBounds(bounds, {
      maxZoom: 19,
      padding: [40, 40]
    });
  }

  // Делаем доступным для других скриптов
  window.APP_MAP = map;
  window.APP_DEFAULT_VIEW = MAP_DEFAULT;
  window.highlightBuilding = highlightBuilding;
  window.clearHighlight = clearHighlight;
})();
