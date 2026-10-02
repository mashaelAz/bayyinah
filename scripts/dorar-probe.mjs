// فحص الاتصال بالدرر من الخادم بعدة صيغ للطلب، لمعرفة الصيغة المقبولة
// التشغيل: node scripts/dorar-probe.mjs
const url = 'https://dorar.net/dorar_api.json?skey=' + encodeURIComponent('الدين النصيحة');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0';
const variants = {
  A_bare: {},
  B_ua: { 'User-Agent': UA },
  C_current: { Accept: 'application/json, text/javascript, */*; q=0.01', 'Accept-Language': 'ar,en;q=0.8', Referer: 'https://dorar.net/', 'User-Agent': UA },
  D_browser: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'User-Agent': UA,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  },
  E_bot: { 'User-Agent': 'BayyinahBot/1.0 (+https://github.com/)', Accept: '*/*' },
  F_curlish: { 'User-Agent': 'curl/8.4.0', Accept: '*/*' },
};
for (const [name, headers] of Object.entries(variants)) {
  try {
    const r = await fetch(url, { headers });
    const t = await r.text();
    console.log(name, r.status, r.headers.get('server') || '', r.headers.get('content-type') || '', '|', t.slice(0, 60).replace(/\s+/g, ' '));
  } catch (e) {
    console.log(name, 'ERROR', e.message);
  }
}
