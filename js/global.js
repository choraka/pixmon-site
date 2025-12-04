// 전역 Item Map
window.itemMap = new Map();

// 중복 로드 방지
window.__itemsLoaded = false;

// items.json 로드 함수
window.loadItems = async function () {
  try {
    // 이미 로드했다면 재실행 방지
    if (window.__itemsLoaded) return;
    window.__itemsLoaded = true;

    const res = await fetch("../../data/item.json");
    const items = await res.json();

    items.forEach(item => itemMap.set(item.id, item));

    console.log("item.json 전역 로드 완료");
  } catch (err) {
    console.error("item.json 로드 실패:", err);
  }
};

// 아이템이 필요한 JS들이 호출하는 보조 함수
window.ensureItemsLoaded = async function () {
  if (!window.__itemsLoaded) {
    await loadItems();
  }
};

// ===== 아이템 모달 =====
window.openItemModal = function (itemId) {
  const item = itemMap.get(itemId);
  if (!item) {
    console.warn("아이템을 찾을 수 없음:", itemId);
    return;
  }

  const modal = document.querySelector("#item-modal");
  if (!modal) {
    console.error("#item-modal 요소 없음");
    return;
  }

  // 이미지
  const img = document.querySelector("#item-modal-img");
  if (img) img.src = `../../images/${item.image}`;

  // 이름
  const name = document.querySelector("#item-modal-name");
  if (name) name.textContent = item.name;

  // 설명
  const desc = document.querySelector("#item-modal-desc");
  if (desc) desc.textContent = item.description;

  // 획득 방법
  const obtainBox = document.querySelector("#item-modal-obtain");
  if (obtainBox) {
    obtainBox.innerHTML = "";
    (item.obtain || []).forEach(o => {
      const li = document.createElement("li");
      li.textContent = o;
      obtainBox.appendChild(li);
    });
  }
  
  // 스탯
  const statsBox = document.querySelector("#item-modal-stats");
  if (statsBox) {
    statsBox.innerHTML = "";
    for (const [k, v] of Object.entries(item.stats || {})) {
      const div = document.createElement("div");
      div.textContent = `${k}: ${v}`;
      statsBox.appendChild(div);
    }
  }

  // 모달 열기
  modal.classList.add("open");

  // 닫기 버튼
  const closeBtn = document.querySelector("#item-close");
  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.remove("open");
  }

  // 배경 클릭시 닫기
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove("open");
  };
};

window.MonsterGlobalMap = new Map();

async function loadAllMonsters() {
  const res = await fetch("/data/all_monsters.json");
  const all = await res.json();
  all.forEach(m => MonsterGlobalMap.set(m.name, m));
}
