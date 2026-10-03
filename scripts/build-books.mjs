// بناء data/books.json من نسخة الكتب الستة في مشروع hadith-api (ملكية عامة، مأخوذ من Sunnah.com)
// الاستخدام:
//   git clone --depth 1 --filter=blob:none --sparse --branch 1 https://github.com/fawazahmed0/hadith-api
//   (cd hadith-api && git sparse-checkout set --no-cone '/editions/ara-*.min.json')
//   node scripts/build-books.mjs ./hadith-api/editions
//
// كل صف: [رمز الكتاب, رقم الحديث, المتن, الحكم, صاحب الحكم]
// الصحيحان: الحكم «صحيح» لأنهما من الصحيح المعتمد. السنن: حكم الألباني كما في المصدر
// (مترجمًا من اختصاره الإنجليزي إلى لفظه العربي المعروف)، وإن غاب فحكم محقق آخر من المصدر نفسه.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('حدد مجلد editions');
  process.exit(1);
}

const BOOKS = [
  ['b', 'bukhari'],
  ['m', 'muslim'],
  ['d', 'abudawud'],
  ['t', 'tirmidhi'],
  ['n', 'nasai'],
  ['i', 'ibnmajah'],
];

const GRADERS = [
  ['Al-Albani', 'الألباني'],
  ['Shuaib Al Arnaut', 'شعيب الأرناؤوط'],
  ['Ahmad Muhammad Shakir', 'أحمد شاكر'],
  ['Bashar Awad Maarouf', 'بشار عواد معروف'],
];

/** يحوّل اختصار الحكم الإنجليزي في المصدر إلى لفظه العربي، كلمةً كلمة، دون أي ترجيح */
function gradeAr(en) {
  let g = ` ${en.trim().replace(/\s+/g, ' ')} `;
  const pairs = [
    [/ Very Daif /gi, ' ضعيف جدا '],
    [/ Hasan Sahih /gi, ' حسن صحيح '],
    [/ Sahih /gi, ' صحيح '],
    [/ Hasan /gi, ' حسن '],
    [/ (Daif|Da'if|Sanad Daif) /gi, ' ضعيف '],
    [/ (Mawdu|Maudu) /gi, ' موضوع '],
    [/ Munkar /gi, ' منكر '],
    [/ Shadh /gi, ' شاذ '],
    [/ (Isnaad|Isnad) /gi, ' الإسناد '],
    [/ Matn /gi, ' المتن '],
    [/ (Muquf|Mauquf|Mawquf) /gi, ' موقوف '],
    [/ Maqtu /gi, ' مقطوع '],
    [/ Mursal /gi, ' مرسل '],
    [/ Mutawatir /gi, ' متواتر '],
    [/ Lighairihi /gi, ' لغيره '],
    [/ Malool /gi, ' معلول '],
    [/ Hadith /gi, ' '],
  ];
  for (let pass = 0; pass < 3; pass++) for (const [re, ar] of pairs) g = g.replace(re, ar);
  g = g.replace(/\s+/g, ' ').trim();
  // «ضعيف الإسناد» و«صحيح الإسناد»: الإسناد يتبع الحكم مباشرة
  if (/[A-Za-z]/.test(g)) return null; // لفظ غير معروف: لا نخمّن
  return g;
}

const ISNAD = /^(و?ح(دثنا|دثني|دثه|دثهم|دثاهم)|و?أ?خبر(نا|ني|ه)|و?أنبأ(نا|ني)|سمعت|قال (حدثنا|أخبرنا|أخبرني|حدثني|سمعت)|عن|وعن|ح|يعني)( |$)/;
const strip = (s) => s.replace(/[ً-ْٰ]/g, '');

function matnOf(raw) {
  const text = raw.replace(/[‎‏]/g, '').replace(/\s+/g, ' ').trim();
  const a = text.indexOf('"');
  const b = text.lastIndexOf('"');
  if (a >= 0 && b > a + 10) return text.slice(a + 1, b).replace(/\s*"\s*/g, ' ').replace(/\s+\.\s+/g, '. ').replace(/\s+/g, ' ').trim();
  // بلا علامات تنصيص: نحذف مقاطع الإسناد من أول النص
  const parts = text.split('، ');
  let i = 0;
  while (i < parts.length - 1 && ISNAD.test(strip(parts[i]).trim())) i++;
  const rest = parts.slice(i).join('، ').trim();
  return rest.length > 15 ? rest : text;
}

const rows = [];
const unknown = new Map();
for (const [code, name] of BOOKS) {
  const data = JSON.parse(readFileSync(join(dir, `ara-${name}.min.json`), 'utf8'));
  for (const h of data.hadiths) {
    const ref = String(h.arabicnumber ?? h.hadithnumber).split('.')[0];
    const matn = matnOf(h.text ?? '');
    if (matn.length < 8) continue;
    let grade = '';
    let grader = '';
    if (code !== 'b' && code !== 'm') {
      for (const [en, ar] of GRADERS) {
        const found = (h.grades ?? []).find((g) => g.name === en);
        if (!found) continue;
        const g = gradeAr(found.grade);
        if (g) {
          grade = g;
          grader = ar;
          break;
        }
        unknown.set(found.grade, (unknown.get(found.grade) ?? 0) + 1);
      }
    } else grade = 'صحيح';
    // نصوص مكررة بالرقم نفسه في المصدر (روايات فرعية): نبقي الأولى
    const last = rows.at(-1);
    if (last && last[0] === code && last[1] === ref && last[2] === matn) continue;
    rows.push([code, ref, matn, grade, grader]);
  }
}

writeFileSync('data/books.json', JSON.stringify(rows));
const count = {};
for (const r of rows) count[r[0]] = (count[r[0]] ?? 0) + 1;
console.log('rows', rows.length, count);
console.log('ungraded sunan', rows.filter((r) => !['b', 'm'].includes(r[0]) && !r[3]).length);
if (unknown.size) console.log('unknown grade words', [...unknown]);
