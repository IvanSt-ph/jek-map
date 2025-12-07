// js/osm.js

window.BUILDINGS = {};

async function loadLocalPolygons() {
  try {
    const res = await fetch("buildings.json");
    window.BUILDINGS = await res.json();
    console.log("Полигоны успешно загружены", window.BUILDINGS);
  } catch (err) {
    console.error("Ошибка загрузки buildings.json:", err);
  }
}

function getBuildingPolygon(addr) {
  if (!addr) return null;

  const key = `${addr.street_id || addr.street}_${addr.id}`
    .toString()
    .replace(" ", "")
    .replace("ул.", "")
    .replace(".", "")
    .toLowerCase();

  return window.BUILDINGS[key] || null;
}

// Делаем доступным
window.loadLocalPolygons = loadLocalPolygons;
window.getBuildingPolygon = getBuildingPolygon;
