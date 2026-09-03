const DEFAULT_AMAZON_FALLBACK_URL = "https://www.amazon.co.jp/gp/goldbox/";

export const MONETIZATION_CATEGORIES = [
  "credit-card",
  "payment",
  "mobile",
  "bank",
  "investment",
  "travel",
  "shopping",
  "food",
  "insurance",
  "utility",
  "general"
];

export const MONETIZATION_CATEGORY_LABELS = {
  "credit-card": "クレジットカード",
  payment: "キャッシュレス決済",
  mobile: "通信・SIM",
  bank: "銀行",
  investment: "証券・投資",
  travel: "旅行",
  shopping: "EC・買い物",
  food: "飲食・デリバリー",
  insurance: "保険",
  utility: "固定費",
  general: "その他"
};

const CATEGORY_RULES = {
  "credit-card": [
    /クレジットカード/i, /カード(?:入会|会員|特典|払い|利用)/i,
    /Visa|Mastercard|JCB|AMEX/i, /年会費/i, /入会特典/i,
    /イオンカード|三井住友カード|楽天カード|PayPayカード/i
  ],
  payment: [
    /PayPay/i, /d払い/i, /au\s*PAY/i, /楽天ペイ/i, /メルペイ/i,
    /QUICPay|iD/i, /キャッシュレス/i, /JAL\s*Pay/i, /コード決済/i
  ],
  mobile: [
    /povo/i, /ahamo/i, /LINEMO/i, /楽天モバイル/i, /UQ\s*mobile/i,
    /SIM/i, /スマホ/i, /通信/i, /回線/i, /データ容量/i
  ],
  bank: [
    /銀行/i, /普通預金/i, /定期預金/i, /口座開設/i, /振込/i,
    /金利/i, /預金/i
  ],
  investment: [
    /証券/i, /NISA/i, /投資/i, /株(?:式)?/i, /FX/i, /仮想通貨/i,
    /iDeCo/i, /暗号資産/i
  ],
  travel: [
    /ホテル/i, /旅行/i, /航空/i, /飛行機/i, /新幹線/i,
    /じゃらん/i, /楽天トラベル/i, /宿泊/i
  ],
  shopping: [
    /Amazon/i, /楽天市場/i, /Yahoo!?ショッピング/i, /セール/i,
    /買い物/i, /ふるなび/i, /ショッピング/i, /通販/i
  ],
  food: [
    /Uber\s*Eats/i, /出前/i, /デリバリー/i, /レストラン/i,
    /飲食/i, /コンビニ/i, /外食/i, /うどん|ラーメン|焼肉|ステーキ|バーガー|弁当/i
  ],
  insurance: [
    /保険/i, /生命保険/i, /医療保険/i, /自動車保険/i, /火災保険/i
  ],
  utility: [
    /電気/i, /ガス/i, /光回線/i, /Wi-?Fi/i, /固定費/i,
    /公共料金/i, /水道/i
  ]
};

const EXISTING_CATEGORY_FALLBACKS = {
  cashless: "payment",
  point: "shopping",
  shopping: "shopping",
  food: "food",
  travel: "travel",
  finance: "investment",
  coupon: "general",
  telecom: "mobile",
  other: "general"
};

const CATEGORY_FIELD_WEIGHTS = [
  ["title", 5],
  ["campaignName", 5],
  ["service", 4],
  ["merchant", 3],
  ["benefitShort", 2],
  ["benefit", 1],
  ["condition", 1],
  ["action", 1],
  ["note", 1]
];

function textForDeal(deal) {
  return CATEGORY_FIELD_WEIGHTS.map(([field, weight]) => ({
    text: String(deal?.[field] || ""),
    weight
  })).filter((part) => part.text);
}

export function classifyMonetizationCategory(deal = {}) {
  const scores = Object.fromEntries(MONETIZATION_CATEGORIES.map((category) => [category, 0]));
  for (const [category, patterns] of Object.entries(CATEGORY_RULES)) {
    for (const part of textForDeal(deal)) {
      for (const pattern of patterns) {
        if (pattern.test(part.text)) scores[category] += part.weight;
      }
    }
  }
  const ranked = Object.entries(scores)
    .filter(([category, score]) => category !== "general" && score > 0)
    .sort((left, right) => right[1] - left[1] || MONETIZATION_CATEGORIES.indexOf(left[0]) - MONETIZATION_CATEGORIES.indexOf(right[0]));
  if (ranked.length) return ranked[0][0];
  return EXISTING_CATEGORY_FALLBACKS[String(deal.category || "").toLowerCase()] || "general";
}

export function withMonetizationCategory(deal = {}) {
  return {
    ...deal,
    monetizationCategory: MONETIZATION_CATEGORIES.includes(deal.monetizationCategory)
      ? deal.monetizationCategory
      : classifyMonetizationCategory(deal)
  };
}

export function countMonetizationCategories(deals = []) {
  const counts = Object.fromEntries(MONETIZATION_CATEGORIES.map((category) => [category, 0]));
  for (const deal of deals) {
    const category = withMonetizationCategory(deal).monetizationCategory;
    counts[category] += 1;
  }
  return counts;
}

function configuredHttpsUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function configuredAmazonUrl(rawUrl) {
  const url = configuredHttpsUrl(rawUrl);
  if (!url) return "";
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return /(?:^|\.)amazon\.co\.jp$|^amzn\.to$/i.test(hostname) ? url : "";
  } catch {
    return "";
  }
}

function configuredScriptTag(rawTag) {
  const value = String(rawTag || "").trim();
  if (!value || !/^<script\b[\s\S]*<\/script>\s*$/i.test(value)) return "";
  if (/<(?:html|head|body|iframe|object|embed)\b|<\/head>|<\/body>/i.test(value)) return "";
  return value;
}

function dateValue(rawValue) {
  if (!rawValue) return null;
  const value = new Date(rawValue);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function isAffiliateOfferActive(offer, now = new Date()) {
  if (!offer?.enabled) return false;
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) return false;
  if (offer.startAt) {
    const start = dateValue(offer.startAt);
    if (!start || current < start) return false;
  }
  if (offer.endAt) {
    const end = dateValue(offer.endAt);
    if (!end || current > end) return false;
  }
  return true;
}

function normalizeOffer(offer = {}, env = {}) {
  const directUrl = String(offer.url || "").trim();
  const envUrl = offer.urlEnv ? String(env[offer.urlEnv] || "").trim() : "";
  const url = configuredHttpsUrl(directUrl || envUrl);
  if (!url) return null;
  if (!offer.id || !MONETIZATION_CATEGORIES.includes(offer.category)) return null;
  return {
    ...offer,
    id: String(offer.id),
    category: offer.category,
    title: String(offer.title || "関連するサービスを確認する"),
    description: String(offer.description || "条件を確認して、関連するサービスを見てみる。"),
    buttonLabel: String(offer.buttonLabel || "詳しく見る"),
    provider: String(offer.provider || "other"),
    priority: Number.isFinite(Number(offer.priority)) ? Number(offer.priority) : 0,
    url,
    enabled: Boolean(offer.enabled)
  };
}

export function buildAffiliateRuntime(config = {}, registry = {}, env = {}) {
  const a8Config = config.a8 || {};
  const a8ScriptValue = env.A8_LINK_MANAGER_SCRIPT || a8Config.script || "";
  const a8ScriptTag = configuredScriptTag(env.A8_LINK_MANAGER_SCRIPT_TAG || a8Config.scriptTag || a8ScriptValue);
  const a8ScriptUrl = configuredHttpsUrl(env.A8_LINK_MANAGER_SCRIPT_URL || a8Config.scriptUrl || a8ScriptValue);
  const amazonConfig = config.amazon || {};
  const amazonAssociateUrl = configuredAmazonUrl(env.AMAZON_ASSOCIATE_URL || amazonConfig.associateUrl);
  const amazonFallbackUrl = configuredAmazonUrl(amazonConfig.fallbackUrl) || DEFAULT_AMAZON_FALLBACK_URL;
  const offers = (registry.offers || [])
    .map((offer) => normalizeOffer(offer, env))
    .filter(Boolean);
  const hasConfiguredOffers = offers.some((offer) => offer.enabled);
  const a8Enabled = Boolean(a8ScriptTag || a8ScriptUrl);
  const amazonIsAffiliate = Boolean(amazonAssociateUrl);
  return {
    a8: {
      enabled: a8Enabled,
      scriptTag: a8ScriptTag,
      scriptUrl: a8ScriptUrl
    },
    amazon: {
      enabled: amazonConfig.enabled !== false,
      url: amazonAssociateUrl || amazonFallbackUrl,
      isAffiliate: amazonIsAffiliate,
      disclosure: amazonIsAffiliate ? String(amazonConfig.disclosure || "PR") : ""
    },
    offers,
    disclosureRequired: a8Enabled || hasConfiguredOffers || amazonIsAffiliate
  };
}

export function selectAffiliateOffers(deals = [], offers = [], { now = new Date(), maxOffers = 3 } = {}) {
  const categories = new Set(deals.map((deal) => withMonetizationCategory(deal).monetizationCategory));
  const selectedCategories = new Set();
  const selectedOfferIds = new Set();
  const selectedOffers = [];
  const sortedOffers = offers
    .filter((offer) => categories.has(offer.category) && isAffiliateOfferActive(offer, now))
    .sort((left, right) => right.priority - left.priority || String(left.id).localeCompare(String(right.id)));
  for (const offer of sortedOffers) {
    if (selectedOffers.length >= Math.max(0, Number(maxOffers) || 0)) break;
    if (selectedOfferIds.has(offer.id)) continue;
    if (selectedCategories.has(offer.category)) continue;
    selectedOfferIds.add(offer.id);
    selectedCategories.add(offer.category);
    selectedOffers.push(offer);
  }
  return selectedOffers;
}

export { DEFAULT_AMAZON_FALLBACK_URL };
