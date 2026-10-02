(function () {
  const E = window.Envelope;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const DPI = 200;
  const SAMPLE = '김크래';

  const PRESETS = ['#0B9444', '#FB75BB', '#2F6BFF', '#FF7A30', '#7B5CFF', '#E8455A', '#00A7A0', '#F5B700', '#8B5E3C', '#16192A'];

  const state = {
    logo: null, color: '#0B9444', tone: 'cute', variant: 0, strength: .8,
    mode: 'type', names: ['', '', '', '', ''], blankCount: 20, aiArt: null,
  };

  // ---------- 일러스트 미리 받기 ----------
  const arts = {};
  const artReady = Promise.all(Object.keys(E.TONES).flatMap(t => [1, 2].map(i => new Promise(res => {
    const img = new Image();
    img.onload = () => { (arts[t] = arts[t] || [])[i - 1] = img; res(); };
    img.onerror = res;
    img.src = `art/${t}${i}.png`;
  }))));

  function opts() {
    const ai = state.aiArt && state.aiArt.tone === state.tone ? state.aiArt : null;
    return {
      color: state.color, tone: state.tone, strength: state.strength,
      art: ai ? ai.canvas : (arts[state.tone] || [])[state.variant],
      artRaw: !!ai,
      logo: state.logo,
      academy: $('#academy').value.trim(),
      title: $('#title').value.trim(),
      per: $('#per').value.trim(), dose: $('#dose').value.trim(), unit: $('#unit').value.trim(),
      chk1: $('#chk1').value.trim(), chk2: $('#chk2').value.trim(),
      msg: $('#msg').value.trim(),
    };
  }

  function pages() {
    if (state.mode === 'blank') return Array(Math.max(1, Math.min(300, +$('#blankCount').value || 1))).fill('');
    return state.names.map(n => n.trim()).filter(Boolean);
  }

  // ---------- 실시간 미리보기 ----------
  let liveTimer = null;
  function renderLive() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(async () => {
      await artReady;
      const o = opts(); const ps = pages();
      const name = state.mode === 'blank' ? '' : (ps[0] || SAMPLE);
      await E.ensureFonts(o, [name]);
      const cv = $('#live');
      const s = cv.width / E.PAGE.w;
      cv.height = Math.round(E.PAGE.h * s);
      E.draw(cv.getContext('2d'), s, o, name);
      $('#liveLabel').textContent = state.mode === 'blank' ? '이름 칸 비움 | A4 가로' : (ps[0] ? `${ps[0]} 학생 | 총 ${ps.length}장` : '예시 이름으로 보여드려요');
      renderTones();
    }, 60);
  }

  function renderTones() {
    for (const t of Object.keys(E.TONES)) {
      const cv = document.querySelector(`.tone[data-t="${t}"] canvas`);
      const img = (arts[t] || [])[state.variant] || (arts[t] || [])[0];
      if (!cv || !img) continue;
      const art = E.recolor(img, state.color, state.strength);
      const x = cv.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
      x.drawImage(art, 0, 0, cv.width, cv.height);
    }
  }

  // ---------- 1. 로고 ----------
  $('#logoDrop').addEventListener('click', e => { if (e.target.id !== 'logoFile') $('#logoFile').click(); });
  ['dragover', 'dragenter'].forEach(ev => $('#logoDrop').addEventListener(ev, e => e.preventDefault()));
  $('#logoDrop').addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadLogo(f); });
  $('#logoFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadLogo(f); e.target.value = ''; });
  $('#logoClear').addEventListener('click', () => {
    state.logo = null;
    $('#logoThumb').innerHTML = '+'; $('#logoTitle').textContent = '학원 로고 올리기';
    $('#logoClear').style.display = 'none'; $('#fromLogo').style.display = 'none';
    renderLive();
  });

  function loadLogo(file) {
    if (!file.type.startsWith('image/')) return toast('이미지 파일만 올릴 수 있어요');
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.logo = img;
        $('#logoThumb').innerHTML = ''; $('#logoThumb').appendChild(img.cloneNode());
        $('#logoTitle').textContent = file.name.length > 24 ? file.name.slice(0, 22) + '...' : file.name;
        $('#logoClear').style.display = '';
        const cols = logoColors(img);
        if (cols.length) {
          $('#fromLogo').style.display = '';
          $('#logoSwatches').innerHTML = '';
          cols.forEach(c => $('#logoSwatches').appendChild(swatch(c)));
          setColor(cols[0]);
          toast('로고에서 브랜드 컬러를 찾아 적용했어요');
        }
        renderLive();
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  // 로고에서 채도 있는 대표색 최대 3개 뽑기(흰색, 검정, 회색은 제외)
  function logoColors(img) {
    const c = document.createElement('canvas'); const S = 80;
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const iw = img.naturalWidth, ih = img.naturalHeight, k = Math.min(S / iw, S / ih);
    x.drawImage(img, 0, 0, iw * k, ih * k);
    let d; try { d = x.getImageData(0, 0, S, S).data; } catch (e) { return []; }
    const bins = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 240 && mn > 225) continue;
      if (mx < 30) continue;
      if (mx - mn < 28) continue;
      const key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
      const v = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      v.n++; v.r += r; v.g += g; v.b += b; bins.set(key, v);
    }
    const sorted = [...bins.values()].sort((a, b) => b.n - a.n);
    const out = [];
    for (const v of sorted) {
      const c = [v.r / v.n, v.g / v.n, v.b / v.n];
      if (out.some(o => { const p = E.hexToRgb(o); return Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) < 90; })) continue;
      out.push(E.rgbToHex(c));
      if (out.length === 3) break;
    }
    return out;
  }

  // ---------- 2. 컬러 ----------
  function swatch(c) {
    const b = document.createElement('button');
    b.className = 'sw'; b.style.background = c; b.dataset.c = c.toLowerCase(); b.title = c;
    b.addEventListener('click', () => setColor(c));
    return b;
  }
  function setColor(c) {
    state.color = c.toLowerCase();
    $$('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === state.color));
    renderLive();
  }
  PRESETS.forEach(c => $('#swatches').appendChild(swatch(c)));
  const pick = document.createElement('label');
  pick.className = 'sw pick'; pick.title = '직접 고르기';
  pick.innerHTML = '<input type="color" value="#0b9444">';
  pick.querySelector('input').addEventListener('input', e => setColor(e.target.value));
  $('#swatches').appendChild(pick);

  // ---------- 3. 톤 ----------
  for (const [t, v] of Object.entries(E.TONES)) {
    const d = document.createElement('div');
    d.className = 'tone' + (t === state.tone ? ' on' : ''); d.dataset.t = t;
    d.innerHTML = `<canvas width="150" height="210"></canvas><span>${v.label}</span><small>${v.sub}</small>`;
    d.addEventListener('click', () => { state.tone = t; $$('.tone').forEach(x => x.classList.toggle('on', x === d)); renderLive(); });
    $('#tones').appendChild(d);
  }
  $$('#variantSeg button').forEach(b => b.addEventListener('click', () => {
    state.variant = +b.dataset.v; state.aiArt = null;
    $$('#variantSeg button').forEach(x => x.classList.toggle('on', x === b));
    renderLive();
  }));
  $('#artStrength').addEventListener('input', e => {
    state.strength = e.target.value / 100; $('#artStrengthV').textContent = e.target.value + '%'; renderLive();
  });

  // 실시간 AI(선택): config.js 에 프록시 주소가 있을 때만 켠다
  if (window.CONFIG && CONFIG.aiEndpoint) {
    $('#aiBox').style.display = 'block';
    $('#aiBtn').addEventListener('click', async () => {
      const btn = $('#aiBtn'); btn.disabled = true; $('#aiHint').textContent = 'AI가 그리는 중이에요. 20초 정도 걸려요.';
      try {
        const r = await fetch(CONFIG.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tone: state.tone, color: state.color }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || '실패');
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = j.dataUrl; });
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        state.aiArt = { tone: state.tone, canvas: c };
        $('#aiHint').textContent = '새 그림을 입혔어요. 그림 A, B를 누르면 기본 그림으로 돌아가요.';
        renderLive();
      } catch (e) {
        $('#aiHint').textContent = '지금은 AI 그림을 만들 수 없어요. 기본 그림으로 진행해 주세요. (' + e.message + ')';
      } finally { btn.disabled = false; }
    });
  }

  // ---------- 4. 문구 ----------
  ['academy', 'title', 'per', 'dose', 'unit', 'chk1', 'chk2', 'msg'].forEach(id => $('#' + id).addEventListener('input', renderLive));

  // ---------- 5. 이름 ----------
  $$('#nameTabs button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.m)));
  function setMode(m) {
    state.mode = m === 'blank' ? 'blank' : (m === 'excel' ? 'excel' : 'type');
    $$('#nameTabs button').forEach(x => x.classList.toggle('on', x.dataset.m === m));
    $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== m);
    renderLive();
  }

  function renderRows(focusIdx) {
    const tb = $('#nameRows'); tb.innerHTML = '';
    state.names.forEach((n, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="no">${i + 1}</td><td><input type="text" maxlength="12" placeholder="이름 입력"></td><td class="del"><button title="삭제">×</button></td>`;
      const inp = tr.querySelector('input'); inp.value = n;
      inp.addEventListener('input', () => { state.names[i] = inp.value; updateCount(); renderLive(); });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); if (i === state.names.length - 1) state.names.push(''); renderRows(i + 1); }
      });
      inp.addEventListener('paste', e => {
        const t = (e.clipboardData || window.clipboardData).getData('text');
        const list = t.split(/[\r\n\t,]+/).map(s => s.trim()).filter(Boolean);
        if (list.length > 1) {
          e.preventDefault();
          state.names.splice(i, 1, ...list);
          compact(); renderRows(); renderLive(); toast(`${list.length}명을 넣었어요`);
        }
      });
      tr.querySelector('button').addEventListener('click', () => {
        state.names.splice(i, 1); if (!state.names.length) state.names.push('');
        renderRows(); renderLive();
      });
      tb.appendChild(tr);
    });
    updateCount();
    if (focusIdx != null) { const ins = tb.querySelectorAll('input'); ins[focusIdx] && ins[focusIdx].focus(); }
  }
  function compact() {
    const filled = state.names.map(s => s.trim()).filter(Boolean);
    state.names = filled.concat(['']);
  }
  function updateCount() {
    const n = state.names.filter(s => s.trim()).length;
    $('#nameCount').innerHTML = `입력한 학생 <b>${n}</b>명`;
  }
  $('#addRow').addEventListener('click', () => { state.names.push(''); renderRows(state.names.length - 1); });
  $('#blankCount').addEventListener('input', renderLive);

  $('#dlTemplate').addEventListener('click', () => {
    const rows = [['번호', '학생 이름'], [1, '(예시) 김크래빗'], [2, '(예시) 이토끼']];
    for (let i = 3; i <= 60; i++) rows.push([i, '']);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '학생 명단');
    XLSX.writeFile(wb, '약봉투_학생명단_양식.xlsx');
  });
  $('#excelFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      let hr = aoa.findIndex(r => r.some(c => String(c).includes('이름')));
      let col = hr >= 0 ? aoa[hr].findIndex(c => String(c).includes('이름')) : -1;
      if (col < 0) { // 머리글이 없으면 글자가 가장 많은 열
        hr = -1;
        const cnt = {}; aoa.forEach(r => r.forEach((c, j) => { if (/[가-힣a-zA-Z]/.test(String(c))) cnt[j] = (cnt[j] || 0) + 1; }));
        col = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 0;
      }
      const list = aoa.slice(hr + 1).map(r => String(r[col] || '').trim()).filter(s => s && !s.startsWith('(예시)'));
      if (!list.length) { $('#excelResult').textContent = '이름을 찾지 못했어요. 양식의 "학생 이름" 칸을 채워서 올려 주세요.'; return; }
      state.names = list.concat(['']);
      renderRows();
      $('#excelResult').innerHTML = `<b>${list.length}명</b>을 불러왔어요. 직접 입력 표에서 고칠 수 있어요.`;
      setMode('type');
      toast(`엑셀에서 ${list.length}명을 불러왔어요`);
    } catch (err) {
      $('#excelResult').textContent = '파일을 읽지 못했어요. 양식(.xlsx)으로 다시 올려 주세요.';
    }
  });

  // ---------- 전체 미리보기 ----------
  let pvIdx = 0;
  function pvPages() { return pages(); }
  function openPreview() {
    const ps = pvPages();
    if (!ps.length) return toast('학생 이름을 한 명 이상 넣어 주세요');
    pvIdx = Math.min(pvIdx, ps.length - 1);
    $('#modal').classList.add('on'); document.body.style.overflow = 'hidden';
    renderPv();
  }
  function closePreview() { $('#modal').classList.remove('on'); document.body.style.overflow = ''; renderRows(); renderLive(); }
  async function renderPv() {
    const ps = pvPages();
    if (!ps.length) return closePreview();
    pvIdx = Math.max(0, Math.min(pvIdx, ps.length - 1));
    const o = opts();
    await E.ensureFonts(o, ps);
    const cv = $('#pvCanvas'); const s = cv.width / E.PAGE.w;
    E.draw(cv.getContext('2d'), s, o, ps[pvIdx]);
    $('#pvPos').textContent = `${pvIdx + 1} / ${ps.length}`;
    $('#pvCount').textContent = `| 총 ${ps.length}장`;
    const blank = state.mode === 'blank';
    $('#pvEditWrap').style.display = blank ? 'none' : 'flex';
    $('#pvName').value = ps[pvIdx];
    const list = $('#pvList'); list.innerHTML = '';
    ps.forEach((n, i) => {
      const b = document.createElement('button');
      b.className = i === pvIdx ? 'on' : '';
      b.innerHTML = `<i>${i + 1}</i>${blank ? '이름 칸 비움' : escapeHtml(n)}`;
      b.addEventListener('click', () => { pvIdx = i; renderPv(); });
      list.appendChild(b);
    });
  }
  function filledIndex(i) { // pages()의 i번째가 state.names 어디인지
    let k = -1;
    for (let j = 0; j < state.names.length; j++) if (state.names[j].trim() && ++k === i) return j;
    return -1;
  }
  $('#pvName').addEventListener('change', () => {
    const j = filledIndex(pvIdx); const v = $('#pvName').value.trim();
    if (j < 0) return;
    if (v) state.names[j] = v; else state.names.splice(j, 1);
    renderPv();
  });
  $('#pvDel').addEventListener('click', () => {
    const j = filledIndex(pvIdx); if (j < 0) return;
    state.names.splice(j, 1); if (!state.names.length) state.names.push('');
    renderPv();
  });
  $('#pvPrev').addEventListener('click', () => { pvIdx--; if (pvIdx < 0) pvIdx = pvPages().length - 1; renderPv(); });
  $('#pvNext').addEventListener('click', () => { pvIdx = (pvIdx + 1) % pvPages().length; renderPv(); });
  document.addEventListener('keydown', e => {
    if (!$('#modal').classList.contains('on') || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') $('#pvNext').click();
    if (e.key === 'ArrowLeft') $('#pvPrev').click();
    if (e.key === 'Escape') closePreview();
  });
  $('#openPreview').addEventListener('click', openPreview);
  $('#pvClose').addEventListener('click', closePreview);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closePreview(); });

  // ---------- 내보내기 ----------
  let busy = false;
  async function build(kind) {
    if (busy) return;
    const ps = pages();
    if (!ps.length) return toast('학생 이름을 한 명 이상 넣어 주세요');
    busy = true;
    const bars = [$('#prog'), $('#prog2')];
    bars.forEach(b => { b.classList.add('on'); b.firstElementChild.style.width = '0%'; });
    const btns = $$('#dlZip,#dlPdf,#pvZip,#pvPdf'); btns.forEach(b => b.disabled = true);
    try {
      await artReady;
      const o = opts();
      await E.ensureFonts(o, ps);
      const { jsPDF } = window.jspdf;
      const W = E.PAGE.w, H = E.PAGE.h;
      const s = DPI / 72;
      const cv = document.createElement('canvas');
      cv.width = Math.round(W * s); cv.height = Math.round(H * s);
      const ctx = cv.getContext('2d');
      const all = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [W, H], compress: true });
      const zip = kind === 'zip' ? new JSZip() : null;
      const folder = zip ? zip.folder('학생별') : null;
      const used = {};
      for (let i = 0; i < ps.length; i++) {
        E.draw(ctx, s, o, ps[i]);
        const jpg = cv.toDataURL('image/jpeg', .92);
        if (i) all.addPage([W, H], 'landscape');
        all.addImage(jpg, 'JPEG', 0, 0, W, H, undefined, 'FAST');
        if (folder) {
          const one = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [W, H] });
          one.addImage(jpg, 'JPEG', 0, 0, W, H, undefined, 'FAST');
          let base = `${String(i + 1).padStart(2, '0')}_${safe(ps[i] || '이름칸비움')}`;
          used[base] = (used[base] || 0) + 1;
          folder.file(base + '.pdf', one.output('arraybuffer'));
        }
        bars.forEach(b => b.firstElementChild.style.width = Math.round((i + 1) / ps.length * 90) + '%');
        if (i % 2 === 1) await new Promise(r => setTimeout(r, 0));
      }
      const acad = safe(o.academy || '우리학원');
      if (zip) {
        zip.file(`${acad}_간식약봉투_전체인쇄용_${ps.length}장.pdf`, all.output('arraybuffer'));
        zip.file('인쇄 안내.txt', [
          '시험기간 간식 약봉투 인쇄 안내',
          '',
          '1. A4 용지, 가로 방향으로 인쇄해 주세요.',
          '2. 인쇄 배율은 반드시 "실제 크기" 또는 "100%"로 골라 주세요. ("용지에 맞춤"을 고르면 봉투 크기가 줄어요)',
          '3. 실선을 따라 자르고, 점선을 따라 접어 주세요.',
          '4. 옆 날개와 아래 날개에 풀을 발라 붙이면 완성!',
          '',
          '완성 크기: 117 x 161mm',
          '만든 곳: 크래빗 (instagram @crabit_official)',
        ].join('\r\n'));
        const blob = await zip.generateAsync({ type: 'blob' }, m => bars.forEach(b => b.firstElementChild.style.width = (90 + m.percent / 10) + '%'));
        saveBlob(blob, `${acad}_간식약봉투.zip`);
      } else {
        all.save(`${acad}_간식약봉투_${ps.length}장.pdf`);
      }
      bars.forEach(b => b.firstElementChild.style.width = '100%');
      toast(`${ps.length}장 완성! 다운로드 폴더를 확인해 주세요`);
    } catch (e) {
      console.error(e);
      toast('만드는 중에 문제가 생겼어요. 새로고침 후 다시 시도해 주세요');
    } finally {
      busy = false;
      btns.forEach(b => b.disabled = false);
      setTimeout(() => bars.forEach(b => b.classList.remove('on')), 1200);
    }
  }
  $('#dlZip').addEventListener('click', () => build('zip'));
  $('#pvZip').addEventListener('click', () => build('zip'));
  $('#dlPdf').addEventListener('click', () => build('pdf'));
  $('#pvPdf').addEventListener('click', () => build('pdf'));

  // ---------- 도구 ----------
  function safe(s) { return String(s).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  let tt = null;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }

  // ---------- 시작 ----------
  setColor(state.color);
  renderRows();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderLive);
  artReady.then(renderLive);
})();
