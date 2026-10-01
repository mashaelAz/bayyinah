import { normalizeArabic } from '../arabic/normalize.ts';
import type { SourceRecord } from '../types.ts';

/**
 * يحلّل استجابة الواجهة العامة للموسوعة الحديثية (dorar_api.json).
 * الاستجابة: {"ahadith":{"result":"<html>"}} وكل حديث يتبعه مربع معلومات:
 * الراوي، المحدث، المصدر، الصفحة أو الرقم، خلاصة حكم المحدث.
 * تُنقل القيم كما هي دون أي تعديل في نص الحديث أو الحكم.
 */

const INVISIBLE = /[​-‏﻿]/g;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function field(info: string, label: string): string {
  const re = new RegExp(`<span[^>]*class="info-subtitle"[^>]*>\\s*${label}\\s*:?\\s*</span>([\\s\\S]*?)(?=<span[^>]*class="info-subtitle"|</div>|$)`);
  const m = info.match(re);
  if (!m) return '';
  const v = stripTags(m[1]);
  return v === '-' ? '' : v;
}

export function parseDorarHtml(html: string, query: string, verifiedAt: string): SourceRecord[] {
  const clean = html.replace(INVISIBLE, '');
  const records: SourceRecord[] = [];
  const blockRe = /<div class="hadith"[^>]*>([\s\S]*?)<\/div>\s*<div class="hadith-info">([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  let index = 0;
  const searchUrl = `https://dorar.net/hadith/search?q=${encodeURIComponent(query)}`;

  while ((m = blockRe.exec(clean)) !== null) {
    index++;
    const text = stripTags(m[1])
      .replace(/^\d+\s*-\s*/, '')
      .replace(/\s+\.\s*$/, '')
      .trim();
    if (!text) continue;
    const info = m[2];
    records.push({
      id: `dorar-${index}-${hash(text + field(info, 'المحدث') + field(info, 'الصفحة أو الرقم'))}`,
      text,
      normalized_text: normalizeArabic(text),
      narrator: field(info, 'الراوي'),
      scholar: field(info, 'المحدث'),
      source: field(info, 'المصدر'),
      reference: field(info, 'الصفحة أو الرقم'),
      grade: field(info, 'خلاصة حكم المحدث'),
      takhrij: '',
      source_url: searchUrl,
      verified_at: verifiedAt,
      provider: 'dorar',
    });
  }
  return records;
}

export function parseDorarResponse(json: unknown, query: string, verifiedAt: string): SourceRecord[] {
  const html = (json as { ahadith?: { result?: unknown } })?.ahadith?.result;
  if (typeof html !== 'string') throw new Error('استجابة غير متوقعة من المصدر');
  return parseDorarHtml(html, query, verifiedAt);
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
