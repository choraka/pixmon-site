function renderMonsterTree(LINE_NAME, MONS) {
  const by = (sel, root = document) => root.querySelector(sel);
  const byName = new Map(MONS.map(m => [m.name, m]));
  const childrenOf = new Map(MONS.map(m => [m.name, m.next || []]));
  const roots = MONS.filter(m => !m.previous || m.previous.length === 0).map(m => m.name);

  // ===== 설정값 =====
  const NODE_W = 120, NODE_H = 120;
  const X_GAP = 200, Y_GAP = 130;
  const PADDING = 30;

  // ===== 안정형 레이아웃 계산 (깊은 트리 대응 + 첫 자식 일직선) =====
  const positions = new Map();
  let cursorY = 0;

  function layoutFrom(name, depth = 0) {
    const kids = (childrenOf.get(name) || []).filter(k => byName.has(k));
    const x = PADDING + depth * X_GAP;

    // 리프 노드
    if (kids.length === 0) {
      const y = PADDING + cursorY * Y_GAP;
      positions.set(name, { x, y });
      cursorY += 1;
      return { x, y };
    }

    // 첫 자식 먼저 배치 → 부모 Y를 첫 자식에 맞춤
    const firstYBefore = cursorY;
    const firstPos = layoutFrom(kids[0], depth + 1);
    const baseY = firstPos.y;

    // 나머지 자식은 아래쪽으로 배치
    for (let i = 1; i < kids.length; i++) {
      layoutFrom(kids[i], depth + 1);
    }

    positions.set(name, { x, y: baseY });
    return { x, y: baseY };
  }

  // 여러 루트 처리
  roots.forEach((r) => {
    layoutFrom(r, 0);
    cursorY += 1.5; // 루트 간 여백
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
      console.warn(`⚠️ 위치 누락: ${!P ? '부모' : '자식'} 노드`, p, c);
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
    img.setAttribute('href', `images/monsters/${m.image || 'placeholder.png'}`);
    img.onerror = () => console.warn(`⚠️ 이미지 로드 실패: images/monsters/${m.image}`);

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

  // ✅ 초기 뷰박스 설정
  svg.setAttribute("viewBox", `${viewX} ${viewY} ${viewW} ${viewH}`);
  svg.style.cursor = "grab";

  // ===== 마우스 드래그 이동 =====
  svg.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // 좌클릭만 허용
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

  // ===== 휠 확대/축소 =====
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

// ===== 모달 =====
function openModal(name, byName) {
  const m = byName.get(name);
  if (!m) return;

  const modal = document.querySelector('#monster-modal');
  const closeBtn = document.querySelector('#close-modal');

  // 헤더
  document.querySelector('#monster-title').textContent = m.name;
  document.querySelector('#modal-img').src = `./images/monsters/${m.image || 'placeholder.png'}`;
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
  setText('#field-evo', m.evolutionCondition || '');

  const prevBox = document.querySelector('#field-prev');
  const nextBox = document.querySelector('#field-next');
  clearLinks(prevBox);
  clearLinks(nextBox);
  (m.previous || []).forEach(p => byName.has(p) && addLink(prevBox, p));
  (m.next || []).forEach(n => byName.has(n) && addLink(nextBox, n));

  const s = m.stats || {};
  setText('#stat-cost', s.cost ?? '');
  setText('#stat-cooldown', s.cooldown ?? '');
  setText('#stat-critical', s.critical ?? '');
  setText('#stat-attack', s.attack ?? '');
  setText('#stat-speed', s.speed ?? '');

  modal.classList.add('open');
  closeBtn.onclick = () => modal.classList.remove('open');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('open');
  };
}
