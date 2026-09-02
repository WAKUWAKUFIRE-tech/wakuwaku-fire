(() => {
  const section = document.querySelector("#fire-calendar-preview");
  if (!section) return;

  const dateNode = document.querySelector("#fire-calendar-date");
  const categoryNode = document.querySelector("#fire-calendar-category");
  const titleNode = document.querySelector("#fire-calendar-title");
  const shortTextNode = document.querySelector("#fire-calendar-short-text");
  const messageNode = document.querySelector("#fire-calendar-message");
  const linkNode = document.querySelector("#fire-calendar-link");
  const progressNode = document.querySelector("#fire-calendar-progress");

  function todayParts() {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date()).reduce((parts, item) => {
      parts[item.type] = item.value;
      return parts;
    }, {});
  }

  function render(entry, parts) {
    const month = Number(parts.month);
    const day = Number(parts.day);
    if (dateNode) dateNode.textContent = month + "月" + day + "日のFIREカレンダー";
    if (categoryNode) categoryNode.textContent = (entry.categoryIcon || "🔥") + " " + entry.category;
    if (titleNode) titleNode.textContent = entry.title;
    if (shortTextNode) shortTextNode.textContent = entry.shortText;
    if (messageNode) messageNode.textContent = entry.fireMessage;
    if (linkNode) {
      linkNode.href = "/fire-calendar/?date=" + entry.date;
      linkNode.setAttribute("aria-label", entry.title + "の詳細を見る");
    }
    if (progressNode) {
      const current = Math.max(1, Math.floor((Date.UTC(Number(parts.year), month - 1, day) - Date.UTC(Number(parts.year), 0, 0)) / 86400000));
      progressNode.textContent = "毎日ひとつ、人生の見方を増やす";
      progressNode.dataset.dayOfYear = String(current);
    }
    section.hidden = false;
  }

  const parts = todayParts();
  const monthKey = String(Number(parts.month)).padStart(2, "0");
  const dateKey = monthKey + "-" + String(Number(parts.day)).padStart(2, "0");
  fetch("/data/fire-calendar/" + monthKey + ".json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("calendar data unavailable");
      return response.json();
    })
    .then((entries) => {
      const entry = Array.isArray(entries) ? entries.find((item) => item.date === dateKey) : null;
      if (!entry) throw new Error("today's calendar entry unavailable");
      render(entry, parts);
    })
    .catch(() => {
      section.hidden = true;
    });
})();
