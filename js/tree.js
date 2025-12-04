let AllMonsters = new Map();
let allLoaded = false;

async function loadAllMonsters() {
  if (allLoaded) return;

  const res = await fetch("../../data/all_monsters.json");
  const list = await res.json();
  list.forEach(mon => AllMonsters.set(mon.name, mon));

  allLoaded = true;
}

let itemMap = new Map();

async function loadItemJson() {
  const res = await fetch("../../data/items.json");
  const items = await res.json();
  items.forEach(i => itemMap.set(i.id, i));
}

function renderMonsterTree(LINE_NAME, MONS) {
  const by = (sel, root = document) => root.querySelector(sel);
  const byName = new Map(MONS.map(m => [m.name, m]));
  const childrenOf = new Map(MONS.map(m => [m.name, m.next || []]));
  const roots = MONS.filter(m => !m.previous || m.previous.length === 0).map(m => m.name);

  window.byNameGlobal = byName;

  const NODE_W = 120, NODE_H = 120;
  const X_GAP = 200, Y_GAP = 130;
  const PADDING = 30;

  const positions = new Map();
  let cursorY = 0;

  function layoutFrom(name, depth = 0) {
    const kids = (childrenOf.get(name) || []).filter(k => byName.has(k));
    const x = PADDING + depth * X_GAP;

    if (kids.length === 0) {
      const y = PADDING + cursorY * Y_GAP;
      positions.set(name, { x, y });
      cursorY += 1;
      return { x, y };
    }

    const firstPos = layoutFrom(kids[0], depth + 1);
    const baseY = firstPos.y;

    for (let i = 1; i < kids.length; i++) {
      layoutFrom(kids[i], depth + 1);
    }

    positions.set(name, { x, y: baseY });
    return { x, y: baseY };
  }

  roots.forEach((r) => {
    layoutFrom(r, 0);
    cursorY += 1.5;
  });

  // ===== SVG 기본 세팅 =====
  const svg = by(`#svg-${LINE_NAME}`);
  const maxX = Math.max(...Array.from(positions.values()).map(p => p.x)) + NODE_W + PADDING;
  const maxY = Math.max(...Array.from(positions.values()).map(p => p.y)) + NODE_H + PADDING;
  svg.setAttribute('width', Math.max(1600, maxX));
  svg.setAttribute('height', Math.max(900, maxY));
  svg.setAttribute('viewBox', `0 0 ${Math.max(1200, maxX)} ${Math.max(600, maxY)}`);

  // ===== 연결선 그리기 =====
  function drawEdge(p, c) {
    const P = positions.get(p);
    const C = positions.get(c);
    if (!P || !C) {
      console.warn(`위치 누락: ${!P ? '부모' : '자식'} 노드`, p, c);
      return;
    }

    const px = P.x + NODE_W;
    const py = P.y + NODE_H / 2;
    const cx = C.x;
    const cy = C.y + NODE_H / 2;
    const midX = (px + cx) / 2;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'edge');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#394254');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('d', `M ${px} ${py} L ${midX} ${py} L ${midX} ${cy} L ${cx} ${cy}`);
    svg.appendChild(path);
  }

  MONS.forEach(m => (m.next || []).forEach(n => byName.has(n) && drawEdge(m.name, n)));

  // ===== 노드 렌더링 =====
  function nodeGroup(m) {
    const pos = positions.get(m.name);
    if (!pos) return;
    const { x, y } = pos;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node');
    g.setAttribute('transform', `translate(${x},${y})`);
    g.style.cursor = 'pointer';

    // 카드 박스
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', NODE_W);
    rect.setAttribute('height', NODE_H);
    rect.setAttribute('fill', '#1a1f2e');
    rect.setAttribute('stroke', '#6ea8fe');
    rect.setAttribute('rx', 10);
    rect.setAttribute('ry', 10);

    // 이미지
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('x', 12);
    img.setAttribute('y', 12);
    img.setAttribute('width', NODE_W - 24);
    img.setAttribute('height', NODE_H - 44);
    img.setAttribute('href', `../../images/monsters/${m.image || 'placeholder.png'}`);
    img.onerror = () => console.warn(`이미지 로드 실패: images/monsters/${m.image}`);

    // 이름 텍스트
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', NODE_W / 2);
    text.setAttribute('y', NODE_H - 22);
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('text-anchor', 'middle');
    text.textContent = m.name;

    g.append(rect, img, text);
    g.addEventListener('click', () => openModal(m.name, byName));
    return g;
  }

  MONS.forEach(m => svg.appendChild(nodeGroup(m)));

  // ======== SVG Pan & Zoom ========
  let isPanning = false;
  let startX = 0, startY = 0;
  let viewX = 0, viewY = 0;
  let viewW = svg.viewBox.baseVal.width || svg.clientWidth;
  let viewH = svg.viewBox.baseVal.height || svg.clientHeight;
  let scale = 1;

  svg.setAttribute("viewBox", `${viewX} ${viewY} ${viewW} ${viewH}`);
  svg.style.cursor = "grab";

  svg.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    svg.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    isPanning = false;
    svg.style.cursor = "grab";
  });

  svg.addEventListener("mousemove", (e) => {
    if (!isPanning) return;
    const dx = (startX - e.clientX) * (viewW / svg.clientWidth);
    const dy = (startY - e.clientY) * (viewH / svg.clientHeight);
    viewX += dx;
    viewY += dy;
    startX = e.clientX;
    startY = e.clientY;
    svg.setAttribute("viewBox", `${viewX} ${viewY} ${viewW} ${viewH}`);
  });

  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newScale = direction > 0 ? scale / zoomFactor : scale * zoomFactor;
    const clamped = Math.min(Math.max(newScale, 0.2), 4);

    const zoomRatio = clamped / scale;
    const vx = viewX + (mx / svg.clientWidth) * viewW;
    const vy = viewY + (my / svg.clientHeight) * viewH;
    viewX = vx - (vx - viewX) * zoomRatio;
    viewY = vy - (vy - viewY) * zoomRatio;
    viewW *= zoomRatio;
    viewH *= zoomRatio;

    scale = clamped;
    svg.setAttribute("viewBox", `${viewX} ${viewY} ${viewW} ${viewH}`);
  }, { passive: false });
}


// ===== 몬스터 상세 모달 =====
async function openModal(name, byName, keepFusionOpen = false) {
  if (typeof ensureItemsLoaded === "function") {
    await ensureItemsLoaded();
  }

  const m = byName.get(name) || AllMonsters.get(name);
  if (!m) return;

  const modal = document.querySelector('#monster-modal');
  const closeBtn = document.querySelector('#close-modal');

  if (!keepFusionOpen) {
    const fusionModal = document.querySelector("#fusion-modal");
    if (fusionModal) fusionModal.classList.remove("open");
  }

  // 헤더
  document.querySelector('#monster-title').textContent = m.name;
  document.querySelector('#modal-img').src = `../../images/monsters/${m.image || 'placeholder.png'}`;
  document.querySelector('#modal-img').alt = m.name;

  // 기본 정보
  const setText = (id, v) => document.querySelector(id).textContent = v || '';
  const clearLinks = (el) => (el.innerHTML = '');
  const addLink = (el, name) => {
    const btn = document.createElement('button');
    btn.className = 'link';
    btn.textContent = name;
    btn.addEventListener('click', () => openModal(name, byName));
    el.appendChild(btn);
  };

  setText('#field-attribute', m.attribute || '');
  setText('#field-color', m.color || '');
  setText('#field-stage', m.stage || '');

  // ===== 진화 조건 렌더링 =====
  const evoField = document.querySelector('#field-evo');
  evoField.innerHTML = "";

  // 1) 합체 진화
  if (m.evolutionCondition && m.evolutionCondition.type === "fusion") {
    const btn = document.createElement("button");
    btn.className = "link";
    btn.textContent = "[합체 조건 보기]";

    btn.addEventListener("click", () => {
      const ingList = m.evolutionCondition.ingredients.map(name => {
        let mon = null;
        if (window.MonsterGlobalMap instanceof Map) {
          mon = window.MonsterGlobalMap.get(name);
        }
        if (!mon) {
          mon = byName.get(name);
        }
        if (!mon) console.warn("합체 재료를 찾을 수 없음:", name);
        return mon;
      }).filter(Boolean);

      const resultMon = m;
      const place = m.evolutionCondition.place;

      openFusionModal({
        ingredients: ingList,
        result: resultMon,
        place: place
      });
    });

    evoField.appendChild(btn);
  }
  // 2) 그 외 (문자열 조건)
  else {
    evoField.textContent = m.evolutionCondition || "";
  }

  // 3) 배열 형태 조건 (아이템 + 텍스트)
  if (Array.isArray(m.evolutionCondition)) {
    evoField.innerHTML = "";
    m.evolutionCondition.forEach(cond => {
      const row = document.createElement("div");
      row.className = "evo-cond-row";

      // 아이템 조건
      if (cond.type === "item") {
        const item = itemMap.get(cond.itemId);
        if (item) {
          row.innerHTML = `
            <span class="evo-item-name">${item.name}</span>
            <button class="item-detail" data-item-id="${item.id}">
              [자세히 보기]
            </button>
          `;
        }
      }
      // 텍스트 조건
      else if (cond.type === "text") {
        row.textContent = cond.value;
      }

      evoField.appendChild(row);
    });

    evoField.querySelectorAll(".item-detail").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.itemId;
        if (typeof openItemModal === "function") {
          openItemModal(id);
        }
      });
    });
  }

  // ===== 이전 / 다음 트리 =====
  const prevBox = document.querySelector('#field-prev');
  const nextBox = document.querySelector('#field-next');
  clearLinks(prevBox);
  clearLinks(nextBox);
  (m.previous || []).forEach(p => byName.has(p) && addLink(prevBox, p));
  (m.next || []).forEach(n => byName.has(n) && addLink(nextBox, n));

  // ===== 스탯 =====
  const s = m.stats || {};
  setText('#stat-cost', s.cost ?? '');
  setText('#stat-cooldown', s.cooldown ?? '');
  setText('#stat-critical', s.critical ?? '');
  setText('#stat-attack', s.attack ?? '');
  setText('#stat-speed', s.speed ?? '');
  setText('#stat-awakening', s.awakening ?? '');
  setText('#stat-transcendence', s.transcendence ?? '');

  // ===== 각성 페이지 이동 버튼 =====
  const linkBtn = document.querySelector('#awakening-link');
  if (s.awakening === "O" && m.awakeningLink) {
    linkBtn.style.display = "inline-block";
    linkBtn.onclick = () => {
      window.location.href = m.awakeningLink;
    };
  } else {
    linkBtn.style.display = "none";
  }

  // ===== 각성 / 초월 텍스트 =====
  const specialBox = document.querySelector('#field-special');
  if (specialBox) {
    specialBox.innerHTML = '';

    if (m.awakening === "O" && m.awakeningLink) {
      const btn = document.createElement('button');
      btn.className = 'special-btn';
      btn.textContent = '각성 페이지로 이동 →';
      btn.addEventListener('click', () => {
        window.location.href = m.awakeningLink;
      });
      specialBox.appendChild(btn);
    } else if (m.awakening === "O" && !m.awakeningLink) {
      const span = document.createElement('span');
      span.className = 'special-text';
      span.textContent = '각성 형태 존재 (링크 없음)';
      specialBox.appendChild(span);
    }

    if (m.transcendence === "O") {
      const span = document.createElement('span');
      span.className = 'special-text';
      span.textContent = '초월 형태 존재';
      specialBox.appendChild(span);
    }
  }

  // 모달 열기 / 닫기
  modal.classList.add('open');
  closeBtn.onclick = () => modal.classList.remove('open');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('open');
  };
}


// ===== 조건 설명 모달 =====
function openConditionModal(condKey, monsterList = []) {
  const modal = document.querySelector("#condition-modal");
  const title = document.querySelector("#condition-title");
  const desc = document.querySelector("#condition-desc");
  const listBox = document.querySelector("#condition-monsters");
  const closeBtn = document.querySelector("#close-condition");

  const cond = conditions[condKey];
  if (!cond) return;

  title.textContent = cond.title;
  desc.innerHTML = cond.text;

  listBox.innerHTML = "";

  monsterList.forEach(mon => {
    const card = document.createElement("div");
    card.className = "monster-card";

    card.innerHTML = `
      <img src="../../images/monsters/${mon.image}" alt="${mon.name}">
      <div class="monster-card-name">${mon.name}</div>
    `;

    card.addEventListener("click", () => {
      modal.classList.remove("open");
      openModal(mon.name, window.byNameGlobal);
    });

    listBox.appendChild(card);
  });

  modal.classList.add("open");

  closeBtn.onclick = () => modal.classList.remove("open");
  modal.onclick = e => {
    if (e.target === modal) modal.classList.remove("open");
  };
}


// ===== 합체 진화 모달 =====
function openFusionModal({ ingredients, result, place }) {
  const modal = document.querySelector("#fusion-modal");
  const listBox = document.querySelector("#fusion-list");
  const resultBox = document.querySelector("#fusion-result");
  const placeBox = document.querySelector("#fusion-place");
  const closeBtn = document.querySelector("#close-fusion");

  listBox.innerHTML = "";
  resultBox.innerHTML = "";

  // 재료 몬스터 출력
  ingredients.forEach((mon, idx) => {
    if (!mon) return;

    const card = document.createElement("div");
    card.className = "fusion-card";

    card.innerHTML = `
      <img src="../../images/monsters/${mon.image}" alt="${mon.name}">
      <div class="fusion-name link">${mon.name}</div>
    `;

    // 이름 클릭 → 몬스터 상세 모달 (fusion 모달은 유지)
    card.querySelector(".fusion-name").addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(mon.name, window.byNameGlobal, true);
    });

    listBox.appendChild(card);

    if (idx < ingredients.length - 1) {
      const plus = document.createElement("div");
      plus.className = "plus-symbol";
      plus.textContent = "+";
      listBox.appendChild(plus);
    }
  });

  // 결과 몬스터 카드
  if (result) {
    resultBox.innerHTML = `
      <div class="fusion-card">
        <img src="../../images/monsters/${result.image}" alt="${result.name}">
        <div class="fusion-name link">${result.name}</div>
      </div>
    `;

    resultBox.querySelector(".fusion-name").addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(result.name, window.byNameGlobal, true);
    });
  } else {
    resultBox.innerHTML = "";
  }

  // 장소
  placeBox.textContent = `합체 장소: ${place || "정보 없음"}`;

  modal.classList.add("open");

  closeBtn.onclick = () => modal.classList.remove("open");
  modal.onclick = e => {
    if (e.target === modal) modal.classList.remove("open");
  };
}
