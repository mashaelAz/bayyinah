'use client';

import VerifyPanel from './VerifyPanel';
import DiffView from './DiffView';
import { Star, StarSolid } from './Ornament';
import { IconAlert, IconEdit, IconQuote, IconSearch } from './Icons';
import { useI18n } from '../lib/i18n/index.tsx';
import type { MessageKey } from '../lib/i18n/ar.ts';
import { diffTexts } from '../lib/matching/diff.ts';
import { demoRecords } from '../lib/providers/demoData.ts';

// الآية كما في المصحف، تُعرض بالعربية في كل اللغات (لا نترجم القرآن ترجمة غير معتمدة)
const VERSE = 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِن جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا';

// مثال «بصمة النص»: نص محرّف عمدًا مقابل سجل حقيقي من الدرر (الألباني، غاية المرام 14)
const DEMO_SOURCE = demoRecords.find((r) => r.id === 'dorar-niyyat-01') ?? demoRecords[0];
const DEMO_DIFF = diffTexts('إنما الأعمال بالنية، وإنما لكل إنسان ما نوى، فمن صدقت نيته بلغ مراده', DEMO_SOURCE.text);

const PROBLEM_ICONS = [IconAlert, IconEdit, IconQuote, IconSearch];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="kicker">
      <Star />
      {children}
    </div>
  );
}

export default function Home() {
  const { t } = useI18n();
  const k = (s: string) => s as MessageKey;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <h1>{t('hero.title')}</h1>
            <div className="verse">
              <span className="ar" lang="ar">
                ﴿{VERSE}﴾
              </span>
              <small>{t('hero.verseRef')}</small>
            </div>
            <p className="hero-lede">{t('hero.lede')}</p>
            <div className="hero-actions">
              <a href="#verify-image" className="btn btn-lav">
                {t('hero.ctaImage')}
              </a>
              <a href="#verify-text" className="btn btn-light">
                {t('hero.ctaText')}
              </a>
            </div>
            <p className="hero-note">{t('hero.note')}</p>
          </div>

          <figure className="specimen" aria-label={t('specimen.aria')} style={{ margin: 0 }}>
            <div className="arch">
              <Star className="star" color="#9c86da" />
              <div className="attr">قال رسول الله ﷺ:</div>
              <p className="matn" lang="ar">
                «<mark>إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى</mark>»
              </p>
              <span className="extra">
                <span className="ar">انشر تؤجر، ولا تجعلها تقف عندك</span>
                <small>{t('specimen.excluded')}</small>
              </span>
            </div>
            <div className="verdict">
              <div className="row">
                <span>{t('specimen.label')}</span>
                <span>{t('specimen.match')}</span>
              </div>
              <div className="grade" lang="ar">
                صحيح
              </div>
              <div className="cite" lang="ar">
                الألباني، غاية المرام، 14
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <span>{t('specimen.source')}</span>
              </div>
            </div>
          </figure>
        </div>
      </section>

      <section className="section" id="problem" aria-labelledby="problem-title">
        <div className="container">
          <div className="section-head">
            <h2 id="problem-title" className="section-title">
              {t('problem.title')}
            </h2>
            <p className="section-lede">{t('problem.lede')}</p>
          </div>
          <div className="problems">
            {[1, 2, 3, 4].map((n, i) => {
              const Icon = PROBLEM_ICONS[i];
              return (
                <div className="problem" key={n}>
                  <div className="problem-icon">
                    <Icon />
                  </div>
                  <div>
                    <h3>{t(k(`problem.${n}.t`))}</h3>
                    <p>{t(k(`problem.${n}.b`))}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="solution" aria-labelledby="solution-title">
        <div className="container">
          <div className="section-head">
            <Kicker>{t('brand')}</Kicker>
            <h2 id="solution-title" className="section-title">
              {t('solution.title')}
            </h2>
            <p className="section-lede">{t('solution.lede')}</p>
          </div>
          <div className="solution-grid">
            <ul className="features">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n}>
                  <StarSolid color={n % 2 ? '#006c35' : '#9c86da'} />
                  <div>
                    <h3>{t(k(`solution.${n}.t`))}</h3>
                    <p>{t(k(`solution.${n}.b`))}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="demo-card">
              <h3>{t('solution.demo')}</h3>
              <DiffView diff={DEMO_DIFF} bare />
              <p className="fine" lang="ar" style={{ marginBottom: 0 }}>
                {DEMO_SOURCE.scholar}، {DEMO_SOURCE.source} {DEMO_SOURCE.reference}: «{DEMO_SOURCE.grade}»
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <h2 id="how-title" className="section-title">
              {t('how.title')}
            </h2>
          </div>
          <ol className="how">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n}>
                <h3>{t(k(`how.${n}.t`))}</h3>
                <p>{t(k(`how.${n}.b`))}</p>
              </li>
            ))}
          </ol>
          <p className="principle">{t('how.principle')}</p>
        </div>
      </section>

      <section className="section section-alt" id="verify" aria-labelledby="verify-title">
        <div className="container">
          <span id="verify-image" />
          <span id="verify-text" />
          <div className="section-head">
            <h2 id="verify-title" className="section-title">
              {t('verify.title')}
            </h2>
            <p className="section-lede">{t('verify.lede')}</p>
          </div>
          <VerifyPanel />
        </div>
      </section>

      <section className="section standards" id="standards" aria-labelledby="standards-title">
        <div className="container">
          <div className="section-head">
            <h2 id="standards-title" className="section-title">
              {t('standards.title')}
            </h2>
            <p className="section-lede">{t('standards.lede')}</p>
          </div>
          <div className="std-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div className="std" key={n}>
                <h3>
                  <Star />
                  {t(k(`std.${n}.t`))}
                </h3>
                <p>{t(k(`std.${n}.b`))}</p>
              </div>
            ))}
          </div>
          <div className="track">
            <div>
              <div className="label">{t('track.label')}</div>
              <blockquote>«{t('track.quote')}»</blockquote>
            </div>
            <p>{t('track.answer')}</p>
          </div>
        </div>
      </section>

      <section className="section" id="sources" aria-labelledby="sources-title">
        <div className="container">
          <div className="section-head">
            <h2 id="sources-title" className="section-title">
              {t('sources.title')}
            </h2>
            <p className="section-lede">{t('sources.lede')}</p>
          </div>
          <div className="sources">
            {[
              { id: 'dorar', url: 'https://dorar.net/hadith', primary: true },
              { id: 'shamela', url: 'https://shamela.ws' },
              { id: 'jamhara', url: 'https://islamic-content.com/dictionary' },
              { id: 'quran', url: 'https://quranpedia.net' },
            ].map((s) => (
              <div key={s.id} className={`source${s.primary ? ' primary' : ''}`}>
                <span className="source-role">{t(k(`src.${s.id}.r`))}</span>
                <h3>{t(k(`src.${s.id}.t`))}</h3>
                <p>{t(k(`src.${s.id}.b`))}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.url.replace('https://', '')}
                </a>
              </div>
            ))}
          </div>
          <p className="fine independent">{t('sources.independent')}</p>
        </div>
      </section>

      <section className="section section-alt" id="faq" aria-labelledby="faq-title">
        <div className="container">
          <div className="section-head">
            <h2 id="faq-title" className="section-title">
              {t('faq.title')}
            </h2>
          </div>
          <div className="faq">
            {[1, 2, 3, 4, 5].map((n) => (
              <details key={n}>
                <summary>{t(k(`faq.${n}.q`))}</summary>
                <p>{t(k(`faq.${n}.a`))}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
