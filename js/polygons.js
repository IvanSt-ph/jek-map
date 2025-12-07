// js\polygons.js
async function loadPolygons() {
  const res = await fetch("buildings.json");
  window.BUILDINGS = await res.json();

  // Привязка
  STREETS.forEach(st => {
    st.addresses.forEach(addr => {
      const key = `${st.id}_${addr.id}`.toLowerCase();
      addr.polygon = window.BUILDINGS[key] || null;

      // Центр полигона → если lat/lng пустые
      if (addr.polygon && (!addr.lat || !addr.lng)) {
        let sumLat = 0, sumLng = 0;
        addr.polygon.forEach(p => {
          sumLat += p[0];
          sumLng += p[1];
        });
        addr.lat = sumLat / addr.polygon.length;
        addr.lng = sumLng / addr.polygon.length;
      }
    });
  });

  console.log("Полигоны привязаны:", STREETS);
}

window.loadPolygons = loadPolygons;
