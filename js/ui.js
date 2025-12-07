// ===============================================
// Глобальная переменная выбранного дома
// ===============================================
window.currentAddress = null;

// Фото
window.housePhotos = {};


// ===============================================
// Загрузка всех фото из GitHub через Netlify
// ===============================================
async function loadAllPhotos() {
  try {
    const res = await fetch("/.netlify/functions/getPhotos");
    const json = await res.json();
    window.housePhotos = json || {};
  } catch (e) {
    console.error("Ошибка загрузки фото:", e);
  }
}


// ===============================================
// Сохранить 1 фото (URL) в GitHub
// ===============================================
async function savePhotoToServer(houseId, url) {
  try {
    await fetch("/.netlify/functions/savePhoto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseId, url })
    });
  } catch (e) {
    console.error("Ошибка сохранения фото:", e);
  }
}


// ===============================================
// Рендер галереи
// ===============================================
function renderHousePhotos(houseId) {
  const container = document.getElementById("house-photos");
  if (!container) return;

  const arr = window.housePhotos[houseId] || [];

  container.innerHTML = arr
    .map(url => `<img src="${url}" class="photo-thumb">`)
    .join("");
}


// ===============================================
// Cloudinary Upload Widget
// ===============================================
function onCloudinaryReady(cb) {
  if (window.cloudinary && cloudinary.createUploadWidget) return cb();
  const int = setInterval(() => {
    if (window.cloudinary && cloudinary.createUploadWidget) {
      clearInterval(int);
      cb();
    }
  }, 300);
}

onCloudinaryReady(() => {
  const btn = document.getElementById("upload-photo-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!window.currentAddress) {
      alert("Сначала выбери дом!");
      return;
    }

    const widget = cloudinary.createUploadWidget(
      {
        cloudName: "dwstbb1fm",
        uploadPreset: "houses_unsigned",
        folder: `houses/${window.currentAddress.id}`,
        maxImageFileSize: 10 * 1024 * 1024
      },
      async (err, res) => {
        if (!err && res && res.event === "success") {
          const url = res.info.secure_url;

          // отправляем на сервер
          await savePhotoToServer(window.currentAddress.id, url);

          // обновляем локальный кеш
          if (!window.housePhotos[window.currentAddress.id]) {
            window.housePhotos[window.currentAddress.id] = [];
          }
          window.housePhotos[window.currentAddress.id].push(url);

          renderHousePhotos(window.currentAddress.id);
        }
      }
    );

    widget.open();
  });
});


// =====================================================================
// Основной UI (твоя логика — я НЕ меняю, только вставил фото)
// =====================================================================
(function () {

  const streets = window.STREETS || [];

  const streetSelect = document.getElementById("street-select");
  const listEl       = document.getElementById("address-list");
  const searchEl     = document.getElementById("search");
  const countAllEl   = document.getElementById("count-all");
  const countVisEl   = document.getElementById("count-visible");

  const houseInfoBody = document.getElementById("house-info-body");
  const mobileHouseInfoEl = document.getElementById("mobile-house-info");


  function findStreetByAddress(addr) {
    return streets.find(st => st.addresses.some(a => a.id == addr.id));
  }

  function getHouseInfo(addr) {
    const st = findStreetByAddress(addr);
    return {
      title: addr.name,
      street: st?.name || ""
    };
  }

  function renderInfoPanels(addr) {
    if (!addr) {
      houseInfoBody.innerHTML = `<p class="muted">Выберите дом.</p>`;
      mobileHouseInfoEl.innerHTML = `<p class="muted">Дом не выбран.</p>`;
      return;
    }

    const info = getHouseInfo(addr);

    const html = `
      <div class="info-row"><b>Адрес:</b> ${info.title}</div>
      <div class="info-row"><b>Улица:</b> ${info.street}</div>
    `;

    houseInfoBody.innerHTML = html;
    mobileHouseInfoEl.innerHTML = html;
  }

  function activateItem(id) {
    listEl.querySelectorAll("li").forEach(li => li.classList.remove("active"));
    const li = listEl.querySelector(`[data-id="${id}"]`);
    if (li) li.classList.add("active");
  }

  function selectAddress(addr) {
    window.currentAddress = addr;
    activateItem(addr.id);

    if (window.highlightBuilding) {
      window.highlightBuilding(addr);
    }

    renderInfoPanels(addr);
    renderHousePhotos(addr.id);
  }


  // === Строим список улиц ===
  function fillStreetSelect() {
    streetSelect.innerHTML = "";

    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "Все улицы";
    streetSelect.appendChild(all);

    streets.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st.id;
      opt.textContent = st.name;
      streetSelect.appendChild(opt);
    });

    streetSelect.value = "all";
  }

  function renderList() {
    const data = streets.flatMap(s => s.addresses);

    listEl.innerHTML = "";
    countAllEl.textContent = data.length;
    countVisEl.textContent = data.length;

    data.forEach(a => {
      const li = document.createElement("li");
      li.dataset.id = a.id;
      li.innerHTML = `${a.name}`;
      li.addEventListener("click", () => selectAddress(a));
      listEl.appendChild(li);
    });
  }


  // =======================
  // ИНИЦИАЛИЗАЦИЯ ВСЕГО UI
  // =======================
  fillStreetSelect();
  renderList();
  renderInfoPanels(null);

  // Загружаем фото
  loadAllPhotos();

})();
