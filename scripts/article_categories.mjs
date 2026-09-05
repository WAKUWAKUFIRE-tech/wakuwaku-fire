import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORY_CONFIG_PATH = path.join(ROOT, "automation", "article_categories.json");
const categoryConfig = JSON.parse(await fs.readFile(CATEGORY_CONFIG_PATH, "utf8"));

export const ARTICLE_CATEGORIES = categoryConfig.categories;
export const CATEGORY_BY_ID = new Map(ARTICLE_CATEGORIES.map((category) => [category.id, category]));
export const CATEGORY_BY_NAME = new Map(ARTICLE_CATEGORIES.map((category) => [category.name, category]));

const ALIASES = new Map([
  ["FIREの基本", "fire-basics"],
  ["FIREの考え方", "fire-basics"],
  ["FIREの現実", "fire-basics"],
  ["FIREの失敗", "fire-basics"],
  ["FIREの必要資産", "fire-preparation"],
  ["FIREの資産計画", "fire-preparation"],
  ["FIREの年齢別", "fire-preparation"],
  ["FIREの計算", "fire-preparation"],
  ["FIREの計画", "fire-preparation"],
  ["FIREの準備", "fire-preparation"],
  ["FIREのお金", "fire-money"],
  ["FIREの資産形成", "fire-money"],
  ["FIREと投資", "fire-money"],
  ["FIRE後のお金", "fire-money"],
  ["投資との向き合い方", "fire-money"],
  ["FIREと仕事", "fire-work"],
  ["FIRE後の働き方", "fire-work"],
  ["発信・仕事", "fire-work"],
  ["サイドFIRE", "fire-work"],
  ["FIRE後の生活", "fire-life"],
  ["FIRE後の暮らし", "fire-life"],
  ["FIRE後の現実", "fire-life"],
  ["家計と幸福", "fire-life"],
  ["コミュニティ", "fire-life"],
  ["家族とFIRE", "family-fire"],
  ["住まいとFIRE", "fire-housing"]
]);

export function categoryFromValue(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return CATEGORY_BY_ID.get(text) || CATEGORY_BY_NAME.get(text) || CATEGORY_BY_ID.get(ALIASES.get(text)) || null;
}

function categoryText(item = {}, generated = {}) {
  return [
    item.main_keyword,
    ...(item.secondary_keywords || []),
    item.article_title_plan,
    item.unique_angle,
    generated.title,
    generated.meta_description,
    generated.lead
  ].filter(Boolean).join(" ").toLocaleLowerCase();
}

export function inferArticleCategory(item = {}, generated = {}) {
  const text = categoryText(item, generated);
  const ranked = ARTICLE_CATEGORIES.map((category, index) => ({
    category,
    index,
    score: category.keywords.reduce((score, keyword) => score + (text.includes(keyword.toLocaleLowerCase()) ? 1 : 0), 0)
  })).sort((left, right) => right.score - left.score || left.index - right.index);
  return ranked[0]?.score > 0 ? ranked[0].category : CATEGORY_BY_ID.get("fire-basics");
}

export function categoryForArticle(item = {}, generated = {}) {
  for (const value of [generated.category_id, generated.category, item.category_id, item.category]) {
    const category = categoryFromValue(value);
    if (category) return category;
  }
  return inferArticleCategory(item, generated);
}

export function isCanonicalCategoryName(value) {
  return CATEGORY_BY_NAME.has(String(value || "").trim());
}

