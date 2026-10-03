// بناء data/quran.json من مشروع quran-api (ملكية عامة):
// - نص العرض: نص Tanzil «Simple» المضبوط بالتشكيل، المراجَع على مصحف المدينة النبوية (مجمع الملك فهد، رواية حفص)
//   اخترناه لأنه بحروف يونيكود القياسية فيظهر صحيحًا في كل الأجهزة وفي واتساب، دون تعديل أي حرف
// - نص المطابقة: الرسم الإملائي بلا تشكيل، لأن البطاقات تُكتب بالإملاء المعتاد
// الاستخدام:
//   git clone --depth 1 --filter=blob:none --sparse https://github.com/fawazahmed0/quran-api
//   (cd quran-api && git sparse-checkout set --no-cone '/editions/ara-quransimple.min.json' '/editions/ara-quranspellednod.min.json' '/editions/ara-quranuthmanihaf.min.json')
//   node scripts/build-quran.mjs ./quran-api
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const display = read('editions/ara-quransimple.min.json').quran;
const spelled = read('editions/ara-quranspellednod.min.json').quran;
// الرسم العثماني (مجمع الملك فهد، الإصدار 13): للمطابقة فقط، لأن البطاقات المصوّرة من المصحف تُقرأ برسمه
const uthmani = read('editions/ara-quranuthmanihaf.min.json').quran;
/** تجريد الرسم العثماني من علامات الضبط والوقف ليبقى هيكل الحروف (يُطبَّع بعد ذلك في بيّنة) */
const skeleton = (t) =>
  t
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g, '')
    .replace(/\u0671/g, '\u0627')
    .replace(/\s+/g, ' ')
    // الألف المقصورة المنفصلة بعد التنوين (مثل «هدًى») تُلحق بكلمتها
    .replace(/ ى(?= |$)/g, 'ى')
    .trim();

// أسماء السور كما في مصحف المدينة
const names = 'الفاتحة البقرة آل_عمران النساء المائدة الأنعام الأعراف الأنفال التوبة يونس هود يوسف الرعد إبراهيم الحجر النحل الإسراء الكهف مريم طه الأنبياء الحج المؤمنون النور الفرقان الشعراء النمل القصص العنكبوت الروم لقمان السجدة الأحزاب سبأ فاطر يس الصافات ص الزمر غافر فصلت الشورى الزخرف الدخان الجاثية الأحقاف محمد الفتح الحجرات ق الذاريات الطور النجم القمر الرحمن الواقعة الحديد المجادلة الحشر الممتحنة الصف الجمعة المنافقون التغابن الطلاق التحريم الملك القلم الحاقة المعارج نوح الجن المزمل المدثر القيامة الإنسان المرسلات النبأ النازعات عبس التكوير الانفطار المطففين الانشقاق البروج الطارق الأعلى الغاشية الفجر البلد الشمس الليل الضحى الشرح التين العلق القدر البينة الزلزلة العاديات القارعة التكاثر العصر الهمزة الفيل قريش الماعون الكوثر الكافرون النصر المسد الإخلاص الفلق الناس'
  .split(' ')
  .map((n) => n.replace('_', ' '));
if (names.length !== 114) throw new Error('عدد السور');
if (display.length !== 6236 || spelled.length !== 6236) throw new Error('عدد الآيات غير صحيح');
const verses = display.map((v, i) => {
  const s = spelled[i];
  if (s.chapter !== v.chapter || s.verse !== v.verse) throw new Error(`ترتيب مختلف عند ${i}`);
  const u = uthmani[i];
  if (u.chapter !== v.chapter || u.verse !== v.verse) throw new Error(`ترتيب العثماني مختلف عند ${i}`);
  return [v.chapter, v.verse, v.text, s.text, skeleton(u.text)];
});
writeFileSync('data/quran.json', JSON.stringify({ names, verses }));
console.log('verses', verses.length, 'names', names.length, names.slice(0, 3), names[48], names[113]);
