// 실시간 AI 그림용 Cloudflare Worker (선택 기능)
// 힉스필드 키를 브라우저에 노출하지 않으려고 이 Worker가 대신 호출한다.
//
// 배포
//   npx wrangler login
//   npx wrangler deploy worker/hf-proxy.js --name snack-envelope-ai --compatibility-date 2026-10-01
//   npx wrangler secret put HF_KEY      (값: 키ID:시크릿)
// 배포 후 나온 주소를 ../config.js 의 aiEndpoint 에 넣는다.
//
// 비용 보호: 같은 IP는 하루 3장까지(Worker 메모리 기준, 인스턴스가 바뀌면 초기화됨),
// 허용한 사이트(ALLOW_ORIGIN)에서 온 요청만 받는다. 장당 약 $0.035.

const ALLOW_ORIGIN = 'https://ashly-kim.github.io';
const DAILY_LIMIT = 3;
const MODEL = 'recraft/v4.1/text-to-image';

const PROMPTS = {
  cute: 'Cute kawaii flat vector doodles of smiling pills, capsules, candies, cookies, lollipops, tiny stars and hearts, thick rounded outlines, sticker style.',
  clean: 'Minimal modern line icons of capsules, medicine crosses, small dots and plus signs, thin uniform stroke, generous spacing, Scandinavian minimal style.',
  retro: 'Retro vintage pharmacy label style ornaments: medicine bottles, pill boxes, apothecary crosses, starbursts, simple stripes, 1970s flat print style.',
  hand: 'Warm hand-drawn crayon and pencil doodles of pills, candies, tea cups, little clouds, stars and hearts, childlike sketchy lines, cozy feeling.',
  pop: 'Bold pop art style shapes: big capsules, lightning bolts, sparkles, burst stars and squiggles, thick heavy outlines, energetic Y2K sticker style.',
};
const FRAME = ' Arranged only along the outer edges as a decorative border frame, with a large completely empty plain white area in the center (at least 70% of the canvas). No text, no letters, no numbers, no words.';

const hits = new Map();

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOW_ORIGIN || origin.startsWith('http://localhost') ? origin : ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(body, status, h) { return new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } }); }
function hexToRgb(h) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lighten(c, t) { return c.map(v => Math.round(v + (255 - v) * t)); }

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, h);
    if (origin !== ALLOW_ORIGIN && !origin.startsWith('http://localhost')) return json({ error: '허용되지 않은 사이트' }, 403, h);

    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    const day = new Date().toISOString().slice(0, 10);
    const k = ip + day;
    const n = hits.get(k) || 0;
    if (n >= DAILY_LIMIT) return json({ error: '오늘은 AI 그림을 모두 만들었어요. 내일 다시 시도해 주세요' }, 429, h);

    let body; try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
    const tone = PROMPTS[body.tone] ? body.tone : 'cute';
    if (!/^#[0-9a-fA-F]{6}$/.test(body.color || '')) return json({ error: 'bad color' }, 400, h);
    const c = hexToRgb(body.color);

    const auth = { Authorization: 'Key ' + env.HF_KEY, 'Content-Type': 'application/json' };
    const sub = await fetch(`https://api.higgsfield.ai/${MODEL}`, {
      method: 'POST', headers: { ...auth, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        prompt: PROMPTS[tone] + FRAME, resolution: '1k', aspect_ratio: '10:14', output_format: 'png',
        colors: [{ rgb: c }, { rgb: lighten(c, .55) }], background_color: { rgb: [255, 255, 255] },
      }),
    });
    if (!sub.ok) return json({ error: 'AI 요청 실패 ' + sub.status }, 502, h);
    hits.set(k, n + 1);
    const { request_id } = await sub.json();

    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const st = await (await fetch(`https://api.higgsfield.ai/requests/${request_id}/status`, { headers: auth })).json();
      if (st.status === 'completed') {
        const img = await fetch(st.images[0].url);
        const buf = new Uint8Array(await img.arrayBuffer());
        let bin = ''; for (let j = 0; j < buf.length; j += 0x8000) bin += String.fromCharCode(...buf.subarray(j, j + 0x8000));
        return json({ dataUrl: 'data:image/png;base64,' + btoa(bin) }, 200, h);
      }
      if (['failed', 'nsfw', 'canceled'].includes(st.status)) return json({ error: 'AI 생성 실패' }, 502, h);
    }
    return json({ error: '시간 초과' }, 504, h);
  },
};
