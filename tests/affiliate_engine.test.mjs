import assert from "node:assert/strict";
import { renderPage } from "../scripts/poi_update.mjs";
import {
  buildAffiliateRuntime,
  classifyMonetizationCategory,
  countMonetizationCategories,
  selectAffiliateOffers
} from "../scripts/affiliate_engine.mjs";

const now = new Date("2026-09-03T00:00:00.000Z");

assert.equal(classifyMonetizationCategory({ title: "povo 本気割キャンペーン" }), "mobile");
assert.equal(classifyMonetizationCategory({ title: "PayPay地域キャンペーン" }), "payment");
assert.equal(classifyMonetizationCategory({ title: "三井住友カード Visaの特典" }), "credit-card");
assert.equal(classifyMonetizationCategory({ title: "焼肉店のクーポン" }), "food");

const deals = [
  { id: "mobile", title: "povo 本気割キャンペーン", category: "telecom" },
  { id: "food", title: "レストランのクーポン", category: "food" },
  { id: "payment", title: "PayPayの還元", category: "cashless" }
];
const counts = countMonetizationCategories(deals);
assert.equal(counts.mobile, 1);
assert.equal(counts.food, 1);
assert.equal(counts.payment, 1);

const fallbackRuntime = buildAffiliateRuntime({}, {}, {});
assert.equal(fallbackRuntime.a8.enabled, false);
assert.equal(fallbackRuntime.amazon.isAffiliate, false);
assert.match(fallbackRuntime.amazon.url, /^https:\/\/www\.amazon\.co\.jp\//);
assert.deepEqual(selectAffiliateOffers(deals, fallbackRuntime.offers, { now }), []);

const configuredRuntime = buildAffiliateRuntime(
  {
    a8: { scriptUrl: "https://example.com/a8-link-manager.js" },
    amazon: { enabled: true, associateUrl: "https://www.amazon.co.jp/gp/goldbox/?tag=official-20" }
  },
  {
    offers: [
      {
        id: "mobile-offer",
        category: "mobile",
        title: "通信費も見直す？",
        description: "スマホ・回線の条件を確認する。",
        buttonLabel: "通信サービスを見る",
        provider: "a8",
        priority: 80,
        enabled: true,
        url: "https://example.com/mobile"
      },
      {
        id: "food-offer",
        category: "food",
        title: "食費もお得に",
        description: "利用条件を公式ページで確認する。",
        buttonLabel: "サービスを見る",
        provider: "a8",
        priority: 70,
        enabled: true,
        url: "https://example.com/food"
      },
      {
        id: "disabled-offer",
        category: "payment",
        priority: 100,
        enabled: false,
        url: "https://example.com/disabled"
      },
      {
        id: "expired-offer",
        category: "payment",
        priority: 99,
        enabled: true,
        endAt: "2026-09-02T23:59:59+09:00",
        url: "https://example.com/expired"
      }
    ]
  },
  {}
);

const selected = selectAffiliateOffers(deals, configuredRuntime.offers, { now, maxOffers: 3 });
assert.deepEqual(selected.map((offer) => offer.id), ["mobile-offer", "food-offer"]);
assert.equal(configuredRuntime.a8.enabled, true);
assert.equal(configuredRuntime.amazon.isAffiliate, true);

const page = renderPage({
  schemaVersion: 1,
  canonicalUrl: "https://example.com/otoku/",
  publishedAt: "2026-09-01T00:00:00+09:00",
  checkedAt: "2026-09-03T06:00:00+09:00",
  contentModifiedAt: "2026-09-03T06:00:00+09:00",
  deals: deals.map((deal) => ({
    ...deal,
    title: deal.title,
    merchant: deal.title,
    service: deal.title,
    benefitShort: "条件を確認して利用",
    benefit: "条件を確認して利用",
    condition: "公式ページで条件を確認する。",
    target: "対象者",
    action: "公式ページを見る。",
    endDate: null,
    endDateLabel: "公式ページで確認",
    applicationRequired: false,
    officialUrl: "https://example.com/official/" + deal.id,
    canonicalizedOfficialUrl: "https://example.com/official/" + deal.id,
    monetizationCategory: classifyMonetizationCategory(deal)
  })),
  dealCount: deals.length
}, { siteUrl: "https://example.com", now, affiliateRuntime: configuredRuntime });

assert.match(page, /a8-link-manager\.js/);
assert.match(page, /Amazon 今日のセールをチェック/);
assert.match(page, /data-affiliate-offer-id="mobile-offer"/);
assert.match(page, /data-affiliate-offer-id="food-offer"/);
assert.match(page, /data-amazon-sale-click="true"/);
assert.match(page, /rel="noopener noreferrer sponsored"/);

console.log("affiliate engine tests passed");
