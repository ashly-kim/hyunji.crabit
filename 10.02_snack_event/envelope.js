// 약봉투 렌더러: 원본 도안(A4 가로, pt 단위) 좌표 그대로 캔버스에 그린다.
// 미리보기와 인쇄용 PDF가 같은 함수를 쓰므로 화면과 출력물이 어긋나지 않는다.
(function () {
  const PAGE = { w: 842.25, h: 595.5 };
  const BODY = { x: 84, y: 52.4, w: 660, h: 456.6 };      // 본체(앞면 + 뒷면)
  const FOLD_X = 416;                                     // 앞뒤 접는 선
  const FRONT = { x: 84, y: 52.4, w: 332, h: 456.6 };
  const BACK = { x: 416, y: 52.4, w: 328, h: 456.6 };
  const DARK = '#16192A';

  const TONES = {
    cute:  { label: '귀여운', sub: '말랑 스티커', font: 'Jua', nameFont: 'Jua' },
    clean: { label: '깔끔한', sub: '미니멀 라인', font: 'Pretendard Variable', fontWeight: 700, nameFont: 'Pretendard Variable' },
    retro: { label: '레트로', sub: '옛날 약국', font: 'Do Hyeon', nameFont: 'Do Hyeon' },
    hand:  { label: '손그림', sub: '크레파스', font: 'Gaegu', fontWeight: 700, nameFont: 'Gaegu' },
    pop:   { label: '팝', sub: '쨍한 키치', font: 'Jua', nameFont: 'Jua' },
  };

  // ---------- 색 ----------
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex([r, g, b]) { return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
  function lum([r, g, b]) {
    const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
  }
  // 너무 연한 브랜드 컬러는 글자와 선이 안 보이니 흰 바탕 대비 3:1이 나올 때까지 어둡게
  function inkOf(hex) {
    let c = hexToRgb(hex);
    for (let i = 0; i < 20 && (1.05 / (lum(c) + .05)) < 3; i++) c = mix(c, [0, 0, 0], .12);
    return c;
  }

  // ---------- 일러스트 재채색 ----------
  // 원본은 검정 + 회색 2톤. 밝기에 따라 검정 -> 브랜드 컬러, 회색 -> 연한 틴트, 흰색 -> 흰색
  const artCache = new Map();
  function recolor(img, hex, strength) {
    const key = img.src + hex + strength;
    if (artCache.has(key)) return artCache.get(key);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    const brand = mix(hexToRgb(hex), [255, 255, 255], 1 - strength);
    const tint = mix(hexToRgb(hex), [255, 255, 255], 1 - strength * .45);
    const W = [255, 255, 255];
    for (let i = 0; i < p.length; i += 4) {
      const L = p[i];
      let o;
      if (L <= 165) o = mix(brand, tint, L / 165);
      else o = mix(tint, W, (L - 165) / 90);
      p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2]; p[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    if (artCache.size > 40) artCache.clear();
    artCache.set(key, c);
    return c;
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
    ctx.font = `${weight || 400} ${size}px "${fam}", "Pretendard Variable", sans-serif`;
  }
  function fit(ctx, text, maxW, size, fam, weight, min) {
    let s = size;
    font(ctx, s, fam, weight);
    while (ctx.measureText(text).width > maxW && s > (min || 8)) { s -= .5; font(ctx, s, fam, weight); }
    return s;
  }
  function drawImageCover(ctx, img, x, y, w, h, mirror) {
    const iw = img.width, ih = img.height;
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

  // ---------- 본체 ----------
  // o: { color, tone, art(재채색 전 Image), strength, logo(Image|null), academy, title, per, dose, unit, chk1, chk2, msg }
  function draw(ctx, scale, o, name) {
    const T = TONES[o.tone] || TONES.cute;
    const ink = rgbToHex(inkOf(o.color));
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PAGE.w, PAGE.h);

    // 일러스트: 앞면 그대로, 뒷면은 좌우 반전
    if (o.art) {
      // AI로 새로 그린 그림은 이미 브랜드 컬러라 재채색하지 않는다
      const art = o.artRaw ? o.art : recolor(o.art, o.color, o.strength);
      drawImageCover(ctx, art, FRONT.x, FRONT.y, FRONT.w, FRONT.h, false);
      drawImageCover(ctx, art, BACK.x, BACK.y, BACK.w, BACK.h, true);
    }

    // 자르는 선(실선)
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(BODY.x, BODY.y);
    ctx.lineTo(743.41, BODY.y);
    ctx.lineTo(783.08, 81.04); ctx.lineTo(783.08, 481.86);   // 옆 날개
    ctx.lineTo(744.7, 509);
    ctx.lineTo(716.17, 548.43); ctx.lineTo(443.16, 548.43);  // 아래 날개
    ctx.lineTo(414.6, 509);
    ctx.lineTo(BODY.x, 509);
    ctx.closePath();
    ctx.stroke();
    // 접는 선(점선)
    ctx.setLineDash([4.5, 3]);
    ctx.beginPath();
    ctx.moveTo(FOLD_X, BODY.y); ctx.lineTo(FOLD_X, BODY.y + BODY.h);
    ctx.moveTo(743.41, BODY.y); ctx.lineTo(743.41, BODY.y + BODY.h);
    ctx.moveTo(414.6, 508.8); ctx.lineTo(744.7, 508.8);
    ctx.stroke();
    ctx.setLineDash([]);

    // ===== 앞면 =====
    // 제목 박스
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.6;
    rr(ctx, 105.6, 99.7, 275.4, 48.9, 8); ctx.fill(); ctx.stroke();
    drawTitle(ctx, o.title || '', 243.3, 124.6, 250, T, ink);

    // 이름 줄 (흰 띠 위에)
    ctx.fillStyle = '#fff';
    rr(ctx, 102, 166, 282, 60, 12); ctx.fill();
    ctx.textBaseline = 'middle';
    if (name) {
      const s = fit(ctx, spaced(name), 200, 26, T.nameFont, T.fontWeight === 700 ? 600 : 400, 12);
      ctx.fillStyle = DARK; ctx.textAlign = 'center';
      font(ctx, s, T.nameFont, T.fontWeight === 700 ? 600 : 400);
      ctx.fillText(spaced(name), 236, 196);
    }
    font(ctx, 21, T.nameFont, T.fontWeight === 700 ? 500 : 400);
    ctx.fillStyle = ink; ctx.textAlign = 'right';
    ctx.fillText('님', 374, 196);
    ctx.fillStyle = ink;
    ctx.fillRect(108.5, 214.4, 267, 3);

    // 용법 박스
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.6;
    rr(ctx, 106.5, 247.2, 271, 224.7, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    rr(ctx, 206.7, 232.6, 70.7, 35, 17.5); ctx.fill();
    font(ctx, 17, T.font, T.fontWeight); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('용 법', 242, 250.8);

    // 1일 ___ 1 봉
    const dy = o.logo ? 0 : 16;
    const lineY = 291 + dy;
    font(ctx, 13, 'Pretendard Variable', 500); ctx.fillStyle = ink;
    ctx.textAlign = 'left'; ctx.fillText(o.per || '', 134, lineY);
    ctx.textAlign = 'right'; ctx.fillText(o.unit || '', 350, lineY);
    const doseS = fit(ctx, o.dose || '', 160, 15, 'Pretendard Variable', 500, 9);
    ctx.fillStyle = DARK; ctx.textAlign = 'center'; font(ctx, doseS, 'Pretendard Variable', 500);
    ctx.fillText(o.dose || '', 242, lineY);
    ctx.fillStyle = ink; ctx.fillRect(132.5, 304.9 + dy, 219.1, 1.2);

    // 체크 2개
    const items = [o.chk1, o.chk2].filter(Boolean);
    if (items.length) {
      let fs = 12.5;
      const box = 9.5, g1 = 5, g2 = 14;
      const measure = () => { font(ctx, fs, 'Pretendard Variable', 500); return items.reduce((a, t) => a + box + g1 + ctx.measureText(t).width, 0) + g2 * (items.length - 1); };
      let total = measure();
      while (total > 225 && fs > 8) { fs -= .5; total = measure(); }
      let x = 242 - total / 2; const cy = 328 + dy;
      for (const t of items) {
        checkbox(ctx, x, cy, box, ink);
        x += box + g1;
        ctx.fillStyle = ink; ctx.textAlign = 'left'; font(ctx, fs, 'Pretendard Variable', 500);
        ctx.fillText(t, x, cy + 1);
        x += ctx.measureText(t).width + g2;
      }
    }

    // 학원 이름
    const acad = o.academy || '';
    const aS = fit(ctx, acad, 230, 23, T.font, T.fontWeight, 10);
    ctx.fillStyle = ink; ctx.textAlign = 'center'; font(ctx, aS, T.font, T.fontWeight);
    ctx.fillText(acad, 242, 370 + dy);

    // 응원 문구
    if (o.msg) {
      font(ctx, 11, 'Pretendard Variable', 500);
      const lines = wrap(ctx, `"${o.msg}"`, 225).slice(0, 2);
      ctx.fillStyle = ink;
      lines.forEach((l, i) => ctx.fillText(l, 242, 396 + dy + i * 15));
    }

    // 작은 로고 (있을 때만)
    if (o.logo) drawContain(ctx, o.logo, 192, 424, 100, 34);

    // ===== 뒷면 =====
    const LB = { x: 488, y: 397, w: 183, h: 84 };
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
    rr(ctx, LB.x - 8, LB.y - 8, LB.w + 16, LB.h + 16, 14); ctx.fill(); ctx.stroke();
    if (o.logo) drawContain(ctx, o.logo, LB.x + 6, LB.y + 6, LB.w - 12, LB.h - 12);
    else {
      const s = fit(ctx, acad, LB.w - 10, 26, T.font, T.fontWeight, 10);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; font(ctx, s, T.font, T.fontWeight);
      ctx.fillText(acad, LB.x + LB.w / 2, LB.y + LB.h / 2);
    }

    ctx.restore();
  }

  function spaced(name) {
    // 2~4글자 한글 이름은 원본 도안처럼 자간을 띄운다
    return /^[가-힣]{2,4}$/.test(name) ? name.split('').join(' ') : name;
  }

  function drawTitle(ctx, title, cx, cy, maxW, T, ink) {
    const parts = title.split('+');
    let s = 27;
    const measure = () => {
      font(ctx, s, T.font, T.fontWeight);
      const tw = parts.reduce((a, p) => a + ctx.measureText(p).width, 0);
      return tw + (parts.length - 1) * (s * .95);
    };
    let w = measure();
    while (w > maxW && s > 10) { s -= .5; w = measure(); }
    let x = cx - w / 2;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = ink;
    parts.forEach((p, i) => {
      font(ctx, s, T.font, T.fontWeight);
      ctx.fillText(p, x, cy + 1);
      x += ctx.measureText(p).width;
      if (i < parts.length - 1) { cross(ctx, x + s * .475, cy, s * .78, ink); x += s * .95; }
    });
  }

  // 캔버스 렌더 전에 쓰는 글꼴과 글자를 미리 받아 둔다(구글 폰트는 글자 단위로 쪼개져 있음)
  async function ensureFonts(o, names) {
    const T = TONES[o.tone] || TONES.cute;
    const text = [o.title, o.academy, o.dose, o.chk1, o.chk2, o.msg, o.per, o.unit, '용 법 님', ...(names || [])].join('');
    const fams = new Set([T.font, T.nameFont, 'Pretendard Variable']);
    await Promise.all([...fams].flatMap(f => [
      document.fonts.load(`400 20px "${f}"`, text),
      document.fonts.load(`700 20px "${f}"`, text),
      document.fonts.load(`500 20px "${f}"`, text),
    ])).catch(() => {});
  }

  window.Envelope = { PAGE, TONES, draw, ensureFonts, recolor, hexToRgb, rgbToHex, lum };
})();
