import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data", "fire-calendar");
const REQUIRED_FIELDS = [
  "id", "date", "title", "category", "originalEvent", "shortText",
  "body", "action", "relatedLinks", "sources"
];
const DAYS_PER_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const EXPECTED_DATES = [];
for (let month = 1; month <= 12; month += 1) {
  for (let day = 1; day <= DAYS_PER_MONTH[month - 1]; day += 1) {
    EXPECTED_DATES.push(String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"));
  }
}

const index = JSON.parse(await fs.readFile(path.join(DATA_DIR, "index.json"), "utf8"));
const allEntries = [];
for (let month = 1; month <= 12; month += 1) {
  const filename = String(month).padStart(2, "0") + ".json";
  const monthEntries = JSON.parse(await fs.readFile(path.join(DATA_DIR, filename), "utf8"));
  if (!Array.isArray(monthEntries)) throw new Error(filename + " は配列ではありません。");
  allEntries.push(...monthEntries);
}

const actualDates = allEntries.map((entry) => entry.date);
const indexDates = Array.isArray(index.entries) ? index.entries.map((entry) => entry.date) : [];
const missing = EXPECTED_DATES.filter((date) => !actualDates.includes(date));
const unexpected = actualDates.filter((date) => !EXPECTED_DATES.includes(date));
const duplicateDates = [...new Set(actualDates.filter((date, i) => actualDates.indexOf(date) !== i))];
const duplicateTitles = [...new Set(allEntries.map((entry) => entry.title).filter((value, i, values) => values.indexOf(value) !== i))];
const duplicateShortTexts = [...new Set(allEntries.map((entry) => entry.shortText).filter((value, i, values) => values.indexOf(value) !== i))];
const missingDateLabels = [];
const missingFields = [];
const invalidLinks = [];

for (const entry of allEntries) {
  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      missingFields.push(entry.date + ":" + field);
    }
  }
  const [month, day] = entry.date.split("-").map(Number);
  const dateLabel = month + "月" + day + "日";
  for (const field of ["title", "shortText", "dayContext"]) {
    if (typeof entry[field] !== "string" || !entry[field].includes(dateLabel)) {
      missingDateLabels.push(entry.date + ":" + field + " (expected " + dateLabel + ")");
    }
  }
  for (const link of Array.isArray(entry.relatedLinks) ? entry.relatedLinks : []) {
    const sitePath = String(link).split(/[?#]/, 1)[0];
    if (!sitePath.startsWith("/")) invalidLinks.push(entry.date + ":" + link);
    if (sitePath === "/" || sitePath === "") continue;
    const relative = sitePath.replace(/^\/+/, "").replace(/\/$/, "");
    if (relative && !["articles", "fire-migration-japan", "fire-migration-world", "risk-runner"].includes(relative)) {
      invalidLinks.push(entry.date + ":" + link);
    }
  }
}

const indexMismatch = indexDates.length !== EXPECTED_DATES.length ||
  EXPECTED_DATES.some((date, i) => indexDates[i] !== date);
const categories = allEntries.reduce((counts, entry) => {
  counts[entry.category] = (counts[entry.category] || 0) + 1;
  return counts;
}, {});

const report = {
  entries: allEntries.length,
  indexEntries: indexDates.length,
  expectedEntries: EXPECTED_DATES.length,
  leapDay: actualDates.includes("02-29"),
  missing,
  unexpected,
  duplicateDates,
  duplicateTitles,
  duplicateShortTexts,
  missingDateLabels,
  missingFields,
  invalidLinks,
  indexMismatch,
  categories
};

console.log(JSON.stringify(report, null, 2));
if (
  allEntries.length !== EXPECTED_DATES.length ||
  indexMismatch ||
  missing.length ||
  unexpected.length ||
  duplicateDates.length ||
  duplicateTitles.length ||
  duplicateShortTexts.length ||
  missingDateLabels.length ||
  missingFields.length ||
  invalidLinks.length ||
  !report.leapDay
) {
  process.exitCode = 1;
}
