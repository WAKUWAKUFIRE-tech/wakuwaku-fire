const fireLifePageReady = window.__wakuwakuFireLifeReady || import("../data/fire-life.js?v=8");

const lifeElements = {
  level: document.querySelector("#life-level"),
  exp: document.querySelector("#life-exp"),
  next: document.querySelector("#life-next"),
  expBar: document.querySelector("#life-exp-bar"),
  expProgress: document.querySelector(".life-exp-bar"),
  streak: document.querySelector("#life-streak"),
  visits: document.querySelector("#life-visits"),
  displayName: document.querySelector("#life-display-name"),
  avatar: document.querySelector(".life-profile-card__avatar"),
  nicknameForm: document.querySelector("[data-nickname-form]"),
  nicknameInput: document.querySelector("#life-nickname-input"),
  nicknameStatus: document.querySelector("[data-nickname-status]"),
  badgeCount: document.querySelector("#badge-count"),
  earnedBadges: document.querySelector("#earned-badges"),
  badgeEmpty: document.querySelector("#badge-empty"),
  nextBadges: document.querySelector("#next-badges-list"),
  footprints: document.querySelector("#life-footprints"),
  footprintsEmpty: document.querySelector("#life-footprints-empty"),
  footprintsNote: document.querySelector("#life-footprints-note"),
  footprintsToggle: document.querySelector("[data-footprints-toggle]"),
  detailDialog: document.querySelector("#badge-detail-dialog"),
  detailMark: document.querySelector("#badge-detail-mark"),
  detailCategory: document.querySelector("#badge-detail-category"),
  detailTitle: document.querySelector("#badge-detail-title"),
  detailCondition: document.querySelector("#badge-detail-condition"),
  detailDate: document.querySelector("#badge-detail-date"),
  detailDescription: document.querySelector("#badge-detail-description"),
  detailLegacy: document.querySelector("#badge-detail-legacy"),
  reset: document.querySelector("[data-reset-fire-life]"),
  exportData: document.querySelector("[data-export-fire-life]"),
  importData: document.querySelector("[data-import-fire-life]"),
  importInput: document.querySelector("[data-import-fire-life-input]"),
  dataStatus: document.querySelector("[data-data-status]"),
  futureCta: document.querySelector("[data-future-cta]"),
  devTools: document.querySelector("[data-dev-tools]"),
  devLevels: document.querySelectorAll("[data-dev-level]"),
  previewBadges: document.querySelectorAll("[data-preview-badge-category]"),
};

let footprintsExpanded = false;
let levelBadgesExpanded = false;

const PREVIEW_BADGE_IDS = Object.freeze({
  level: "level-50-time-traveler",
  discovery: "discovery-world-tour",
  streak: "streak-30",
  visit: "visit-30-usual-seat",
});

function getNicknameInitial(nickname) {
  return nickname ? Array.from(nickname)[0] : "W";
}

function getCategoryLabel(api, category) {
  return api.categoryLabels[category] || String(category || "BADGE").toUpperCase();
}

const SVG_NS = "http://www.w3.org/2000/svg";

const BADGE_FRAME_PATHS = Object.freeze({
  circle: "M60 7a53 53 0 1 1 0 106a53 53 0 1 1 0-106Z",
  medal: "M60 8C32 8 15 26 15 52v11c0 25 18 43 45 49 27-6 45-24 45-49V52C105 26 88 8 60 8Z",
  shield: "M60 6l46 17v33c0 28-17 49-46 58C31 105 14 84 14 56V23L60 6Z",
  hex: "M32 8h56l24 25v54l-24 25H32L8 87V33L32 8Z",
});

/*
 * レベル称号は「枠の中にアイコンを置く」のではなく、
 * 主役・補助・背景紋様の3層でひとつの物語になるように描きます。
 * SVG文字列をここへ集約しているため、後から紋章だけ差し替えられます。
 */
const LEVEL_BADGE_ARTWORK = Object.freeze({
  "level-1-ember": `
    <g class="badge-emblem__art-bg">
      <circle cx="60" cy="60" r="31" />
      <path d="M31 84a37 37 0 0 1 58 0M36 41l-7-5M84 41l7-5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M39 86h42M45 86l5-8h20l5 8" />
      <path d="M43 48h8M69 48h8M48 40h5M67 40h5" opacity=".7" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M60 78c-13 0-21-8-21-18 0-8 5-14 13-21-1 8 3 12 8 15-1-10 3-18 10-25 1 12 12 17 12 30 0 11-8 19-22 19Z" />
      <path class="badge-emblem__art-highlight" d="M59 69c-5 0-8-3-8-7 0-3 2-6 5-9 0 4 2 6 5 7-1-4 1-8 4-11 0 6 5 8 5 13 0 4-4 7-11 7Z" />
    </g>
  `,
  "level-5-shield-trail": `
    <g class="badge-emblem__art-bg">
      <circle cx="60" cy="60" r="35" stroke-dasharray="1 5" />
      <path d="M30 88c12-10 23-13 32-8 8 4 16 2 28-7" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M32 86c10-8 19-10 27-6" />
      <circle cx="32" cy="86" r="3" /><circle cx="46" cy="79" r="2.5" />
      <path d="M60 29l24 9v18c0 15-10 24-24 30-14-6-24-15-24-30V38z" class="badge-emblem__art-secondary-fill" />
    </g>
    <g class="badge-emblem__art-primary">
      <path d="M60 29l24 9v18c0 15-10 24-24 30-14-6-24-15-24-30V38z" />
      <path class="badge-emblem__art-primary-fill" d="M60 40l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z" />
    </g>
  `,
  "level-10-wayfinder": `
    <g class="badge-emblem__art-bg">
      <path d="M60 21v12M60 87v12M21 60h12M87 60h12M33 33l8 8M79 79l8 8M87 33l-8 8M41 79l-8 8" />
      <circle cx="60" cy="60" r="37" stroke-dasharray="2 5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M60 76c7-12 14-18 22-23 4-2 8-3 12-3" />
      <path d="M88 45h7v8" />
      <path class="badge-emblem__art-secondary-fill" d="M88 43l10 3-10 7z" />
      <path d="M60 76c4-5 8-8 13-11" stroke-dasharray="1 4" />
    </g>
    <g class="badge-emblem__art-primary">
      <circle cx="60" cy="56" r="25" class="badge-emblem__art-primary-fill" />
      <path d="M60 34v44M38 56h44" />
      <path class="badge-emblem__art-highlight" d="M60 34l7 22-7 22-7-22z" />
      <circle cx="60" cy="56" r="4" class="badge-emblem__art-primary-fill" />
    </g>
  `,
  "level-15-dawn-seeker": `
    <g class="badge-emblem__art-bg">
      <path d="M27 62a34 34 0 0 1 66 0" />
      <path d="M37 37a31 31 0 0 1 46 0" stroke-dasharray="1 5" />
      <circle cx="84" cy="31" r="3" class="badge-emblem__art-bg-fill" />
    </g>
    <g class="badge-emblem__art-secondary">
      <circle cx="60" cy="48" r="12" class="badge-emblem__art-secondary-fill" />
      <path d="M60 27v7M43 34l5 5M77 34l-5 5M35 48h8M85 48h-8" />
      <path d="M30 87h60" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M25 86l20-25 10 12 13-20 27 33z" />
      <path d="M25 86l20-25 10 12 13-20 27 33" />
      <path d="M45 61l10 12M68 53l8 11" class="badge-emblem__art-highlight" />
      <path class="badge-emblem__art-primary-fill" d="M60 27l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
    </g>
  `,
  "level-20-open-road": `
    <g class="badge-emblem__art-bg">
      <path d="M29 36c17 13 31 13 45 0 7-6 12-5 17 0" stroke-dasharray="2 5" />
      <path d="M27 91h66" />
      <circle cx="60" cy="60" r="34" stroke-dasharray="3 6" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M60 82V58M60 58L39 39M60 58l22-19" opacity=".42" />
      <path d="M39 39c-5 8-5 17 1 23" stroke-dasharray="2 4" opacity=".48" />
      <path d="M60 82c0-11 7-20 21-30" stroke-width="5" />
      <circle cx="39" cy="39" r="3" />
    </g>
    <g class="badge-emblem__art-primary">
      <path d="M60 82V58M60 58l22-19" />
      <path class="badge-emblem__art-primary-fill" d="M82 34l10 5-10 7z" />
      <path class="badge-emblem__art-highlight" d="M60 82c0-11 7-20 21-30" />
      <circle cx="60" cy="58" r="5" class="badge-emblem__art-primary-fill" />
    </g>
  `,
  "level-25-off-the-rails": `
    <g class="badge-emblem__art-bg">
      <path d="M31 28v62M45 28v62M75 28v62M89 28v62M25 42h70M25 58h70M25 74h70" opacity=".75" />
      <path d="M30 32h60M30 88h60" stroke-dasharray="1 4" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M40 28v38c0 12 6 20 20 26" />
      <path d="M80 28v25c0 12-8 19-20 23" opacity=".35" />
      <circle cx="49" cy="72" r="3" /><circle cx="57" cy="81" r="3" />
    </g>
    <g class="badge-emblem__art-primary">
      <path d="M60 90c-9-12-14-23-10-34 4-10 12-15 20-23" />
      <path class="badge-emblem__art-primary-fill" d="M70 30l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z" />
      <path d="M60 90c-2-10-1-18 5-25" class="badge-emblem__art-highlight" />
    </g>
  `,
  "level-30-true-north": `
    <g class="badge-emblem__art-bg">
      <path d="M27 60a33 33 0 0 1 66 0M33 42a33 33 0 0 1 54 0" />
      <path d="M60 21v78M21 60h78" stroke-dasharray="1 6" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M60 82c8-14 18-23 31-27" />
      <path d="M88 50h7v7" />
      <path class="badge-emblem__art-secondary-fill" d="M88 48l10 4-10 7z" />
      <circle cx="94" cy="42" r="2" />
    </g>
    <g class="badge-emblem__art-primary">
      <circle cx="60" cy="57" r="25" class="badge-emblem__art-primary-fill" />
      <path d="M60 34v46M37 57h46" />
      <path class="badge-emblem__art-highlight" d="M60 34l9 23-9 23-9-23z" />
      <circle cx="60" cy="57" r="4" class="badge-emblem__art-primary-fill" />
    </g>
  `,
  "level-35-lift-off": `
    <g class="badge-emblem__art-bg">
      <path d="M28 49c11-22 25-29 32-22M92 49C81 27 67 20 60 27" />
      <path d="M34 84c13 7 26 7 38 0" stroke-dasharray="2 5" />
      <circle cx="60" cy="25" r="4" class="badge-emblem__art-bg-fill" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M26 59c10-8 18-9 26-5M94 59c-10-8-18-9-26-5" />
      <path d="M31 69c9-4 15-4 21 0M89 69c-9-4-15-4-21 0" opacity=".65" />
      <path d="M60 40v44" stroke-width="5" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M57 56C47 40 35 34 24 36c8 9 11 20 11 31 8-4 15-3 22 3z" />
      <path class="badge-emblem__art-primary-fill" d="M63 56c10-16 22-22 33-20-8 9-11 20-11 31-8-4-15-3-22 3z" />
      <path d="M60 43v42" />
      <path class="badge-emblem__art-highlight" d="M60 46l4 9-4 10-4-10z" />
    </g>
  `,
  "level-40-life-blueprint": `
    <g class="badge-emblem__art-bg">
      <path d="M28 31h64M28 46h64M28 61h64M28 76h64M43 24v68M58 24v68M73 24v68" />
      <circle cx="60" cy="60" r="34" stroke-dasharray="1 5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M31 84h56M37 86l-6 5M83 86l6 5" />
      <path d="M41 76h38" stroke-dasharray="3 3" />
      <path class="badge-emblem__art-secondary-fill" d="M34 38l8-5 34 45-8 5z" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M36 35c13 2 23 8 31 18l16 22-7 8-18-20c-8-9-14-17-22-28z" />
      <path d="M36 35c13 2 23 8 31 18l16 22-7 8-18-20c-8-9-14-17-22-28z" />
      <path d="M70 76l-13 12M82 76l-6 13" />
      <path class="badge-emblem__art-highlight" d="M38 37l12 7-7 7z" />
    </g>
  `,
  "level-45-hourglass-crown": `
    <g class="badge-emblem__art-bg">
      <circle cx="60" cy="60" r="35" stroke-dasharray="2 5" />
      <path d="M30 86a39 39 0 0 1 13-10M90 86A39 39 0 0 0 77 76" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M33 55c-6 8-6 18 0 26M87 55c6 8 6 18 0 26" />
      <path d="M39 81l5 5 5-5M81 81l-5 5-5-5" />
      <path class="badge-emblem__art-secondary-fill" d="M60 35l8 9-8 8-8-8z" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M44 32h32v7l-10 18 10 18v7H44v-7l10-18-10-18z" />
      <path d="M44 32h32M44 82h32M54 57h12" />
      <path class="badge-emblem__art-highlight" d="M53 41h14l-7 14zM53 73h14l-7-12z" />
      <path class="badge-emblem__art-primary-fill" d="M60 24l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" />
    </g>
  `,
  "level-50-reclaimed-time": `
    <g class="badge-emblem__art-bg">
      <path d="M26 54a35 35 0 0 1 61-19M94 67a35 35 0 0 1-61 19" />
      <path d="M33 31a41 41 0 0 1 54 0M33 89a41 41 0 0 0 54 0" stroke-dasharray="2 5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M32 86h56" />
      <path d="M38 72c6-5 11-6 16-2M48 84c5-5 10-6 15-2" />
      <path class="badge-emblem__art-secondary-fill" d="M40 68c-5 0-8-3-8-7 0-4 3-7 8-10 0 4 2 6 5 8 0 5-2 9-5 9zM57 82c-5 0-8-3-8-7 0-4 3-7 8-10 0 4 2 6 5 8 0 5-2 9-5 9z" />
    </g>
    <g class="badge-emblem__art-primary">
      <circle cx="71" cy="46" r="18" class="badge-emblem__art-primary-fill" />
      <path d="M71 32v15l10 7M71 24v5M91 46h-5" />
      <path class="badge-emblem__art-highlight" d="M71 34v12l8 5" />
      <path d="M37 42c5 5 7 10 7 16" stroke-width="5" />
    </g>
  `,
  "level-55-open-gate": `
    <g class="badge-emblem__art-bg">
      <path d="M26 85h68M37 72a34 34 0 0 1 46 0" />
      <path d="M60 22v18M43 29l9 11M77 29l-9 11" stroke-dasharray="2 5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M37 79c-8-3-11-9-7-15 3-4 8-5 12-2M83 79c8-3 11-9 7-15-3-4-8-5-12-2" />
      <path d="M31 85h58" stroke-width="5" />
      <path d="M46 78l-5 7M74 78l5 7" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M31 84V47c0-17 12-29 29-29s29 12 29 29v37H77V48c0-10-7-17-17-17S43 38 43 48v36z" />
      <path d="M31 84V47c0-17 12-29 29-29s29 12 29 29v37M43 84V48c0-10 7-17 17-17s17 7 17 17v36" />
      <path class="badge-emblem__art-highlight" d="M60 47L45 84h30z" />
      <path d="M60 47v37M45 84h30" />
    </g>
  `,
  "level-60-slow-sun": `
    <g class="badge-emblem__art-bg">
      <path d="M27 43a35 35 0 0 1 66 0M31 52a31 31 0 0 1 58 0" />
      <path d="M28 89h64" stroke-dasharray="2 5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M31 89c10-17 20-19 29-9 7 8 14 5 28-9" />
      <path d="M37 87c-1-7 2-11 8-13M79 87c1-7-2-11-8-13" />
      <path d="M37 88l-5-8M79 88l5-8" />
    </g>
    <g class="badge-emblem__art-primary">
      <circle cx="60" cy="42" r="15" class="badge-emblem__art-primary-fill" />
      <path d="M60 20v7M60 57v7M38 42h7M75 42h7M44 26l5 5M76 26l-5 5" />
      <path class="badge-emblem__art-highlight" d="M31 88c10-17 20-19 29-9 7 8 14 5 28-9" />
      <circle cx="34" cy="79" r="3" class="badge-emblem__art-primary-fill" />
    </g>
  `,
  "level-65-quiet-courage": `
    <g class="badge-emblem__art-bg">
      <circle cx="60" cy="60" r="36" stroke-dasharray="1 6" />
      <path d="M78 32a18 18 0 0 0-14 30 18 18 0 0 0 14-30z" />
      <circle cx="82" cy="31" r="2" class="badge-emblem__art-bg-fill" />
      <circle cx="91" cy="42" r="2" class="badge-emblem__art-bg-fill" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M46 34c-6-7-2-11 3-15M60 34c-4-8 1-11 5-15M74 35c-2-6 2-9 6-12" />
      <path d="M36 84h48" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M38 48h39v17c0 11-8 18-20 18s-19-7-19-18z" />
      <path d="M77 54h7c6 0 9 4 9 9s-3 10-9 10h-7M47 84h26" />
      <path class="badge-emblem__art-highlight" d="M44 62h27c-2 9-7 13-14 13s-11-4-13-13z" />
    </g>
  `,
  "level-70-hideout": `
    <g class="badge-emblem__art-bg">
      <path d="M27 42c10-13 19-15 29-6 10-9 19-7 37 6" />
      <path d="M31 88c10-9 19-12 29-8 10-4 19-1 29 8" stroke-dasharray="2 5" />
      <circle cx="37" cy="28" r="3" class="badge-emblem__art-bg-fill" />
      <circle cx="84" cy="29" r="3" class="badge-emblem__art-bg-fill" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M82 49v25M77 54h10M78 74h8" />
      <path class="badge-emblem__art-secondary-fill" d="M82 38c-4 5-5 9 0 13 5-4 4-8 0-13z" />
      <path d="M31 83h58" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M31 78l29-30 29 30z" />
      <path d="M40 78V59h40v19M52 78V67h16v11" />
      <path class="badge-emblem__art-highlight" d="M60 33l4 7 8 1-6 5 2 8-8-4-8 4 2-8-6-5 8-1z" />
      <path d="M31 84h58" />
    </g>
  `,
  "level-75-celebration": `
    <g class="badge-emblem__art-bg">
      <circle cx="60" cy="60" r="37" stroke-dasharray="1 6" />
      <path d="M60 21v16M60 83v16M21 60h16M83 60h16M32 32l11 11M77 77l11 11M88 32L77 43M43 77L32 88" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M36 42l5 5M84 42l-5 5M37 77l5-5M83 77l-5-5" />
      <path class="badge-emblem__art-secondary-fill" d="M30 62h9M81 62h9M60 30v9M60 81v9" />
      <path d="M40 87c12 7 28 7 40 0" stroke-dasharray="2 4" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M60 27l6 22 22 11-22 11-6 22-6-22-22-11 22-11z" />
      <path d="M60 39v42M39 60h42" />
      <path class="badge-emblem__art-highlight" d="M60 44l4 16-4 16-4-16z" />
      <circle cx="60" cy="60" r="5" class="badge-emblem__art-primary-fill" />
    </g>
  `,
  "level-80-play-crown": `
    <g class="badge-emblem__art-bg">
      <path d="M29 42a42 42 0 0 1 62 0M25 60a37 37 0 0 1 70 0" />
      <path d="M30 87h60" stroke-dasharray="2 5" />
      <circle cx="28" cy="33" r="2" class="badge-emblem__art-bg-fill" />
      <circle cx="92" cy="33" r="2" class="badge-emblem__art-bg-fill" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M60 77v11M45 88h30" />
      <path class="badge-emblem__art-secondary-fill" d="M60 78c-7 0-10-4-10-9 0-4 3-7 6-10 0 4 2 6 4 7 0-5 3-8 5-11 0 6 6 8 6 14 0 5-3 9-11 9Z" />
      <circle cx="60" cy="88" r="4" class="badge-emblem__art-secondary-fill" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M34 39l13 10 13-17 13 17 13-10-4 35H38z" />
      <path d="M34 39l13 10 13-17 13 17 13-10-4 35H38zM39 75h42" />
      <circle cx="47" cy="49" r="3" class="badge-emblem__art-highlight" /><circle cx="60" cy="32" r="3" class="badge-emblem__art-highlight" /><circle cx="73" cy="49" r="3" class="badge-emblem__art-highlight" />
    </g>
  `,
  "level-85-now-strike": `
    <g class="badge-emblem__art-bg">
      <path d="M28 32l20 7M24 48l22 3M25 67l22-2M31 84l19-7" opacity=".7" />
      <path d="M75 29a35 35 0 0 1 20 31M78 91a38 38 0 0 1-20 5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M38 87c4-8 8-11 13-9 4 2 7 0 10-5" />
      <path class="badge-emblem__art-secondary-fill" d="M38 87c-4 0-7-3-7-7 0-3 2-5 5-8 0 3 1 5 3 6 0-3 2-5 4-7 0 5 4 7 4 11 0 3-3 5-9 5Z" />
      <path d="M73 33l8 5M77 43l9 1" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M69 20L39 59h20l-7 41 30-51H61z" />
      <path d="M69 20L39 59h20l-7 41 30-51H61z" />
      <path class="badge-emblem__art-highlight" d="M62 31l-17 23h15l-3 18 15-27H59z" />
    </g>
  `,
  "level-90-spark-return": `
    <g class="badge-emblem__art-bg">
      <circle cx="60" cy="60" r="36" stroke-dasharray="2 6" />
      <path d="M60 23c-21 6-30 18-27 33 2 13 12 22 28 27M60 23c20 4 30 15 30 29" />
      <circle cx="30" cy="39" r="3" class="badge-emblem__art-bg-fill" /><circle cx="90" cy="45" r="3" class="badge-emblem__art-bg-fill" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M35 76l5 5M85 76l-5 5M37 48l6-2M83 48l-6-2" />
      <path d="M60 87c8-5 14-11 17-19" stroke-width="5" />
      <circle cx="60" cy="87" r="3" class="badge-emblem__art-secondary-fill" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M60 25l7 25 25 10-25 10-7 25-7-25-25-10 25-10z" />
      <path d="M60 40v40M40 60h40" />
      <path class="badge-emblem__art-highlight" d="M60 43l5 17-5 17-5-17z" />
      <circle cx="60" cy="60" r="5" class="badge-emblem__art-primary-fill" />
    </g>
  `,
  "level-95-uncharted-map": `
    <g class="badge-emblem__art-bg">
      <path d="M25 37c14-10 25-8 35 1 10 9 21 10 35-1M25 52c13-8 24-7 35 2 11 9 22 9 35 1M25 68c12-8 24-8 35 0 10 8 22 8 35-1" />
      <path d="M28 88h64" stroke-dasharray="2 5" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M60 83c-10-15-16-24-13-32 3-8 10-13 21-19" />
      <path class="badge-emblem__art-secondary-fill" d="M74 31l4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z" />
      <circle cx="48" cy="51" r="3" /><circle cx="53" cy="60" r="2" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M28 35l23-9 18 9 23-9v55l-23 9-18-9-23 9z" />
      <path d="M51 26v55M69 35v55" />
      <path d="M35 72c7-9 13-13 20-12 7 1 13-3 18-12" stroke-width="5" />
      <circle cx="73" cy="48" r="5" class="badge-emblem__art-highlight" />
    </g>
  `,
  "level-100-legend-banner": `
    <g class="badge-emblem__art-bg">
      <circle cx="60" cy="59" r="38" />
      <circle cx="60" cy="59" r="31" stroke-dasharray="2 5" />
      <path d="M60 18v10M60 90v10M19 59h10M91 59h10M31 30l7 7M82 81l7 7M89 30l-7 7M38 81l-7 7" />
    </g>
    <g class="badge-emblem__art-secondary">
      <path d="M35 71c-8 4-11 11-8 18 4-5 8-6 14-5M85 71c8 4 11 11 8 18-4-5-8-6-14-5" />
      <path class="badge-emblem__art-secondary-fill" d="M37 84c7-5 15-5 23 2 8-7 16-7 23-2-7 7-15 8-23 2-8 6-16 5-23-2z" />
      <path d="M60 82c-8-9-12-16-12-22 0-5 3-9 7-13 0 5 2 8 5 10 0-7 4-12 9-17 0 10 8 14 8 22 0 9-7 16-17 20Z" class="badge-emblem__art-secondary-fill" />
    </g>
    <g class="badge-emblem__art-primary">
      <path class="badge-emblem__art-primary-fill" d="M39 35c8 5 14 3 21-7 7 10 13 12 21 7v34c-8 5-14 3-21-7-7 10-13 12-21 7z" />
      <path d="M39 35c8 5 14 3 21-7 7 10 13 12 21 7M39 69c8-5 14-3 21 7 7-10 13-12 21-7M60 28v48" />
      <path class="badge-emblem__art-highlight" d="M60 21l4 7 8 1-6 5 2 8-8-4-8 4 2-8-6-5 8-1z" />
    </g>
  `,
});

const BADGE_ARTWORK = Object.freeze({
  ...LEVEL_BADGE_ARTWORK,
  ember: '<path class="badge-emblem__art-fill" d="M60 89c-16 0-27-10-27-25 0-11 7-20 17-29-1 12 5 18 12 22-2-13 4-25 13-35 1 18 19 23 19 42 0 14-11 25-34 25Z"/><path class="badge-emblem__cutout" d="M60 80c-6 0-11-4-11-10 0-5 3-9 8-14 0 6 3 9 6 11 0-5 2-9 5-13 1 8 8 11 8 17 0 5-5 9-16 9Z"/>',
  spark: '<path class="badge-emblem__art-fill" d="M60 22l7 29 31 9-31 9-7 29-7-29-31-9 31-9z"/><circle class="badge-emblem__art-dot" cx="31" cy="42" r="3"/><circle class="badge-emblem__art-dot" cx="89" cy="79" r="3"/>',
  compass: '<circle class="badge-emblem__art-ring" cx="60" cy="60" r="29"/><path class="badge-emblem__art-fill" d="M60 31l8 29-8 29-8-29z"/><path class="badge-emblem__art" d="M60 37v46M37 60h46"/><circle class="badge-emblem__art-dot" cx="60" cy="60" r="4"/>',
  horizon: '<circle class="badge-emblem__art-fill" cx="60" cy="43" r="13"/><path class="badge-emblem__art" d="M27 83l23-27 12 14 11-18 20 31M29 88h62"/>',
  cut: '<circle class="badge-emblem__art-ring" cx="39" cy="40" r="8"/><circle class="badge-emblem__art-ring" cx="39" cy="80" r="8"/><path class="badge-emblem__art" d="M45 46l37 32M45 74l37-32"/>',
  orbit: '<ellipse class="badge-emblem__art-ring" cx="60" cy="60" rx="35" ry="16" transform="rotate(-24 60 60)"/><path class="badge-emblem__art-fill" d="M60 41l11 19-11 19-11-19z"/><circle class="badge-emblem__art-dot" cx="89" cy="44" r="4"/>',
  arrow: '<path class="badge-emblem__art" d="M29 73h51M67 57l16 16-16 16M29 73V43h26"/><circle class="badge-emblem__art-dot" cx="29" cy="43" r="3"/>',
  wings: '<path class="badge-emblem__art" d="M57 55C46 39 34 32 24 35c8 9 11 20 11 31 8-4 15-3 22 2M63 55c11-16 23-23 33-20-8 9-11 20-11 31-8-4-15-3-22 2M60 51v37"/>',
  blueprint: '<rect class="badge-emblem__art-ring" x="29" y="29" width="62" height="62" rx="4"/><path class="badge-emblem__art-muted" d="M43 29v62M58 29v62M74 29v62M29 45h62M29 61h62M29 77h62"/>',
  clock: '<circle class="badge-emblem__art-ring" cx="60" cy="60" r="29"/><path class="badge-emblem__art" d="M60 42v19l14 9"/><circle class="badge-emblem__art-dot" cx="60" cy="60" r="4"/><path class="badge-emblem__art-muted" d="M60 25v6M95 60h-6M60 95v-6M25 60h6"/>',
  rewind: '<path class="badge-emblem__art-fill" d="M49 34L27 60l22 26zM83 34L61 60l22 26z"/><path class="badge-emblem__art" d="M27 60h61"/>',
  ticket: '<path class="badge-emblem__art" d="M27 39h66v15a8 8 0 0 0 0 12v15H27V66a8 8 0 0 0 0-12z"/><path class="badge-emblem__art-muted" d="M52 42v36M67 42v36"/><circle class="badge-emblem__art-dot" cx="42" cy="60" r="3"/>',
  sun: '<circle class="badge-emblem__art-fill" cx="60" cy="60" r="15"/><path class="badge-emblem__art" d="M60 25v12M60 83v12M25 60h12M83 60h12M35 35l9 9M76 76l9 9M85 35l-9 9M44 76l-9 9"/>',
  cup: '<path class="badge-emblem__art" d="M37 42h39v19c0 11-8 18-19 18s-20-7-20-18zM76 48h7c6 0 9 4 9 9s-3 10-9 10h-7M47 87h26"/>',
  camp: '<path class="badge-emblem__art" d="M26 86l34-52 34 52M37 69h46M47 55l13 15 13-15"/><path class="badge-emblem__art-fill" d="M60 84c-6 0-10-4-10-9 0-4 3-7 6-10 0 4 2 6 4 7 0-5 3-8 5-11 0 6 7 8 7 14 0 5-4 9-12 9Z"/>',
  play: '<circle class="badge-emblem__art-ring" cx="60" cy="60" r="31"/><path class="badge-emblem__art-fill" d="M51 42l27 18-27 18z"/><path class="badge-emblem__art-muted" d="M34 60h9M77 60h9"/>',
  bolt: '<path class="badge-emblem__art-fill" d="M68 24L38 64h21l-6 33 29-43H61z"/>',
  map: '<path class="badge-emblem__art" d="M27 33l23-9 20 9 23-9v64l-23 9-20-9-23 9zM50 24v64M70 33v64"/><path class="badge-emblem__art-muted" d="M35 49h8M78 51h8"/>',
  flag: '<path class="badge-emblem__art" d="M39 92V28M39 31c17 10 25-9 43 2v31c-18-11-26 8-43-2"/><circle class="badge-emblem__art-dot" cx="39" cy="22" r="4"/>',
  lens: '<circle class="badge-emblem__art-ring" cx="55" cy="54" r="22"/><path class="badge-emblem__art" d="M71 70l19 19"/><path class="badge-emblem__art-fill" d="M55 39l4 11 12 4-12 4-4 12-4-12-12-4 12-4z"/>',
  flask: '<path class="badge-emblem__art" d="M49 25h22M54 25v23L37 80c-3 6 1 11 8 11h30c7 0 11-5 8-11L66 48V25M45 69h30"/><circle class="badge-emblem__art-dot" cx="57" cy="60" r="3"/><circle class="badge-emblem__art-dot" cx="68" cy="54" r="2"/>',
  paw: '<circle class="badge-emblem__art-fill" cx="39" cy="43" r="7"/><circle class="badge-emblem__art-fill" cx="57" cy="35" r="7"/><circle class="badge-emblem__art-fill" cx="76" cy="43" r="7"/><path class="badge-emblem__art-fill" d="M60 86c-13 0-23-7-23-17 0-9 8-15 15-15 4 0 6 2 8 4 2-2 4-4 8-4 7 0 15 6 15 15 0 10-10 17-23 17Z"/>',
  risk: '<path class="badge-emblem__art" d="M26 76l18-20 12 12 21-32 17 14"/><path class="badge-emblem__art-muted" d="M31 89h58M60 26v13"/><circle class="badge-emblem__art-dot" cx="60" cy="22" r="4"/>',
  flower: '<path class="badge-emblem__art" d="M60 54v36M60 70c-10-8-17-8-23-3M60 78c10-8 17-8 23-3"/><circle class="badge-emblem__art-fill" cx="60" cy="47" r="9"/><circle class="badge-emblem__art-ring" cx="60" cy="32" r="9"/><circle class="badge-emblem__art-ring" cx="45" cy="47" r="9"/><circle class="badge-emblem__art-ring" cx="75" cy="47" r="9"/>',
  trail: '<path class="badge-emblem__art" d="M29 77c10-21 22-30 35-27 12 3 18 0 27-12M36 91c9-13 17-17 26-14 10 3 17 1 24-6"/><circle class="badge-emblem__art-dot" cx="29" cy="77" r="4"/><circle class="badge-emblem__art-dot" cx="92" cy="38" r="4"/>',
  sprout: '<path class="badge-emblem__art" d="M60 89V53M60 65C49 53 39 52 31 57c6 10 16 14 29 11M60 58c7-14 17-20 29-18-1 14-10 22-26 24"/><circle class="badge-emblem__art-dot" cx="60" cy="43" r="4"/>',
  "home-flame": '<path class="badge-emblem__art" d="M29 57l31-27 31 27v30H29zM47 87V67h26v20"/><path class="badge-emblem__art-fill" d="M60 79c-7 0-12-5-12-11 0-5 4-9 8-14 0 6 3 8 6 10 0-5 3-10 7-14 0 9 9 12 9 20 0 5-5 9-18 9Z"/>',
  calendar: '<rect class="badge-emblem__art-ring" x="29" y="31" width="62" height="59" rx="5"/><path class="badge-emblem__art" d="M29 48h62M44 25v13M76 25v13M43 61h1M59 61h1M75 61h1M43 76h1M59 76h1M75 76h1"/>',
  seat: '<path class="badge-emblem__art" d="M38 40v24h45M38 64l-8 27M83 64l8 27M38 40h36c5 0 9 4 9 9v15M38 64h45"/><path class="badge-emblem__art-muted" d="M29 91h63"/>',
  village: '<path class="badge-emblem__art" d="M25 87V57l15-13 15 13v30M55 87V49l17-15 17 15v38M38 87V72h5v15M69 87V70h6v17"/><circle class="badge-emblem__art-dot" cx="40" cy="62" r="3"/><circle class="badge-emblem__art-dot" cx="72" cy="55" r="3"/>',
  tree: '<path class="badge-emblem__art" d="M60 54v37M48 91h24M60 68L46 56M60 76l16-15"/><path class="badge-emblem__art-fill" d="M60 24c-10 0-17 8-15 17-10-1-17 6-17 15 0 10 8 17 18 17h28c10 0 18-7 18-17 0-9-7-16-17-15 2-9-5-17-15-17Z"/>',
  home: '<path class="badge-emblem__art" d="M27 57l33-28 33 28v32H27zM48 89V68h24v21M38 56h5M77 56h5"/>',
});

const DEFAULT_BADGE_ART = Object.freeze({
  level: "ember",
  discovery: "compass",
  streak: "trail",
  visit: "compass",
  legacy: "spark",
});

const BADGE_TIER_ORNAMENTS = Object.freeze({
  origin: '<path d="M39 23l5 5M81 23l-5 5" /><circle cx="35" cy="20" r="2" /><circle cx="85" cy="20" r="2" />',
  relic: '<path d="M28 30a42 42 0 0 1 64 0M28 90a42 42 0 0 0 64 0" /><path d="M31 26l4 7 8 1-6 5M89 26l-4 7-8 1 6 5" />',
  legend: '<path d="M24 36c8-11 18-16 29-14M96 36c-8-11-18-16-29-14M24 84c8 11 18 16 29 14M96 84c-8 11-18 16-29 14" /><path d="M27 45l-5-4M93 45l5-4M27 75l-5 4M93 75l5 4" /><circle cx="21" cy="40" r="2" /><circle cx="99" cy="40" r="2" /><circle cx="21" cy="80" r="2" /><circle cx="99" cy="80" r="2" />',
  side: '<circle cx="30" cy="25" r="2" /><circle cx="90" cy="25" r="2" />',
});

const BADGE_SHAPE_ORNAMENTS = Object.freeze({
  circle: '<path d="M30 42a34 34 0 0 1 60 0M30 78a34 34 0 0 0 60 0" /><path d="M25 60h8M87 60h8" />',
  medal: '<path d="M35 25c7-7 15-10 25-10s18 3 25 10M32 84c8 8 17 12 28 12s20-4 28-12" /><path d="M27 51h7M86 51h7" />',
  shield: '<path d="M31 31l10-8M89 31L79 23M35 88c7 7 15 11 25 14 10-3 18-7 25-14" /><path d="M25 55h8M87 55h8" />',
  hex: '<path d="M36 18h16M68 18h16M20 48l8-7M100 48l-8-7M20 72l8 7M100 72l-8 7" /><path d="M36 102h16M68 102h16" />',
});

let badgeEmblemSequence = 0;

function createBadgeEmblem(badge, { locked = false } = {}) {
  if (!locked && badge.category === "level" && badge.imagePath) {
    const imageEmblem = document.createElement("span");
    imageEmblem.className = `badge-emblem badge-emblem--image badge-tone-${badge.tone || "gray"}`;
    imageEmblem.classList.add(`badge-tier-${badge.tier || "side"}`, "badge-emblem--earned");
    imageEmblem.setAttribute("role", "img");
    imageEmblem.setAttribute("aria-label", badge.name || "獲得バッジ");

    const image = document.createElement("img");
    image.className = "badge-emblem__image";
    image.src = badge.imagePath;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    image.addEventListener("error", () => {
      imageEmblem.replaceWith(createBadgeEmblem({ ...badge, imagePath: null }, { locked }));
    }, { once: true });
    imageEmblem.appendChild(image);

    return imageEmblem;
  }

  const svg = document.createElementNS(SVG_NS, "svg");
  const shape = badge.shape || "circle";
  const frame = BADGE_FRAME_PATHS[shape] || BADGE_FRAME_PATHS.circle;
  const artKey = badge.artKey || DEFAULT_BADGE_ART[badge.category] || "spark";
  const tier = badge.tier || "side";
  const emblemId = `fire-quest-emblem-${++badgeEmblemSequence}`;
  const artwork = locked
    ? '<text class="badge-emblem__question" x="60" y="77">?</text>'
    : BADGE_ARTWORK[artKey] || BADGE_ARTWORK.spark;

  svg.classList.add("badge-emblem", `my-badge--${shape}`, `badge-tone-${badge.tone || "gray"}`);
  svg.classList.add(`badge-tier-${tier}`);
  svg.classList.add(locked ? "badge-emblem--locked" : "badge-emblem--earned");
  svg.style.setProperty("--badge-rim-gradient", `url(#${emblemId}-rim)`);
  svg.style.setProperty("--badge-face-gradient", `url(#${emblemId}-face)`);
  svg.style.setProperty("--badge-pattern-fill", `url(#${emblemId}-pattern)`);
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", locked ? "未取得バッジ" : badge.name || "獲得バッジ");
  svg.innerHTML = `
    <defs>
      <linearGradient id="${emblemId}-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--badge-metal-bright, #ffe8a5)" />
        <stop offset=".28" stop-color="var(--badge-metal, #d6a555)" />
        <stop offset=".58" stop-color="var(--badge-metal-bright, #ffe8a5)" />
        <stop offset="1" stop-color="var(--badge-metal, #a87935)" />
      </linearGradient>
      <radialGradient id="${emblemId}-face" cx="45%" cy="35%" r="72%">
        <stop offset="0" stop-color="var(--badge-face-light, #57405a)" />
        <stop offset=".62" stop-color="var(--badge-face, #302239)" />
        <stop offset="1" stop-color="var(--badge-shell, #171926)" />
      </radialGradient>
      <pattern id="${emblemId}-pattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
        <path class="badge-emblem__pattern-line" d="M0 0v12M6 0v12" />
      </pattern>
    </defs>
    <path class="badge-emblem__halo" d="${frame}" transform="translate(0 1)" />
    <path class="badge-emblem__shadow" d="${frame}" transform="translate(0 3)" />
    <path class="badge-emblem__rim" d="${frame}" />
    <path class="badge-emblem__face" d="${frame}" transform="translate(4 4) scale(.9333)" />
    <path class="badge-emblem__face-pattern" d="${frame}" transform="translate(9 9) scale(.85)" />
    <path class="badge-emblem__inner-line" d="${frame}" transform="translate(9 9) scale(.85)" />
    <g class="badge-emblem__frame-ornament">${BADGE_SHAPE_ORNAMENTS[shape] || BADGE_SHAPE_ORNAMENTS.circle}</g>
    <g class="badge-emblem__tier-ornament">${BADGE_TIER_ORNAMENTS[tier] || BADGE_TIER_ORNAMENTS.side}</g>
    <path class="badge-emblem__crest" d="M60 4l5 7-5 7-5-7z" />
    <path class="badge-emblem__rune" d="M27 98h17M76 98h17" />
    <g class="badge-emblem__art">${artwork}</g>
  `;
  return svg;
}

function createBadgeCard(api, badge, { locked = false, next = false } = {}) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `badge-card badge-card--${badge.category} badge-tone-${badge.tone || "gray"} badge-tier-${badge.tier || "side"}`;
  card.classList.toggle("badge-card--locked", locked);
  card.setAttribute("aria-label", locked ? `${badge.name}（未取得バッジ）の詳細を見る` : `${badge.name}の詳細を見る`);

  const visual = document.createElement("span");
  visual.className = "badge-card__visual";
  const seal = createBadgeEmblem(badge, { locked });
  seal.classList.add("badge-card__seal");
  seal.setAttribute("aria-hidden", "true");
  visual.appendChild(seal);

  const body = document.createElement("span");
  body.className = "badge-card__body";

  const category = document.createElement("span");
  category.className = "badge-card__category";
  category.textContent = getCategoryLabel(api, badge.category);

  const name = document.createElement("strong");
  name.className = "badge-card__name";
  name.textContent = badge.name;

  const condition = document.createElement("span");
  condition.className = "badge-card__condition";
  condition.textContent = badge.condition;

  body.append(category, name, condition);

  if (locked) {
    const status = document.createElement("span");
    status.className = "badge-card__state";
    status.textContent = next ? "次に出会うLEVELバッジ" : "まだ見ぬLEVELバッジ";
    body.appendChild(status);
  } else {
    const date = document.createElement("span");
    date.className = "badge-card__date";
    date.textContent = `獲得日：${api.formatDate(badge.earnedAt)}`;
    body.appendChild(date);
  }

  if (badge.legacy) {
    const legacy = document.createElement("span");
    legacy.className = "badge-card__legacy";
    legacy.textContent = "現在は獲得できないバッジです。";
    body.appendChild(legacy);
  }

  card.append(visual, body);
  card.addEventListener("click", () => openBadgeDetail(api, badge, { locked }));
  return card;
}

function createNextBadge(api, state, badge) {
  const item = document.createElement("article");
  item.className = "next-badge next-badge--locked";
  item.classList.add(`badge-tone-${badge.tone || "gray"}`);

  const seal = createBadgeEmblem(badge, { locked: true });
  seal.classList.add("next-badge__seal");
  seal.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "next-badge__body";

  const category = document.createElement("span");
  category.className = "next-badge__category";
  category.textContent = getCategoryLabel(api, badge.category);

  const name = document.createElement("strong");
  name.className = "next-badge__name";
  name.textContent = badge.name;

  const condition = document.createElement("span");
  condition.className = "next-badge__condition";
  condition.textContent = badge.condition;

  const distance = document.createElement("strong");
  distance.className = "next-badge__distance";
  distance.textContent = api.getBadgeDistance(state, badge).label;

  body.append(category, name, distance, condition);
  item.append(seal, body);
  return item;
}

const EARNED_BADGE_GROUPS = Object.freeze([
  { category: "level", label: "LEVEL", title: "積み重ねたレベル", note: "記事を読むほど、ここに新しい景色が増えていきます。" },
  { category: "discovery", label: "DISCOVERY", title: "見つけた景色", note: "FIRE QUESTを探検して、出会ったコンテンツの記録です。" },
  { category: "streak", label: "STREAK", title: "つないだ火", note: "連続して遊びに来た日々が、あなたの習慣になっています。" },
  { category: "visit", label: "VISIT", title: "帰ってきた日々", note: "離れても、またここへ戻ってきた時間の記録です。" },
  { category: "legacy", label: "LEGACY", title: "受け継いだ足あと", note: "現在は新しく獲得できない、過去から残るバッジです。" },
]);

function getEarnedBadgeGroups(earnedBadges) {
  const badgesByCategory = new Map();
  earnedBadges.forEach((badge) => {
    const badges = badgesByCategory.get(badge.category) || [];
    badges.push(badge);
    badgesByCategory.set(badge.category, badges);
  });

  const knownCategories = new Set(EARNED_BADGE_GROUPS.map((group) => group.category));
  const groups = EARNED_BADGE_GROUPS
    .map((group) => {
      const badges = [...(badgesByCategory.get(group.category) || [])];
      if (group.category === "level") {
        badges.sort((a, b) => Number(a.threshold) - Number(b.threshold));
      }
      return { ...group, badges };
    })
    .filter((group) => group.badges.length > 0);

  // 定義が将来増えても、未知カテゴリの取得記録を画面から隠しません。
  badgesByCategory.forEach((badges, category) => {
    if (!knownCategories.has(category)) {
      groups.push({ category, label: String(category).toUpperCase(), title: "受け継いだ足あと", note: "過去の定義から残っているバッジです。", badges });
    }
  });

  return groups;
}

function getLevelBadgeGroup(api, state, earnedBadges) {
  const definitions = (Array.isArray(api.badgeDefinitions) ? api.badgeDefinitions : [])
    .filter((badge) => badge.category === "level" && !badge.legacy && badge.enabled && Number(badge.threshold) <= 100)
    .sort((a, b) => Number(a.threshold) - Number(b.threshold));
  const earnedById = new Map(
    earnedBadges
      .filter((badge) => badge.category === "level")
      .map((badge) => [badge.id, badge]),
  );
  const earnedDefinitions = definitions
    .filter((badge) => earnedById.has(badge.id))
    .map((badge) => ({ ...badge, earnedAt: earnedById.get(badge.id).earnedAt }));
  const currentLevel = api.getLevelFromExp(state.totalExp);
  const nextBadge = definitions.find((badge) => !earnedById.has(badge.id) && Number(badge.threshold) > currentLevel);
  const badges = levelBadgesExpanded
    ? definitions.map((badge) => earnedById.has(badge.id)
      ? { ...badge, earnedAt: earnedById.get(badge.id).earnedAt }
      : { ...badge, locked: true })
    : [
      ...earnedDefinitions,
      ...(nextBadge ? [{ ...nextBadge, locked: true, isNextLevelPreview: true }] : []),
    ];

  if (badges.length === 0) return null;

  return {
    category: "level",
    label: "LEVEL",
    title: "積み重ねたレベル",
    note: "記事を読むほど、ここに新しい景色が増えていきます。",
    badges,
    earnedCount: earnedDefinitions.length,
    expanded: levelBadgesExpanded,
    canToggle: definitions.length > earnedDefinitions.length,
  };
}

function createEarnedBadgeGroup(api, group) {
  const section = document.createElement("section");
  section.className = `earned-badges__group earned-badges__group--${group.category}`;
  const titleId = `earned-badges-${group.category}-title`;
  section.setAttribute("aria-labelledby", titleId);

  const heading = document.createElement("div");
  heading.className = "earned-badges__group-heading";

  const headingCopy = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "earned-badges__group-eyebrow";
  eyebrow.textContent = group.label;

  const title = document.createElement("h3");
  title.id = titleId;
  title.textContent = group.title;

  const note = document.createElement("p");
  note.className = "earned-badges__group-note";
  note.textContent = group.note;
  headingCopy.append(eyebrow, title, note);

  const count = document.createElement("span");
  count.className = "earned-badges__group-count";
  count.textContent = `${group.earnedCount ?? group.badges.length}個`;
  heading.append(headingCopy, count);

  const grid = document.createElement("div");
  grid.className = "earned-badges__grid";
  grid.id = `${titleId}-grid`;
  grid.append(...group.badges.map((badge) => createBadgeCard(api, badge, {
    locked: Boolean(badge.locked),
    next: Boolean(badge.isNextLevelPreview),
  })));
  section.append(heading, grid);

  if (group.category === "level" && group.canToggle) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "earned-badges__toggle";
    toggle.textContent = group.expanded ? "表示を戻す" : "もっとバッジを見る";
    toggle.setAttribute("aria-expanded", String(Boolean(group.expanded)));
    toggle.setAttribute("aria-controls", grid.id);
    toggle.addEventListener("click", () => {
      levelBadgesExpanded = !levelBadgesExpanded;
      renderLifePage(api);
    });
    section.appendChild(toggle);
  }
  return section;
}

const footprintCategoryLabels = Object.freeze({
  START: "はじまり",
  VISIT: "訪問",
  READ: "読了",
  BADGE: "バッジ",
});

function createFootprint(api, footprint) {
  const item = document.createElement("article");
  item.className = `life-footprint life-footprint--${footprint.category.toLowerCase()}`;

  const marker = document.createElement("span");
  marker.className = "life-footprint__marker";
  marker.setAttribute("aria-hidden", "true");
  if (footprint.category === "BADGE") {
    marker.classList.add("life-footprint__marker--badge");
    marker.appendChild(createBadgeEmblem(footprint));
  } else {
    marker.textContent = footprint.icon || "•";
  }

  const body = document.createElement("div");
  body.className = "life-footprint__body";

  const category = document.createElement("span");
  category.className = "life-footprint__category";
  category.textContent = footprintCategoryLabels[footprint.category] || footprint.category;

  const title = document.createElement("h3");
  title.className = "life-footprint__title";
  title.textContent = footprint.title;

  const detail = document.createElement("p");
  detail.className = "life-footprint__detail";
  detail.textContent = footprint.detail;

  const date = document.createElement("time");
  date.className = "life-footprint__date";
  if (footprint.dateValue) date.dateTime = footprint.dateValue;
  date.textContent = api.formatDate(footprint.dateValue);

  body.append(category, title, detail, date);
  item.append(marker, body);
  return item;
}

function openBadgeDetail(api, badge, { locked = false } = {}) {
  if (!lifeElements.detailDialog) return;

  lifeElements.detailMark.className = "badge-detail-dialog__badge";
  lifeElements.detailMark.replaceChildren(createBadgeEmblem(badge, { locked }));
  lifeElements.detailCategory.textContent = getCategoryLabel(api, badge.category);
  lifeElements.detailTitle.textContent = badge.name;
  lifeElements.detailCondition.textContent = badge.condition;
  lifeElements.detailDate.textContent = locked ? "まだ獲得していません" : api.formatDate(badge.earnedAt);
  lifeElements.detailDescription.textContent = badge.description;
  lifeElements.detailLegacy.hidden = locked || !badge.legacy;

  if (typeof lifeElements.detailDialog.showModal === "function") {
    lifeElements.detailDialog.showModal();
  } else {
    lifeElements.detailDialog.setAttribute("open", "");
  }
}

function closeBadgeDetail() {
  if (!lifeElements.detailDialog) return;
  if (typeof lifeElements.detailDialog.close === "function") {
    lifeElements.detailDialog.close();
  } else {
    lifeElements.detailDialog.removeAttribute("open");
  }
}

function renderLifePage(api) {
  const state = api.loadState();
  const level = api.getLevelFromExp(state.totalExp);
  const progress = api.getLevelProgress(state.totalExp);
  const earnedBadges = api.getEarnedBadges(state);
  const nextBadges = api.getNextBadges(state, 4).filter((badge) => badge.category !== "level").slice(0, 3);
  const levelBadgeGroup = getLevelBadgeGroup(api, state, earnedBadges);
  const allFootprints = api.getFootprints(state, Number.MAX_SAFE_INTEGER);
  const hasMoreFootprints = allFootprints.length > 8;
  if (!hasMoreFootprints) footprintsExpanded = false;
  const footprints = footprintsExpanded ? allFootprints : allFootprints.slice(0, 8);
  const displayName = state.nickname || "名無しの冒険者";

  if (lifeElements.level) lifeElements.level.textContent = String(level);
  if (lifeElements.exp) lifeElements.exp.textContent = `${state.totalExp.toLocaleString("ja-JP")} EXP`;
  if (lifeElements.next) lifeElements.next.textContent = `Lv.${level + 1}まであと${api.getExpToNextLevel(state.totalExp)} EXP`;
  if (lifeElements.displayName) lifeElements.displayName.textContent = displayName;
  if (lifeElements.avatar) lifeElements.avatar.textContent = getNicknameInitial(state.nickname);
  if (lifeElements.nicknameInput && document.activeElement !== lifeElements.nicknameInput) lifeElements.nicknameInput.value = state.nickname;
  if (lifeElements.streak) lifeElements.streak.textContent = `${state.currentStreak}日`;
  if (lifeElements.visits) lifeElements.visits.textContent = `${state.totalVisitDays}日`;
  if (lifeElements.expBar) lifeElements.expBar.style.width = `${progress}%`;
  if (lifeElements.expProgress) lifeElements.expProgress.setAttribute("aria-valuenow", String(progress));
  if (lifeElements.badgeCount) lifeElements.badgeCount.textContent = `${earnedBadges.length}個`;

  if (lifeElements.earnedBadges) {
    const badgeGroups = getEarnedBadgeGroups(earnedBadges).filter((group) => group.category !== "level");
    if (levelBadgeGroup) badgeGroups.unshift(levelBadgeGroup);
    lifeElements.earnedBadges.replaceChildren(...badgeGroups.map((group) => createEarnedBadgeGroup(api, group)));
  }
  if (lifeElements.badgeEmpty) lifeElements.badgeEmpty.toggleAttribute("hidden", earnedBadges.length > 0);

  if (lifeElements.nextBadges) {
    if (nextBadges.length > 0) {
      lifeElements.nextBadges.replaceChildren(...nextBadges.map((badge) => createNextBadge(api, state, badge)));
    } else {
      const empty = document.createElement("p");
      empty.className = "next-badges__empty";
      empty.textContent = "次の寄り道を、ゆっくり探しています。";
      lifeElements.nextBadges.replaceChildren(empty);
    }
  }

  if (lifeElements.footprints) {
    lifeElements.footprints.replaceChildren(...footprints.map((footprint) => createFootprint(api, footprint)));
  }
  if (lifeElements.footprintsEmpty) lifeElements.footprintsEmpty.toggleAttribute("hidden", footprints.length > 0);
  if (lifeElements.footprintsNote) {
    lifeElements.footprintsNote.hidden = !hasMoreFootprints;
    lifeElements.footprintsNote.textContent = footprintsExpanded
      ? "すべての足あとを表示しています。"
      : "最近の足あとを表示しています。";
  }
  if (lifeElements.footprintsToggle) {
    lifeElements.footprintsToggle.hidden = !hasMoreFootprints;
    lifeElements.footprintsToggle.textContent = footprintsExpanded
      ? "足あとを閉じる"
      : "すべての足あとを見る";
    lifeElements.footprintsToggle.setAttribute("aria-expanded", String(footprintsExpanded));
  }
}

fireLifePageReady.then((api) => {
  renderLifePage(api);
  window.addEventListener("wakuwaku:fire-life-updated", () => renderLifePage(api));
  lifeElements.footprintsToggle?.addEventListener("click", () => {
    footprintsExpanded = !footprintsExpanded;
    renderLifePage(api);
  });

  const params = new URLSearchParams(window.location.search);
  const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  if (lifeElements.devTools && (isLocalPreview || params.get("dev") === "1")) {
    lifeElements.devTools.hidden = false;
  }

  lifeElements.nicknameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const state = api.loadState();
    state.nickname = lifeElements.nicknameInput?.value || "";
    const savedState = api.saveState(state);
    renderLifePage(api);
    if (lifeElements.nicknameStatus) {
      lifeElements.nicknameStatus.textContent = savedState.nickname
        ? `「${savedState.nickname}」として保存しました。`
        : "ニックネームを消去しました。";
    }
    window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-updated"));
  });

  lifeElements.exportData?.addEventListener("click", () => {
    try {
      const backup = api.createBackup(api.loadState());
      const blob = new Blob([backup], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `wakuwaku-fire-life-${api.getTokyoDateKey()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "バックアップを保存しました。";
    } catch {
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "データを保存できませんでした。";
    }
  });

  lifeElements.importData?.addEventListener("click", () => lifeElements.importInput?.click());
  lifeElements.importInput?.addEventListener("change", async () => {
    const file = lifeElements.importInput.files?.[0];
    if (!file) return;

    try {
      const contents = await file.text();
      const previewState = api.parseBackup(contents);
      const previewLevel = api.getLevelFromExp(previewState.totalExp);
      const shouldRestore = window.confirm(`Lv.${previewLevel}・${previewState.totalExp.toLocaleString("ja-JP")} EXPのFIRE人生データで、現在のデータを上書きしますか？`);
      if (!shouldRestore) {
        if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "復元をキャンセルしました。";
        return;
      }
      const restoredState = api.restoreBackup(contents);
      renderLifePage(api);
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "FIRE人生データを復元しました。";
      window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-updated", { detail: { state: restoredState } }));
    } catch (error) {
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = error instanceof Error ? error.message : "データを復元できませんでした。";
    } finally {
      lifeElements.importInput.value = "";
    }
  });

  document.querySelector("[data-close-badge-dialog]")?.addEventListener("click", closeBadgeDetail);
  lifeElements.detailDialog?.addEventListener("click", (event) => {
    if (event.target === lifeElements.detailDialog) closeBadgeDetail();
  });

  lifeElements.reset?.addEventListener("click", () => {
    const shouldReset = window.confirm("この端末に保存されているFIRE人生データを初期化しますか？");
    if (!shouldReset) return;
    api.resetState();
    window.location.reload();
  });

  lifeElements.devLevels.forEach((button) => {
    button.addEventListener("click", () => {
      const targetLevel = Number(button.dataset.devLevel);
      if (!Number.isFinite(targetLevel) || targetLevel < 1) return;
      const state = api.loadState();
      state.totalExp = api.getExpForLevel(targetLevel);
      api.syncEligibleBadges(state);
      api.saveState(state);
      renderLifePage(api);
      window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-updated"));
    });
  });

  lifeElements.previewBadges.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.previewBadgeCategory;
      const badge = api.getBadgeDefinition(PREVIEW_BADGE_IDS[category]);
      if (!badge) return;

      window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-preview-badge", {
        detail: {
          category: badge.category,
          kicker: "演出プレビュー",
          title: `「${badge.name}」`,
          detail: badge.description,
          imagePath: badge.imagePath || null,
        },
      }));
    });
  });

  lifeElements.futureCta?.addEventListener("click", () => {
    lifeElements.futureCta.textContent = "会員機能は準備中です";
    lifeElements.futureCta.setAttribute("aria-disabled", "true");
  });
}).catch(() => {
  // 共通MVPが利用できない場合も、ページの静的な案内は表示します。
});


