document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.querySelector("#search");
  const filterBtn = document.querySelector("#filter-btn");
  const filterPopup = document.querySelector("#filter-popup");
  const applyBtn = document.querySelector("#apply-filters");
  const clearBtn = document.querySelector("#clear-filters");

  const filterGrade = document.querySelector("#filter-grade");
  const filterSource = document.querySelector("#filter-source");
  const filterTypeGroup = document.querySelector("#filter-type-group");
  const filterMapGroup = document.querySelector("#filter-map-group");
  const filterType = document.querySelector("#filter-type");
  const filterMap = document.querySelector("#filter-map");
  const filterEvo = document.querySelector("#filter-evoitem");

  const list = document.querySelector("#item-list");

  let items = [];
  const itemMap = new Map();

  try {
    const res = await fetch("/data/item.json");
    if (!res.ok) throw new Error("items.json 로드 실패");
    items = await res.json();
    items.forEach(i => itemMap.set(i.id, i));
    console.log("items.json 로드 완료");
  } catch (err) {
    console.error(err);
  }

  filterBtn.addEventListener("click", () => {
    filterPopup.classList.toggle("hidden");
  });

  applyBtn.addEventListener("click", () => {
    filterPopup.classList.add("hidden");
    renderItems();
  });

  clearBtn.addEventListener("click", () => {
    document.querySelectorAll("#filter-popup input, #filter-popup select").forEach(el => {
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else el.value = "";
    });
    filterTypeGroup.classList.add("hidden");
    filterMapGroup.classList.add("hidden");
    renderItems();
  });

  filterSource.addEventListener("change", () => {
    const src = filterSource.value;
    if (src === "던전" || src === "파티") {
      filterTypeGroup.classList.remove("hidden");
      filterMapGroup.classList.remove("hidden");
    } else {
      filterTypeGroup.classList.add("hidden");
      filterMapGroup.classList.add("hidden");
      filterType.value = "";
      filterMap.value = "";
    }
    renderItems();
  });

  searchInput.addEventListener("input", renderItems);
  filterGrade.addEventListener("change", renderItems);
  filterType.addEventListener("change", renderItems);
  filterMap.addEventListener("change", renderItems);
  filterEvo.addEventListener("change", renderItems);

  function updateFilterButtonState() {
    const hasFilter =
      searchInput.value.trim() !== "" ||
      filterGrade.value !== "" ||
      filterSource.value !== "" ||
      filterEvo.value !== "" ||
      filterType.value !== "" ||
      filterMap.value !== "";

    if (hasFilter) filterBtn.classList.add("active");
    else filterBtn.classList.remove("active");
  }

  function renderItems() {
    const query = searchInput.value.toLowerCase();
    const grade = filterGrade.value;
    const source = filterSource.value;
    const evo = filterEvo.value;
    const type = filterType.value;
    const map = filterMap.value;

    const filtered = items.filter(item => {

      const matchDropInfo = (item.dropInfo || []).some(info => {
        const okSource = !source || info.source === source;
        const okMap = !map || info.map === map;
        const okType = !type || info.dropType === type;
        return okSource && okMap && okType;
      });


      const matchName = item.name.toLowerCase().includes(query);
      const matchGrade = !grade || item.grade === grade;
      const matchEvo = !evo || item.isEvolutionItem === evo;

      return matchDropInfo && matchName && matchGrade && matchEvo;
    });

    list.innerHTML = "";

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty">
          <p>검색된 아이템이 없습니다.</p>
        </div>
      `;
      updateFilterButtonState();
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <img src="../images/${item.image}" alt="${item.name}">
        <h4>${item.name}</h4>
        <p class="grade ${item.grade}">${item.grade}</p>
        ${item.isEvolutionItem === "O" ? `<span class="tag evo">진화템</span>` : ""}
      `;
      card.addEventListener("click", () => openItemModal(item.id));
      list.appendChild(card);
    });

    updateFilterButtonState();
  }

  renderItems();

  const modal = document.querySelector("#item-modal");
  const closeModalBtn = document.querySelector("#close-item-modal");

  function openItemModal(id) {
    const item = itemMap.get(id);
    if (!item) {
      console.error("아이템을 찾을 수 없습니다:", id);
      return;
    }

    const name = document.querySelector("#modal-name");
    const img = document.querySelector("#modal-img");
    const grade = document.querySelector("#modal-grade");
    const desc = document.querySelector("#modal-desc");
    const obtain = document.querySelector("#modal-obtain");
    const statsBox = document.querySelector("#modal-stats");

    if (!name || !img || !grade || !desc || !obtain || !statsBox) {
      console.error("item-modal 내부 요소를 찾을 수 없습니다.");
      return;
    }

    name.textContent = item.name;
    img.src = "/images/" + item.image;
    grade.textContent = item.grade || "-";
    desc.textContent = item.description;

    obtain.innerHTML = "";
    (item.obtain || []).forEach(o => {
      const li = document.createElement("li");
      li.textContent = o;
      obtain.appendChild(li);
    });

    statsBox.innerHTML = "";
    for (let key in item.stats) {
      const div = document.createElement("div");
      div.className = "stat";
      div.innerHTML = `<div class="k">${key}</div><div class="v">${item.stats[key]}</div>`;
      statsBox.appendChild(div);
    }

    modal.classList.add("open");
  }

  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("open");
  });

  modal.addEventListener("click", e => {
    if (e.target === modal) modal.classList.remove("open");
  });
});
