import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPORTS_DIR = path.join(ROOT, 'data', 'community-reports');
export const archiveRoot = process.env.DISCORD_ARCHIVE_ROOT || path.join(os.homedir(), 'Documents', 'ChatGPT', 'DISCORD');

const REPORT_FILE = /^(\d{4})-(\d{2})-(\d{2})\.md$/;
const PERIOD_LINE = /対象期間：\s*(\d{4})[/-](\d{2})[/-](\d{2})\s+\d{2}:\d{2}\s+JST\s*～\s*(\d{4})[/-](\d{2})[/-](\d{2})\s+\d{2}:\d{2}\s+JST/;
const DISCORD_LINK = /[ \t]*\[[^\]]*\]\([ \t]*https?:\/\/(?:www\.)?(?:discord(?:app)?\.com)\/[^)]+\)/giu;
const DISCORD_URL = /[ \t]*https?:\/\/(?:www\.)?(?:discord(?:app)?\.com)\/\S*/giu;

function pad(value) {
  return String(value).padStart(2, '0');
}

function shiftDate(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86400000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function toDateKey(year, month, day) {
  const value = `${year}-${pad(month)}-${pad(day)}`;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`週報の日付が不正です: ${value}`);
  }
  return value;
}

export function sanitizeReportMarkdown(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) throw new Error('週報Markdownが空です');
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const cleaned = [];
  for (const original of lines) {
    let line = original.replace(DISCORD_LINK, '').replace(DISCORD_URL, '');
    if (/^\s*関連投稿\s*[:：]?\s*$/u.test(line)) continue;
    cleaned.push(line.replace(/[ \t]+$/u, ''));
  }
  return `${cleaned.join('\n').trim()}\n`;
}

export function reportPeriod(markdown, fallbackEndDate = null) {
  const match = String(markdown).match(PERIOD_LINE);
  if (match) {
    const startDate = toDateKey(match[1], match[2], match[3]);
    const endDate = toDateKey(match[4], match[5], match[6]);
    if (shiftDate(startDate, 6) !== endDate) throw new Error('週報の対象期間は7日間で指定してください');
    return { startDate, endDate };
  }
  if (fallbackEndDate) return { startDate: shiftDate(fallbackEndDate, -6), endDate: fallbackEndDate };
  throw new Error('週報に対象期間がありません');
}

function sourceReportFiles() {
  const root = path.join(archiveRoot, 'reports', 'weekly');
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const yearEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!yearEntry.isDirectory() || !/^\d{4}$/.test(yearEntry.name)) continue;
    const yearDir = path.join(root, yearEntry.name);
    for (const entry of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const match = entry.name.match(REPORT_FILE);
      if (!match) continue;
      files.push(path.join(yearDir, entry.name));
    }
  }
  return files.sort((left, right) => right.localeCompare(left));
}

export function findLatestSourceReport() {
  const file = sourceReportFiles()[0];
  if (!file) throw new Error(`既存Discord週報が見つかりません: ${path.join(archiveRoot, 'reports', 'weekly')}`);
  return file;
}

function publicReportFiles() {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  return fs.readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && REPORT_FILE.test(entry.name))
    .map(entry => path.join(REPORTS_DIR, entry.name))
    .sort((left, right) => right.localeCompare(left));
}

export function readPublicReports() {
  return publicReportFiles().map(file => {
    const filename = path.basename(file);
    const endDate = filename.slice(0, 10);
    const markdown = sanitizeReportMarkdown(fs.readFileSync(file, 'utf8'));
    const period = reportPeriod(markdown, endDate);
    if (period.endDate !== endDate) throw new Error(`週報ファイル名と対象期間が一致しません: ${filename}`);
    return { file, filename, markdown, ...period };
  }).sort((left, right) => right.endDate.localeCompare(left.endDate));
}

export function currentReport(reports, now = new Date()) {
  const threshold = new Date(now.getTime() - 7 * 86400000);
  return reports.find(report => {
    const end = new Date(`${report.endDate}T23:59:59+09:00`);
    const start = new Date(`${report.startDate}T00:00:00+09:00`);
    return end >= threshold && start <= now;
  });
}

export function reportSummary(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex(line => /^##\s+☀️\s*今週の要約/u.test(line));
  if (start < 0) return [];
  const summary = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/u.test(line)) break;
    const match = line.match(/^\s*-\s+(.+?)\s*$/u);
    if (match) summary.push(match[1]);
  }
  return summary;
}

export function importReport(sourceFile = findLatestSourceReport()) {
  const source = fs.readFileSync(sourceFile, 'utf8');
  const markdown = sanitizeReportMarkdown(source);
  const filenameMatch = path.basename(sourceFile).match(REPORT_FILE);
  const period = reportPeriod(markdown, filenameMatch ? filenameMatch[0].slice(0, 10) : null);
  if (!/^#\s+🔥\s*ワクワクFIRE\s+コミュニティ週報/mu.test(markdown)) {
    throw new Error('既存週報のタイトルを確認できません');
  }
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const target = path.join(REPORTS_DIR, `${period.endDate}.md`);
  if (fs.existsSync(target)) {
    const existing = sanitizeReportMarkdown(fs.readFileSync(target, 'utf8'));
    if (existing === markdown) return { changed: false, target, ...period };
    throw new Error(`公開済み週報を自動上書きできません: ${path.basename(target)}`);
  }
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, markdown, 'utf8');
  fs.renameSync(temporary, target);
  return { changed: true, target, ...period };
}

export function inlineMarkdown(value) {
  return String(value)
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/\*\*(.+?)\*\*/gu, '<strong>$1</strong>');
}

export function reportMarkdownToHtml(markdown) {
  const lines = sanitizeReportMarkdown(markdown).split('\n');
  const output = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      output.push('</ul>');
      listOpen = false;
    }
  };
  for (const line of lines) {
    if (!line.trim()) {
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/u);
    if (heading) {
      closeList();
      const level = Math.min(4, heading[1].length + 1);
      output.push(`<h${level}>${inlineMarkdown(escapeText(heading[2]))}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*-\s+(.+)$/u);
    if (bullet) {
      if (!listOpen) {
        output.push('<ul>');
        listOpen = true;
      }
      output.push(`<li>${inlineMarkdown(escapeText(bullet[1]))}</li>`);
      continue;
    }
    closeList();
    output.push(`<p>${inlineMarkdown(escapeText(line))}</p>`);
  }
  closeList();
  return output.join('');
}

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
