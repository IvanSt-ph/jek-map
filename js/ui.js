// ===============================
// 🌍 Глобальные переменные
// ===============================
window.currentAddress = null; // выбранный дом (объект из STREETS)
window.photosDB = {};        // { [houseId]: [url1, url2, ...] }


// ===============================
// 🔄 Хелпер: ждём, пока загрузится Cloudinary
// ===============================
function onCloudinaryReady(cb) {
  if (window.cloudinary && cloudinary.createUploadWidget) {
    cb();
    return;
  }

  const int = setInterval(() => {
    if (window.cloudinary && cloudinary.createUploadWidget) {
      clearInterval(int);
      cb();
    }
  }, 300);
}


// ===============================
// 📡 Работа с GitHub через Netlify
// ===============================

// Загрузка photos.json из GitHub через Netlify-функцию
async function loadPhotosFromServer() {
  try {
    const res = await fetch("/.netlify/functions/getPhotos");

    if (!res.ok) {
      console.error("getPhotos HTTP error", res.status);
      window.photosDB = {};
      return;
    }

    const data = await res.json();
    window.photosDB = data || {};
  } catch (e) {
    console.error("getPhotos error:", e);
    window.photosDB = {};
  }
}

// Сохранение одного фото для конкретного дома
async function savePhotoToServer(houseId, url) {
  try {
    const res = await fetch("/.netlify/functions/savePhoto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseId, url })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("savePhoto error:", text);
    }
  } catch (e) {
    console.error("savePhoto network error:", e);
  }

  // После записи в GitHub — перечитать json и обновить галерею
  await loadPhotosFromServer();
  renderHousePhotos(String(houseId));
}

// Рендер фото по houseId (addr.id)
function renderHousePhotos(houseId) {
  const container = document.getElementById("house-photos");
  if (!container) return;

  const photos = (window.photosDB && window.photosDB[houseId]) || [];

  if (!photos.length) {
    container.innerHTML = `<p class="muted">Фото пока нет.</p>`;
    return;
  }

  container.innerHTML = photos
    .map(url => `<img src="${url}" class="house-photo">`)
    .join("");
}



// =====================================================
// 🧭 ОСНОВНОЙ UI: списки, карта, мобильные панели
// =====================================================
(function () {
  const streets = window.STREETS || [];

  const streetSelect   = document.getElementById("street-select");
  const listEl         = document.getElementById("address-list");
  const searchEl       = document.getElementById("search");
  const countAllEl     = document.getElementById("count-all");
  const countVisibleEl = document.getElementById("count-visible");
  const resetBtn       = document.getElementById("reset-btn");

  const themeBtn  = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");

  const houseInfoBody     = document.getElementById("house-info-body");
  const mobileHouseInfoEl = document.getElementById("mobile-house-info");

  // Мобилка: нижний бар
  const mbStreets = document.getElementById("mb-streets");
  const mbSearch  = document.getElementById("mb-search");
  const mbInfo    = document.getElementById("mb-info");
  const mbTheme   = document.getElementById("mb-theme");

  // Мобильные панели
  const panelStreets = document.getElementById("panel-streets");
  const panelSearch  = document.getElementById("panel-search");
  const panelInfo    = document.getElementById("panel-info");

  const mobileStreetList   = document.getElementById("mobile-street-list");
  const mobileSearchInput  = document.getElementById("mobile-search-input");
  const mobileSearchResult = document.getElementById("mobile-search-results");

  let currentStreet    = null;
  let currentAddresses = [];

  // Состояние панели "Улицы" (мобилка)
  let mobileStreetLevel   = "streets";
  let mobileStreetCurrent = null;

  // Плоский список для мобильного поиска
  const allAddresses = [];
  streets.forEach(st => {
    st.addresses.forEach(a => {
      allAddresses.push({ addr: a, street: st });
    });
  });


  /********************** ТЕМА **************************/
  let darkMode = document.body.classList.contains("dark");

  function setTheme(dark) {
    darkMode = dark;
    document.body.classList.toggle("dark", dark);
    if (themeIcon) {
      themeIcon.textContent = dark ? "☀️" : "🌙";
    }
  }

  if (themeBtn)  themeBtn.addEventListener("click", () => setTheme(!darkMode));
  if (mbTheme)   mbTheme.addEventListener("click", () => setTheme(!darkMode));


  /********************** ВСПОМОГАТЕЛЬНЫЕ ****************/

  function findStreetByAddress(addr) {
    return streets.find(st => st.addresses.some(a => a.id == addr.id));
  }

  function getHouseInfo(addr) {
    const st = findStreetByAddress(addr);
    const streetId = st?.id || "";

    const jekMap = {
      "1maya": {
        jekName: "ЖЭК №1",
        phone: "0 533 3-11-11",
        manager: "Иванов И.И.",
        category: "Жилой район"
      },
      "25oct": {
        jekName: "ЖЭК №2",
        phone: "0 533 3-22-22",
        manager: "Петров П.П.",
        category: "Центр города"
      }
    };

    const jek = jekMap[streetId] || {
      jekName: "ЖЭК",
      phone: "0 533 3-00-00",
      manager: "Дежурный мастер",
      category: "Район"
    };

    return {
      title: addr.name,
      street: st?.name || "",
      category: jek.category,
      jekName: jek.jekName,
      jekPhone: jek.phone,
      manager: jek.manager
    };
  }

  function renderInfoPanels(addr) {
    if (!addr) {
      houseInfoBody.innerHTML = `<p class="muted">Выберите дом в списке или на карте.</p>`;
      mobileHouseInfoEl.innerHTML = `<p class="muted">Дом не выбран.</p>`;
      return;
    }

    const info = getHouseInfo(addr);

    const html = `
      <div class="info-row"><div class="info-label">Адрес</div><div class="info-value">${info.title}</div></div>
      <div class="info-row"><div class="info-label">Улица</div><div class="info-value">${info.street}</div></div>
      <div class="info-row"><div class="info-label">Район</div><div class="info-value">${info.category}</div></div>
      <div class="info-row"><div class="info-label">ЖЭК</div><div class="info-value">${info.jekName}</div></div>
      <div class="info-row"><div class="info-label">Телефон ЖЭК</div><div class="info-value">${info.jekPhone}</div></div>
      <div class="info-row"><div class="info-label">Управляющий</div><div class="info-value">${info.manager}</div></div>
    `;

    houseInfoBody.innerHTML = html;
    mobileHouseInfoEl.innerHTML = html;
  }

  function activateItem(id) {
    if (!listEl) return;
    listEl.querySelectorAll("li").forEach(li => li.classList.remove("active"));
    const li = listEl.querySelector(`li[data-id="${id}"]`);
    if (li) li.classList.add("active");
  }


  // -----------------------------
  // ✅ Выбор адреса (общий)
  // -----------------------------
  function selectAddress(addr) {
    window.currentAddress = addr;   // глобально — нужно для загрузки фото

    activateItem(addr.id);

    if (typeof window.highlightBuilding === "function") {
      window.highlightBuilding(addr);
    }

    renderInfoPanels(addr);
    renderHousePhotos(String(addr.id)); // фото по ключу addr.id
  }



  /******************* УЛИЦЫ / АДРЕСА (ДЕСКТОП) ********************/

  function fillStreetSelect() {
    streetSelect.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "Все улицы";
    streetSelect.appendChild(allOpt);

    streets.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st.id;
      opt.textContent = st.name;
      streetSelect.appendChild(opt);
    });

    streetSelect.value = "all";
    currentStreet = null;
    currentAddresses = streets.flatMap(s => s.addresses);

    countAllEl.textContent = String(currentAddresses.length);
  }

  function getFiltered() {
    const q = (searchEl.value || "").trim().toLowerCase();
    if (!q) return currentAddresses;
    return currentAddresses.filter(a => a.name.toLowerCase().includes(q));
  }

  function renderList() {
    const data = getFiltered();
    listEl.innerHTML = "";

    if (!data.length) {
      listEl.innerHTML = `<li><span class="muted">Ничего не найдено</span></li>`;
      countVisibleEl.textContent = "0";
      return;
    }

    data.forEach(a => {
      const li = document.createElement("li");
      li.dataset.id = a.id;

      const streetObj = findStreetByAddress(a);
      const streetTitle = streetObj ? streetObj.name : "Без улицы";

      li.innerHTML = `
        <div class="addr-main">${a.name}</div>
        <div class="addr-sub">Тирасполь · ${streetTitle}</div>
      `;

      li.addEventListener("click", () => {
        selectAddress(a);
        li.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });

      listEl.appendChild(li);
    });

    countVisibleEl.textContent = String(data.length);
  }


  /******************* СМЕНА УЛИЦЫ ********************/
  streetSelect.addEventListener("change", () => {
    const val = streetSelect.value;

    if (val === "all") {
      currentStreet = null;
      currentAddresses = streets.flatMap(s => s.addresses);
    } else {
      currentStreet = streets.find(s => s.id === val) || null;
      currentAddresses = currentStreet?.addresses || [];
    }

    countAllEl.textContent = String(currentAddresses.length);
    searchEl.value = "";

    renderList();
    renderInfoPanels(null);
    window.currentAddress = null;
    renderHousePhotos("__none__"); // очистка галереи (ничего не найдётся)

    if (window.clearHighlight) window.clearHighlight();
  });


  /******************* ОБРАБОТЧИКИ ********************/
  searchEl.addEventListener("input", renderList);

  resetBtn.addEventListener("click", () => {
    streetSelect.value = "all";
    streetSelect.dispatchEvent(new Event("change"));
    searchEl.value = "";
    renderList();
    renderInfoPanels(null);
    window.currentAddress = null;
    renderHousePhotos("__none__");
  });


  /******************* МОБИЛЬНЫЕ ПАНЕЛИ ********************/
  function closePanels() {
    document.querySelectorAll(".mobile-panel").forEach(p => p.classList.remove("open"));
    document.querySelectorAll(".mobile-bar button").forEach(b => b.classList.remove("active"));
  }

  function openPanel(panel, btn) {
    closePanels();
    if (panel) panel.classList.add("open");
    if (btn)   btn.classList.add("active");
  }

  function renderMobileStreetRoot() {
    mobileStreetLevel = "streets";
    mobileStreetList.innerHTML = "";

    streets.forEach(st => {
      const div = document.createElement("div");
      div.textContent = st.name;
      div.addEventListener("click", () => renderMobileHouseList(st));
      mobileStreetList.appendChild(div);
    });

    panelStreets.querySelector("span:last-child").textContent = "Улицы";
  }

  function renderMobileHouseList(street) {
    mobileStreetLevel = "houses";
    mobileStreetCurrent = street;
    mobileStreetList.innerHTML = "";

    street.addresses.forEach(addr => {
      const div = document.createElement("div");
      div.textContent = addr.name;

      div.addEventListener("click", () => {
        window.currentAddress = addr;
        streetSelect.value = street.id;
        streetSelect.dispatchEvent(new Event("change"));
        selectAddress(addr);
        closePanels();
      });

      mobileStreetList.appendChild(div);
    });

    panelStreets.querySelector("span:last-child").textContent = street.name;
  }

  document.querySelectorAll(".panel-back").forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = btn.closest(".mobile-panel");
      if (panel.id === "panel-streets" && mobileStreetLevel === "houses") {
        renderMobileStreetRoot();
      } else {
        closePanels();
      }
    });
  });

  mbStreets.addEventListener("click", () => {
    renderMobileStreetRoot();
    openPanel(panelStreets, mbStreets);
  });

  mbSearch.addEventListener("click", () => openPanel(panelSearch, mbSearch));
  mbInfo.addEventListener("click", () => openPanel(panelInfo, mbInfo));


  mobileSearchInput.addEventListener("input", () => {
    const q = mobileSearchInput.value.trim().toLowerCase();
    mobileSearchResult.innerHTML = "";

    if (!q) return;

    const matches = allAddresses.filter(x => x.addr.name.toLowerCase().includes(q));

    matches.forEach(({ addr, street }) => {
      const div = document.createElement("div");
      div.textContent = `${addr.name} · ${street.name}`;

      div.addEventListener("click", () => {
        streetSelect.value = street.id;
        streetSelect.dispatchEvent(new Event("change"));
        selectAddress(addr);
      });

      mobileSearchResult.appendChild(div);
    });
  });



  // --------------------------
  // ИНИЦИАЛИЗАЦИЯ
  // --------------------------
  fillStreetSelect();
  renderList();
  renderInfoPanels(null);
  renderMobileStreetRoot();

  setTheme(true);
})();


// ===========================================
// 📤 Cloudinary upload → GitHub JSON
// ===========================================
onCloudinaryReady(() => {
  const btn = document.getElementById("upload-photo-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!window.currentAddress) {
      alert("Сначала выберите дом!");
      return;
    }

    const widget = cloudinary.createUploadWidget(
      {
        cloudName: "dwstbb1fm",
        uploadPreset: "houses_unsigned",
        sources: ["local", "camera"],
        maxImageFileSize: 10 * 1024 * 1024
      },
      async (err, res) => {
        if (!err && res && res.event === "success") {
          const url = res.info.secure_url;
          const houseId = String(window.currentAddress.id);
          await savePhotoToServer(houseId, url);
        }
      }
    );

    widget.open();
  });
});


// ===========================================
// ⬇️ При старте: подтянуть photos.json
// ===========================================
loadPhotosFromServer().catch(console.error);
