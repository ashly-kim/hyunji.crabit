(function () {
  const E = window.Envelope;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const DPI = 200;
  const SAMPLE = '김래빗';


  const state = {
    logo: null, design: 'pink', nameFont: 'Pretendard Variable', acadMode: 'logo', acadFont: 'Jua',
    mode: 'type', names: ['', '', '', '', ''], blankCount: 20,
  };

  // ---------- 일러스트(1종) 미리 받기 ----------
  const arts = {};
  const artReady = Promise.all(Object.entries(E.THEMES).filter(([, t]) => t.art).map(([k, t]) => new Promise(res => {
    const img = new Image();
    img.onload = () => { arts[k] = img; res(); };
    img.onerror = res;
    img.src = t.art;
  })));

  function opts() {
    return {
      design: state.design, art: arts[state.design], nameFont: state.nameFont,
      acadMode: state.acadMode, acadFont: state.acadFont,
      logo: state.logo,
      academy: $('#academy').value.trim(),
      titleL: $('#titleL').value.trim(), titleR: $('#titleR').value.trim(),
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
  let thumbTimer = null;
  function renderLive() {
    clearTimeout(thumbTimer); thumbTimer = setTimeout(renderDesigns, 400);
    clearTimeout(liveTimer);
    liveTimer = setTimeout(async () => {
      await artReady;
      const o = opts(); const ps = pages();
      const name = state.mode === 'blank' ? '' : (ps[0] || SAMPLE);
      await E.ensureFonts(o, [name]);
      const cv = $('#live');
      const s = cv.width / E.PAGE.w;
      cv.height = Math.round(E.PAGE.h * s);
      E.draw(cv.getContext('2d'), s, o, name, 0);
      $('#liveLabel').textContent = state.mode === 'blank' ? '이름 칸 비움 | A4 가로' : (ps[0] ? `${ps[0]} 학생 | 총 ${ps.length}장` : '예시 이름으로 보여드려요');
    }, 60);
  }

  // ---------- 1. 로고 ----------
  $('#logoDrop').addEventListener('click', e => { if (e.target.id !== 'logoFile') $('#logoFile').click(); });
  ['dragover', 'dragenter'].forEach(ev => $('#logoDrop').addEventListener(ev, e => e.preventDefault()));
  $('#logoDrop').addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadLogo(f); });
  $('#logoFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadLogo(f); e.target.value = ''; });
  $('#logoClear').addEventListener('click', () => {
    state.logo = null;
    $('#logoThumb').innerHTML = '+'; $('#logoTitle').textContent = '학원 로고 올리기';
    $('#logoClear').style.display = 'none';
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
        renderLive();
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  // ---------- 2. 디자인 ----------
  async function renderDesigns() {
    await artReady;
    const box = $('#designs');
    if (!box.children.length) {
      Object.entries(E.THEMES).forEach(([k, t]) => {
        const b = document.createElement('button');
        b.className = 'design'; b.dataset.d = k;
        b.innerHTML = `<canvas width="232" height="320"></canvas><b>${t.label}</b><span>${t.sub}</span>`;
        b.addEventListener('click', () => { state.design = k; renderDesigns(); renderLive(); });
        box.appendChild(b);
      });
    }
    // 썸네일: 봉투 전체를 그린 뒤 앞면만 잘라서 보여 준다
    const tmp = document.createElement('canvas'); const sc = 1.6;
    tmp.width = Math.round(E.PAGE.w * sc); tmp.height = Math.round(E.PAGE.h * sc);
    for (const b of box.children) {
      const k = b.dataset.d;
      b.classList.toggle('on', k === state.design);
      const o = { ...opts(), design: k, art: arts[k] };
      await E.ensureFonts(o, [sampleName()]);
      E.draw(tmp.getContext('2d'), sc, o, state.mode === 'blank' ? '' : sampleName(), 0);
      const cv = b.querySelector('canvas'), F = E.FRONT;
      cv.getContext('2d').drawImage(tmp, F.x * sc, F.y * sc, F.w * sc, F.h * sc, 0, 0, cv.width, cv.height);
    }
  }

  // ---------- 이름 폰트 ----------
  function sampleName() { return state.names.map(n => n.trim()).find(Boolean) || SAMPLE; }
  function fontGrid(box, sample, current, onPick) {
    box.innerHTML = '';
    E.NAME_FONTS.forEach(f => {
      const b = document.createElement('button');
      b.className = 'fontbtn' + (f.id === current ? ' on' : '');
      b.innerHTML = `<b style="font-family:'${f.id}';font-weight:${f.weight}">${escapeHtml(sample)}</b><span>${f.label}</span>`;
      b.addEventListener('click', () => { onPick(f.id); renderFonts(); renderLive(); });
      box.appendChild(b);
    });
  }
  function renderFonts() {
    fontGrid($('#fonts'), sampleName(), state.nameFont, id => state.nameFont = id);
    fontGrid($('#acadFonts'), $('#academy').value.trim() || '우리학원', state.acadFont, id => state.acadFont = id);
  }

  // ---------- 1. 학원: 로고 / 이름 토글 ----------
  $$('#acadTabs button').forEach(b => b.addEventListener('click', () => {
    state.acadMode = b.dataset.a;
    $$('#acadTabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('[data-apane]').forEach(p => p.hidden = p.dataset.apane !== state.acadMode);
    renderLive();
  }));

  // ---------- 4. 문구 ----------
  const FIELDS = ['academy', 'titleL', 'titleR', 'per', 'dose', 'unit', 'chk1', 'chk2', 'msg'];
  // 글자 수 제한 표시: "3/10자"
  function updateLimits() {
    $$('.lim').forEach(el => {
      const inp = $('#' + el.dataset.for); const n = [...inp.value].length, m = inp.maxLength;
      el.textContent = `${n}/${m}자`;
      el.classList.toggle('full', n >= m);
    });
  }
  FIELDS.forEach(id => $('#' + id).addEventListener('input', () => {
    updateLimits(); renderLive();
    if (id === 'academy') renderFonts();
  }));

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
      inp.addEventListener('input', () => { state.names[i] = inp.value; updateCount(); renderLive(); if (i === filledFirst()) renderFonts(); });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); if (i === state.names.length - 1) state.names.push(''); renderRows(i + 1); }
      });
      inp.addEventListener('paste', e => {
        const t = (e.clipboardData || window.clipboardData).getData('text');
        const list = t.split(/[\r\n\t,]+/).map(s => s.trim()).filter(Boolean);
        if (list.length > 1) {
          e.preventDefault();
          state.names.splice(i, 1, ...list);
          compact(); renderRows(); renderFonts(); renderLive(); toast(`${list.length}명을 넣었어요`);
        }
      });
      tr.querySelector('button').addEventListener('click', () => {
        state.names.splice(i, 1); if (!state.names.length) state.names.push('');
        renderRows(); renderLive();
      });
      tb.appendChild(tr);
    });
    // 표 맨 아래 줄: 누르면 한 줄 추가
    const add = document.createElement('tr');
    add.className = 'addrow';
    add.innerHTML = '<td class="no"><span class="plus">+</span></td><td colspan="2">한 줄 추가</td>';
    add.addEventListener('click', addRow);
    tb.appendChild(add);
    updateCount();
    if (focusIdx != null) { const ins = tb.querySelectorAll('input'); ins[focusIdx] && ins[focusIdx].focus(); }
  }
  function filledFirst() { return state.names.findIndex(n => n.trim()); }
  function compact() {
    const filled = state.names.map(s => s.trim()).filter(Boolean);
    state.names = filled.concat(['']);
  }
  function updateCount() {
    const n = state.names.filter(s => s.trim()).length;
    $('#nameCount').innerHTML = `입력한 학생 <b>${n}</b>명`;
  }
  function addRow() {
    state.names.push(''); renderRows(state.names.length - 1);
    const box = $('.names'); box.scrollTop = box.scrollHeight;
  }
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
      renderRows(); renderFonts();
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
    E.draw(cv.getContext('2d'), s, o, ps[pvIdx], pvIdx);
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
    if (state.acadMode === 'logo' && !state.logo) return toast('학원 로고를 올리거나 "이름 글자로 쓰기"를 골라 주세요');
    busy = true;
    const bars = [$('#prog'), $('#prog2')];
    bars.forEach(b => { b.classList.add('on'); b.firstElementChild.style.width = '0%'; });
    const btns = $$('#dlZip,#dlPdf,#pvZip,#pvPdf'); btns.forEach(b => b.disabled = true);
    try {
      await artReady;
      const o = opts();
      await E.ensureFonts(o, ps);
      const { jsPDF } = window.jspdf;
      const W = 841.89, H = 595.28; // 정확한 A4 가로. 도안 좌표와 0.04% 차이라 크기 변화 없음
      const s = DPI / 72;
      const cv = document.createElement('canvas');
      cv.width = Math.round(W * s); cv.height = Math.round(H * s);
      const ctx = cv.getContext('2d');
      const all = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [W, H], compress: true });
      const zip = kind === 'zip' ? new JSZip() : null;
      const folder = zip ? zip.folder('학생별') : null;
      const used = {};
      for (let i = 0; i < ps.length; i++) {
        E.draw(ctx, s, o, ps[i], i);
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
      const acad = safe((state.acadMode === 'name' && o.academy) || '우리학원');
      if (zip) {
        zip.file(`${acad}_간식약봉투_전체인쇄용_${ps.length}장.pdf`, all.output('arraybuffer'));
        zip.file('인쇄 안내.txt', [
          '시험기간 간식 약봉투 인쇄 안내',
          '',
          '1. A4 용지, 가로 방향으로 인쇄해 주세요. 120~150g 두꺼운 종이를 쓰면 더 튼튼해요(일반 80g 복사용지도 가능).',
          '2. 인쇄 배율은 반드시 "실제 크기" 또는 "100%"로 골라 주세요. ("용지에 맞춤"을 고르면 봉투가 작아져요)',
          '3. 바깥 실선을 따라 잘라 주세요. 선 밖으로 색이 2mm 더 칠해져 있어서 조금 삐뚤게 잘라도 흰 테가 안 생겨요.',
          '4. 옆 날개와 아래 날개를 점선에서 안쪽(그림이 없는 뒷면 쪽)으로 접어 주세요.',
          '5. 가운데 점선을 그림이 바깥으로 오게 반으로 접고, 두 날개에 풀을 발라 앞면 안쪽에 붙여 주세요.',
          '6. 위쪽이 열린 입구예요. 간식을 넣고 스테이플러나 스티커로 닫으면 완성!',
          '',
          '완성 크기: 117 x 161mm',
          '만든 곳: 크래빗 (instagram @hyunji.crabit)',
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
  renderRows();
  renderFonts();
  updateLimits();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderLive);
  artReady.then(renderLive);
})();
