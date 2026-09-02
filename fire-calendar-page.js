(() => {
  const detail = document.querySelector("#fire-calendar-detail");
  if (!detail) return;

  const errorNode = document.querySelector("#fire-calendar-error");
  const dateNode = document.querySelector("#fire-calendar-detail-date");
  const categoryNode = document.querySelector("#fire-calendar-detail-category");
  const titleNode = document.querySelector("#fire-calendar-detail-title");
  const sourceNode = document.querySelector("#fire-calendar-detail-source");
  const dayContextNode = document.querySelector("#fire-calendar-day-context");
  const connectionNode = document.querySelector("#fire-calendar-connection");
  const actionNode = document.querySelector("#fire-calendar-action");
  const relatedNode = document.querySelector("#fire-calendar-related");
  const sourcesNode = document.querySelector("#fire-calendar-sources");
  const monthListNode = document.querySelector("#fire-calendar-month-list");
  const previousLink = document.querySelector("#fire-calendar-previous");
  const todayLink = document.querySelector("#fire-calendar-today");
  const nextLink = document.querySelector("#fire-calendar-next");

  function todayKey() {
    const parts = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date()).reduce((result, item) => {
      result[item.type] = item.value;
      return result;
    }, {});
    return String(Number(parts.month)).padStart(2, "0") + "-" + String(Number(parts.day)).padStart(2, "0");
  }

  function isValidDateKey(value) {
    if (!/^\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const parts = String(value).split("-").map(Number);
    const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return parts[0] >= 1 && parts[0] <= 12 && parts[1] >= 1 && parts[1] <= daysPerMonth[parts[0] - 1];
  }

  function displayDate(key) {
    const parts = String(key).split("-").map(Number);
    return parts[0] + "月" + parts[1] + "日";
  }

  function setMeta(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", value);
  }

  function setLink(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("href", value);
  }

  function queryUrl(key) {
    return "?date=" + encodeURIComponent(key);
  }

  function setNavigation(link, key, label, title) {
    if (!link) return;
    link.href = queryUrl(key);
    const labelNode = link.querySelector("span");
    const titleNodeForLink = link.querySelector("strong");
    if (labelNode) labelNode.textContent = label;
    if (titleNodeForLink) titleNodeForLink.textContent = title;
    link.setAttribute("aria-label", label + " " + title);
  }

  function relatedLabel(link) {
    const labels = {
      "/articles/": "FIREコラムを読む",
      "/fire-migration-japan/": "国内移住診断を見る",
      "/fire-migration-world/": "海外移住診断を見る",
      "/risk-runner/": "RISK RUNNERで遊ぶ",
      "/#contents": "楽しいコンテンツを見る"
    };
    return labels[link] || "関連コンテンツを見る";
  }

  function renderRelated(entry) {
    if (!relatedNode) return;
    relatedNode.replaceChildren();
    const links = Array.isArray(entry.relatedLinks) ? entry.relatedLinks : [];
    if (!links.length) {
      relatedNode.hidden = true;
      return;
    }
    relatedNode.hidden = false;
    links.forEach((href) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = href;
      link.textContent = relatedLabel(href);
      item.appendChild(link);
      relatedNode.appendChild(item);
    });
  }

  function renderSources(entry) {
    if (!sourcesNode) return;
    sourcesNode.replaceChildren();
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      const item = document.createElement("li");
      item.textContent = entry.sourceNote || "ワクワクFIRE独自テーマです。";
      sourcesNode.appendChild(item);
      return;
    }
    entry.sources.forEach((source) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.label;
      item.appendChild(link);
      sourcesNode.appendChild(item);
    });
  }

  function renderMonthList(indexEntries, selectedKey) {
    if (!monthListNode) return;
    monthListNode.replaceChildren();
    const grouped = new Map();
    indexEntries.forEach((entry) => {
      const month = entry.date.slice(0, 2);
      if (!grouped.has(month)) grouped.set(month, []);
      grouped.get(month).push(entry);
    });
    grouped.forEach((entries, month) => {
      const detailsNode = document.createElement("details");
      detailsNode.className = "fire-calendar-month";
      if (month === selectedKey.slice(0, 2)) detailsNode.open = true;
      const summary = document.createElement("summary");
      summary.textContent = Number(month) + "月";
      const count = document.createElement("span");
      count.textContent = entries.length + "日";
      summary.appendChild(count);
      detailsNode.appendChild(summary);
      const list = document.createElement("ul");
      entries.forEach((entry) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = queryUrl(entry.date);
        link.textContent = displayDate(entry.date) + "　" + (entry.categoryIcon || "🔥") + " " + entry.title;
        if (entry.date === selectedKey) {
          link.setAttribute("aria-current", "page");
          item.className = "is-current";
        }
        item.appendChild(link);
        list.appendChild(item);
      });
      detailsNode.appendChild(list);
      monthListNode.appendChild(detailsNode);
    });
  }

  function render(entry, indexEntries, selectedKey) {
    const indexByDate = new Map(indexEntries.map((item) => [item.date, item]));
    const position = indexEntries.findIndex((item) => item.date === selectedKey);
    const currentPosition = position >= 0 ? position : 0;
    const previous = indexEntries[(currentPosition - 1 + indexEntries.length) % indexEntries.length];
    const next = indexEntries[(currentPosition + 1) % indexEntries.length];
    const dateLabel = displayDate(entry.date);
    const title = dateLabel + "は何の日？FIRE・投資・人生で考える今日のテーマ｜ワクワクFIRE";
    const description = dateLabel + "のFIREカレンダー。 " + entry.title + "を入口に、FIRE・投資・人生の選び方を短時間で考えるワクワクFIREの読み物です。";

    if (dateNode) dateNode.textContent = dateLabel;
    if (categoryNode) categoryNode.textContent = (entry.categoryIcon || "🔥") + " " + entry.category;
    if (titleNode) titleNode.textContent = entry.title;
    if (sourceNode) sourceNode.textContent = entry.sourceType + "｜" + entry.sourceNote;
    if (dayContextNode) dayContextNode.textContent = entry.dayContext;
    if (connectionNode) connectionNode.textContent = entry.fireConnection;
    if (actionNode) actionNode.textContent = entry.action;
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[property="og:url"]', "https://wakuwaku-fire-git.pages.dev/fire-calendar/" + queryUrl(entry.date));
    setLink('link[rel="canonical"]', "https://wakuwaku-fire-git.pages.dev/fire-calendar/" + queryUrl(entry.date));
    setNavigation(previousLink, previous.date, "← 昨日のFIRE", indexByDate.get(previous.date)?.title || "");
    setNavigation(todayLink, todayKey(), "今日のFIRE", "日本時間の今日へ");
    setNavigation(nextLink, next.date, "明日のFIRE →", indexByDate.get(next.date)?.title || "");
    renderRelated(entry);
    renderSources(entry);
    renderMonthList(indexEntries, selectedKey);
    detail.hidden = false;
    if (errorNode) errorNode.hidden = true;
  }

  const requested = new URLSearchParams(window.location.search).get("date");
  const selectedKey = isValidDateKey(requested) ? requested : todayKey();
  const monthKey = selectedKey.slice(0, 2);
  Promise.all([
    fetch("/data/fire-calendar/index.json", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("calendar index unavailable");
      return response.json();
    }),
    fetch("/data/fire-calendar/" + monthKey + ".json", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("calendar month unavailable");
      return response.json();
    })
  ]).then(([index, monthEntries]) => {
    const indexEntries = Array.isArray(index.entries) ? index.entries : [];
    const entry = Array.isArray(monthEntries) ? monthEntries.find((item) => item.date === selectedKey) : null;
    if (!entry || !indexEntries.length) throw new Error("calendar entry unavailable");
    render(entry, indexEntries, selectedKey);
  }).catch(() => {
    detail.hidden = true;
    if (errorNode) errorNode.hidden = false;
  });
})();
