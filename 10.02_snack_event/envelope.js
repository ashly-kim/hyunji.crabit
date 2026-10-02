// 약봉투 렌더러: 원본 도안(A4 가로, pt 단위) 좌표 그대로 캔버스에 그린다.
// 미리보기와 인쇄용 PDF가 같은 함수를 쓰므로 화면과 출력물이 어긋나지 않는다.
// 디자인은 THEMES 5종. 귀여운 3종(cute 레이아웃)은 힉스필드 그림을 깔고, 약국 2종(pharmacy 레이아웃)은 실제 약봉투 양식을 따른다.
(function () {
  const PAGE = { w: 842.25, h: 595.5 };
  const BODY = { x: 84, y: 52.4, w: 660, h: 456.6 };
  const FOLD_X = 416;
  const FRONT = { x: 84, y: 52.4, w: 332, h: 456.6 };
  const BACK = { x: 416, y: 52.4, w: 328, h: 456.6 };
  const DARK = '#16192A';
  const SANS = 'Pretendard Variable';

  const THEMES = {
    pink:  { label: '말랑 간식', sub: '귀여운 핑크', layout: 'cute', art: 'art/pink.jpg', paper: '#FFF1F6', main: '#E8559A', font: 'Jua' },
    mint:  { label: '토끼 약사', sub: '귀여운 민트', layout: 'cute', art: 'art/mint.jpg', paper: '#EAF8F3', main: '#17906E', font: 'Jua' },
    retro: { label: '레트로 약국', sub: '옛날 약방', layout: 'cute', art: 'art/retro.jpg', paper: '#FBF5E6', main: '#C93C25', sub2: '#1F3A6B', font: 'Do Hyeon' },
    green: { label: '동네 약국', sub: '진짜 약봉투', layout: 'pharmacy', band: 'fill', paper: '#FFFFFF', main: '#14935B', font: SANS },
    blue:  { label: '병원 내복약', sub: '진짜 약봉투', layout: 'pharmacy', band: 'line', paper: '#FFFFFF', main: '#1F5FBF', font: SANS },
  };

  const NAME_FONTS = [
    { id: SANS, label: '깔끔체', weight: 600 },
    { id: 'Jua', label: '주아체', weight: 400 },
    { id: 'Gowun Dodum', label: '고운돋움', weight: 400 },
    { id: 'Do Hyeon', label: '도현체', weight: 400 },
    { id: 'Gaegu', label: '개구체', weight: 700 },
    { id: 'Nanum Pen Script', label: '나눔손글씨 펜', weight: 400, scale: 1.5, tight: true },
    { id: 'Hi Melody', label: '하이멜로디', weight: 400, scale: 1.2, tight: true },
  ];

  // ---------- 색 ----------
  function hexToRgb(h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function tint(hex, t) { // 흰색 쪽으로 t만큼
    const c = hexToRgb(hex).map(v => Math.round(v + (255 - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  // ---------- 그리기 도구 ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function font(ctx, size, fam, weight) {
    ctx.font = `${weight || 400} ${size}px "${fam}", "${SANS}", sans-serif`;
  }
  function fit(ctx, text, maxW, size, fam, weight, min) {
    let s = size;
    font(ctx, s, fam, weight);
    while (ctx.measureText(text).width > maxW && s > (min || 8)) { s -= .5; font(ctx, s, fam, weight); }
    return s;
  }
  function drawImageCover(ctx, img, x, y, w, h, mirror) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (mirror) { ctx.translate(x + w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(x + w / 2), 0); }
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
  }
  function drawContain(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.min(w / iw, h / ih);
    ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
  }
  function cross(ctx, cx, cy, s, color) {
    const a = s * .34, r = s * .06;
    ctx.fillStyle = color;
    rr(ctx, cx - a / 2, cy - s / 2, a, s, r); ctx.fill();
    rr(ctx, cx - s / 2, cy - a / 2, s, a, r); ctx.fill();
  }
  function checkbox(ctx, x, cy, s, ink) {
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.strokeRect(x, cy - s / 2 + 1, s, s);
    ctx.strokeStyle = DARK; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s * .15, cy + 0.5);
    ctx.lineTo(x + s * .45, cy + s * .45);
    ctx.lineTo(x + s * 1.15, cy - s * .75);
    ctx.stroke();
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '); const lines = []; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function spaced(name) { return /^[가-힣]{2,4}$/.test(name) ? name.split('').join(' ') : name; }

  function drawTitle(ctx, parts, cx, cy, maxW, color, fam, weight, size) {
    let s = size || 27;
    const measure = () => {
      font(ctx, s, fam, weight);
      return parts.reduce((a, p) => a + ctx.measureText(p).width, 0) + (parts.length - 1) * (s * .95);
    };
    let w = measure();
    while (w > maxW && s > 10) { s -= .5; w = measure(); }
    let x = cx - w / 2;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = color;
    parts.forEach((p, i) => {
      font(ctx, s, fam, weight);
      ctx.fillStyle = color;
      ctx.fillText(p, x, cy + 1);
      x += ctx.measureText(p).width;
      if (i < parts.length - 1) { cross(ctx, x + s * .475, cy, s * .78, color); x += s * .95; }
    });
  }

  // 체크 항목 2개를 가운데 정렬로
  function checks(ctx, items, cx, cy, maxW, ink, size) {
    items = items.filter(Boolean);
    if (!items.length) return;
    let fs = size || 12.5;
    const box = 9.5, g1 = 5, g2 = 14;
    const measure = () => { font(ctx, fs, SANS, 500); return items.reduce((a, t) => a + box + g1 + ctx.measureText(t).width, 0) + g2 * (items.length - 1); };
    let total = measure();
    while (total > maxW && fs > 8) { fs -= .5; total = measure(); }
    let x = cx - total / 2;
    for (const t of items) {
      checkbox(ctx, x, cy, box, ink);
      x += box + g1;
      ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; font(ctx, fs, SANS, 500);
      ctx.fillText(t, x, cy + 1);
      x += ctx.measureText(t).width + g2;
    }
  }

  // ---------- 공통: 학원 표시, 학생 이름 ----------
  function academyHelpers(ctx, o, ink) {
    const AF = NAME_FONTS.find(f => f.id === o.acadFont) || NAME_FONTS[1];
    const acad = o.academy || '';
    return {
      text(x, y, maxW, size, color) {
        const sz = fit(ctx, acad, maxW, size * (AF.scale || 1), AF.id, AF.weight, 9);
        ctx.fillStyle = color || ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; font(ctx, sz, AF.id, AF.weight);
        ctx.fillText(acad, x, y);
      },
      logo(x, y, w, h) {
        if (o.logo) return drawContain(ctx, o.logo, x, y, w, h);
        // 로고를 아직 안 올렸을 때 미리보기용 자리 표시(내려받기는 로고가 있어야 가능)
        ctx.setLineDash([4, 3]); ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
        rr(ctx, x, y, w, h, 8); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; font(ctx, Math.min(15, h * .4), SANS, 600);
        ctx.fillText('학원 로고', x + w / 2, y + h / 2);
      },
    };
  }
  function nameText(ctx, o, name, cx, cy, maxW, size) {
    if (!name) return;
    const NF = NAME_FONTS.find(f => f.id === o.nameFont) || NAME_FONTS[0];
    const shown = NF.tight ? name : spaced(name);
    const s = fit(ctx, shown, maxW, size * (NF.scale || 1), NF.id, NF.weight, 12);
    ctx.fillStyle = DARK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    font(ctx, s, NF.id, NF.weight);
    ctx.fillText(shown, cx, cy);
  }

  // ---------- 귀여운 레이아웃 ----------
  function drawCute(ctx, T, o, name, art) {
    const ink = T.main;
    const A = academyHelpers(ctx, o, ink);
    if (art) {
      drawImageCover(ctx, art, FRONT.x, FRONT.y, FRONT.w, FRONT.h, false);
      drawImageCover(ctx, art, BACK.x, BACK.y, BACK.w, BACK.h, true);
    }

    // 제목
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.6;
    rr(ctx, 105.6, 99.7, 275.4, 48.9, 10); ctx.fill(); ctx.stroke();
    drawTitle(ctx, [o.titleL, o.titleR].filter(Boolean), 243.3, 124.6, 250, ink, T.font, 400);

    // 이름
    ctx.fillStyle = '#fff';
    rr(ctx, 102, 166, 282, 60, 12); ctx.fill();
    nameText(ctx, o, name, 236, 196, 200, 26);
    font(ctx, 21, T.font, 400); ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('님', 374, 196);
    ctx.fillRect(108.5, 214.4, 267, 3);

    // 용법 박스
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.6;
    rr(ctx, 106.5, 247.2, 271, 224.7, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    rr(ctx, 206.7, 232.6, 70.7, 35, 17.5); ctx.fill();
    font(ctx, 17, T.font, 400); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('용 법', 242, 250.8);

    const useLogo = o.acadMode === 'logo';
    const dy = useLogo ? 10 : 16;
    const lineY = 291 + dy;
    font(ctx, 13, SANS, 500); ctx.fillStyle = ink;
    ctx.textAlign = 'left'; ctx.fillText(o.per || '', 134, lineY);
    ctx.textAlign = 'right'; ctx.fillText(o.unit || '', 350, lineY);
    const doseS = fit(ctx, o.dose || '', 160, 15, SANS, 500, 9);
    ctx.fillStyle = DARK; ctx.textAlign = 'center'; font(ctx, doseS, SANS, 500);
    ctx.fillText(o.dose || '', 242, lineY);
    ctx.fillStyle = ink; ctx.fillRect(132.5, 304.9 + dy, 219.1, 1.2);
    checks(ctx, [o.chk1, o.chk2], 242, 328 + dy, 225, T.sub2 || ink);

    if (useLogo) A.logo(142, 350 + dy, 200, 40);
    else A.text(242, 370 + dy, 230, 23);

    if (o.msg) {
      font(ctx, 11, SANS, 500);
      const lines = wrap(ctx, `"${o.msg}"`, 225).slice(0, 2);
      ctx.fillStyle = T.sub2 || ink; ctx.textAlign = 'center';
      const my = useLogo ? 406 : 396;
      lines.forEach((l, i) => ctx.fillText(l, 242, my + dy + i * 15));
    }

    // 뒷면: 로고는 흰 도형 위, 학원 이름은 도형 없이 그림이 비어 있는 가운데
    if (useLogo) {
      const LB = { x: 488, y: 397, w: 183, h: 84 };
      ctx.fillStyle = '#fff';
      rr(ctx, LB.x - 10, LB.y - 10, LB.w + 20, LB.h + 20, 16); ctx.fill();
      A.logo(LB.x + 6, LB.y + 6, LB.w - 12, LB.h - 12);
    } else {
      A.text(BACK.x + BACK.w / 2, BACK.y + BACK.h / 2, 190, 28);
    }
  }

  // ---------- 진짜 약봉투 레이아웃 ----------
  const TIMES = [['아침', 'sun'], ['점심', 'sun2'], ['저녁', 'moon'], ['자기 전', 'star']];
  function icon(ctx, kind, cx, cy, r, color) {
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    if (kind === 'sun' || kind === 'sun2') {
      ctx.beginPath(); ctx.arc(cx, cy, r * .45, 0, Math.PI * 2);
      if (kind === 'sun') ctx.fill(); else ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * .68, cy + Math.sin(a) * r * .68); ctx.lineTo(cx + Math.cos(a) * r * .95, cy + Math.sin(a) * r * .95); ctx.stroke();
      }
    } else if (kind === 'moon') {
      ctx.beginPath(); ctx.arc(cx, cy, r * .75, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + r * .35, cy - r * .2, r * .62, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .34 : r * .8;
        ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
    }
  }
  function barcode(ctx, x, y, w, h, seed, color) {
    let n = 7; for (const ch of String(seed)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    ctx.fillStyle = color;
    let cx = x;
    while (cx < x + w) {
      n = (n * 1103515245 + 12345) >>> 0;
      const bw = 0.8 + ((n >> 8) % 3) * 0.7, gap = 0.9 + ((n >> 12) % 3) * 0.6;
      ctx.fillRect(cx, y, Math.min(bw, x + w - cx), h);
      cx += bw + gap;
    }
  }

  function drawPharmacy(ctx, T, o, name, idx) {
    const ink = T.main, light = tint(ink, .9);
    const A = academyHelpers(ctx, o, ink);
    const X = 104, W = 292, LW = 62; // 표 위치, 라벨 칸 폭
    const VX = X + LW, VW = W - LW, VC = VX + VW / 2;
    const label = (txt, y, h) => {
      ctx.fillStyle = light; ctx.fillRect(X, y, LW, h);
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.strokeRect(X, y, W, h);
      ctx.beginPath(); ctx.moveTo(X + LW, y); ctx.lineTo(X + LW, y + h); ctx.stroke();
      font(ctx, 12.5, SANS, 700); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, X + LW / 2, y + h / 2);
    };

    // 상단 띠
    const parts = [o.titleL, o.titleR].filter(Boolean);
    if (T.band === 'fill') {
      ctx.fillStyle = ink; ctx.fillRect(FRONT.x, FRONT.y, FRONT.w, 64);
      drawTitle(ctx, parts, 250, 84, 280, '#fff', SANS, 700, 26);
    } else {
      ctx.fillStyle = ink; ctx.fillRect(FRONT.x, FRONT.y, FRONT.w, 8);
      drawTitle(ctx, parts, 250, 88, 280, ink, SANS, 700, 26);
      ctx.fillStyle = ink; ctx.fillRect(X, 111, W, 2); ctx.fillRect(X, 115, W, .8);
    }

    // 번호와 조제일
    const d = new Date();
    font(ctx, 9.5, SANS, 500); ctx.fillStyle = 'rgba(22,25,42,.6)'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillText('No. ' + String((idx || 0) + 1).padStart(4, '0'), X, 130);
    ctx.textAlign = 'right'; ctx.fillText(`조제일자 ${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`, X + W, 130);

    // 성명, 용법, 복용
    label('성 명', 142, 48);
    nameText(ctx, o, name, VC - 8, 166, VW - 50, 24);
    font(ctx, 16, SANS, 600); ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.fillText('님', X + W - 10, 166);

    label('용 법', 190, 40);
    font(ctx, 12, SANS, 500); ctx.fillStyle = ink;
    ctx.textAlign = 'left'; ctx.fillText(o.per || '', VX + 10, 210);
    ctx.textAlign = 'right'; ctx.fillText(o.unit || '', X + W - 10, 210);
    const ds = fit(ctx, o.dose || '', VW - 80, 14.5, SANS, 600, 9);
    ctx.fillStyle = DARK; ctx.textAlign = 'center'; font(ctx, ds, SANS, 600); ctx.fillText(o.dose || '', VC, 210);

    label('복 용', 230, 40);
    checks(ctx, [o.chk1, o.chk2], VC, 250, VW - 16, ink, 12);

    // 복용 시간표: 선생님이 손으로 체크할 수 있는 칸
    const gy = 282, gh = 62, cw = W / 4;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.strokeRect(X, gy, W, gh);
    TIMES.forEach(([lab, kind], i) => {
      const cx = X + cw * i + cw / 2;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      if (i) { ctx.beginPath(); ctx.moveTo(X + cw * i, gy); ctx.lineTo(X + cw * i, gy + gh); ctx.stroke(); }
      font(ctx, 11.5, SANS, 700);
      const tw = ctx.measureText(lab).width, total = 16 + 4 + tw, sx = cx - total / 2;
      icon(ctx, kind, sx + 8, gy + 19, 8, ink);
      font(ctx, 11.5, SANS, 700); ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(lab, sx + 20, gy + 19);
      ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.strokeRect(cx - 7, gy + 35, 14, 14);
    });

    // 주의사항
    font(ctx, 11.5, SANS, 700); ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('주의사항', X, 362);
    if (o.msg) {
      font(ctx, 11, SANS, 500);
      const lines = wrap(ctx, '※ ' + o.msg, W).slice(0, 2);
      ctx.fillStyle = DARK;
      lines.forEach((l, i) => ctx.fillText(l, X, 381 + i * 15));
    }

    // 조제 (학원)
    const py = 414, ph = 60;
    label('조 제', py, ph);
    if (o.acadMode === 'logo') A.logo(VX + 14, py + 8, VW - 28, ph - 16);
    else A.text(VC, py + ph / 2, VW - 24, 20, DARK);

    // ===== 뒷면: 복약 안내 =====
    const BX = BACK.x + 34, BW = BACK.w - 68, BC = BACK.x + BACK.w / 2;
    ctx.fillStyle = ink; ctx.fillRect(BACK.x, BACK.y, BACK.w, 8);
    font(ctx, 15, SANS, 700); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('복약 안내', BC, 96);
    ctx.fillRect(BX, 112, BW, 1.2);
    const guide = [
      '이 약은 시험기간 지친 마음에 효과가 있습니다.',
      '공부하다 힘들 때 꺼내 드세요.',
      '친구와 나눠 먹으면 효과가 두 배가 됩니다.',
      '부작용: 웃음이 나고 성적이 오를 수 있습니다.',
    ];
    guide.forEach((g, i) => {
      font(ctx, 10.5, SANS, 500); ctx.textAlign = 'left';
      ctx.fillStyle = ink; ctx.fillText('·', BX, 133 + i * 19);
      ctx.fillStyle = DARK; ctx.fillText(g, BX + 9, 133 + i * 19);
    });
    ctx.fillStyle = ink; ctx.fillRect(BX, 214, BW, 1.2);

    if (o.acadMode === 'logo') A.logo(BC - 95, 270, 190, 76);
    else A.text(BC, 308, BW, 26);

    barcode(ctx, BC - 70, 420, 140, 30, (name || '') + (idx || 0), DARK);
    font(ctx, 8.5, SANS, 500); ctx.fillStyle = 'rgba(22,25,42,.6)'; ctx.textAlign = 'center';
    ctx.fillText('8 801234 ' + String((idx || 0) + 1).padStart(5, '0'), BC, 460);
  }

  // ---------- 본체 ----------
  // o: { design, art(Image), acadMode, logo, academy, acadFont, nameFont, titleL, titleR, per, dose, unit, chk1, chk2, msg }
  function outline(ctx) {
    ctx.beginPath();
    ctx.moveTo(BODY.x, BODY.y);
    ctx.lineTo(743.41, BODY.y);
    ctx.lineTo(783.08, 81.04); ctx.lineTo(783.08, 481.86);   // 옆 날개
    ctx.lineTo(744.7, 509);
    ctx.lineTo(716.17, 548.43); ctx.lineTo(443.16, 548.43);  // 아래 날개
    ctx.lineTo(414.6, 509);
    ctx.lineTo(BODY.x, 509);
    ctx.closePath();
  }
  function draw(ctx, scale, o, name, idx) {
    const T = THEMES[o.design] || THEMES.pink;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PAGE.w, PAGE.h);
    ctx.fillStyle = T.paper; outline(ctx); ctx.fill();

    if (T.layout === 'pharmacy') drawPharmacy(ctx, T, o, name, idx);
    else drawCute(ctx, T, o, name, o.art);

    // 자르는 선(실선), 접는 선(점선)
    ctx.strokeStyle = T.main; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.lineJoin = 'miter';
    outline(ctx); ctx.stroke();
    ctx.setLineDash([4.5, 3]);
    ctx.beginPath();
    ctx.moveTo(FOLD_X, BODY.y); ctx.lineTo(FOLD_X, BODY.y + BODY.h);
    ctx.moveTo(743.41, BODY.y); ctx.lineTo(743.41, BODY.y + BODY.h);
    ctx.moveTo(414.6, 508.8); ctx.lineTo(744.7, 508.8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 캔버스 렌더 전에 쓰는 글꼴과 글자를 미리 받아 둔다(구글 폰트는 글자 단위로 쪼개져 있음)
  async function ensureFonts(o, names) {
    const T = THEMES[o.design] || THEMES.pink;
    const text = [o.titleL, o.titleR, o.academy, o.dose, o.chk1, o.chk2, o.msg, o.per, o.unit,
      '용 법 님 성 명 복 조 제 아침 점심 저녁 자기 전 주의사항 ※ No. 조제일자 0123456789 복약 안내 이 약은 시험기간 지친 마음에 효과가 있습니다 공부하다 힘들 때 꺼내 드세요 친구와 나눠 먹으면 두 배가 됩니다 부작용: 웃음이 나고 성적이 오를 수 학원 로고',
      ...(names || [])].join('');
    const fams = new Set([T.font, o.nameFont || SANS, o.acadFont || 'Jua', SANS]);
    await Promise.all([...fams].flatMap(f => [400, 500, 600, 700].map(w =>
      document.fonts.load(`${w} 20px "${f}"`, text)))).catch(() => {});
  }

  window.Envelope = { PAGE, FRONT, THEMES, NAME_FONTS, draw, ensureFonts };
})();
