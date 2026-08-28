(function (root) {
  "use strict";

  var STORAGE_KEY = "wakuwaku_fire_anonymous_id";
  var VALID_TYPES = { animal: true, japan: true, world: true };
  var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function randomUuid() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") {
      return root.crypto.randomUUID();
    }
    var bytes = new Uint8Array(16);
    if (root.crypto && typeof root.crypto.getRandomValues === "function") {
      root.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = Array.prototype.map.call(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function getAnonymousId() {
    var saved = "";
    try {
      saved = root.localStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
      saved = "";
    }
    if (UUID_PATTERN.test(saved)) return saved.toLowerCase();
    var created = randomUuid().toLowerCase();
    try {
      root.localStorage.setItem(STORAGE_KEY, created);
    } catch (error) {
      /* 保存できないブラウザでは、その訪問中だけ使います。 */
    }
    return created;
  }

  function isValidType(type) {
    return typeof type === "string" && VALID_TYPES[type] === true;
  }

  function parseResponse(response) {
    return response.text().then(function (text) {
      var payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch (error) {
        payload = {};
      }
      if (!response.ok) {
        var requestError = new Error("Ranking request failed");
        requestError.payload = payload;
        throw requestError;
      }
      return payload;
    });
  }

  function record(type, resultId) {
    if (!isValidType(type) || typeof resultId !== "string" || !resultId) {
      return Promise.resolve({ available: false });
    }
    try {
      return root.fetch("/api/diagnosis-result", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          diagnosis_type: type,
          result_id: resultId,
          anonymous_id: getAnonymousId()
        })
      }).then(parseResponse).catch(function () {
        return { available: false };
      });
    } catch (error) {
      return Promise.resolve({ available: false });
    }
  }

  function load(type) {
    if (!isValidType(type)) return Promise.reject(new Error("Invalid diagnosis type"));
    try {
      return root.fetch("/api/diagnosis-ranking?type=" + encodeURIComponent(type), {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "same-origin",
        cache: "no-store"
      }).then(parseResponse);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function normalizedLabel(options, resultId) {
    var value = null;
    if (typeof options.labelForId === "function") {
      try {
        value = options.labelForId(resultId);
      } catch (error) {
        value = null;
      }
    }
    if (typeof value === "string") return { label: value, subLabel: "", icon: "" };
    if (!value || typeof value !== "object") return { label: resultId, subLabel: "", icon: "" };
    return {
      label: String(value.label || resultId),
      subLabel: String(value.subLabel || ""),
      icon: String(value.icon || "")
    };
  }

  function createRow(item, options, isCurrent) {
    var label = normalizedLabel(options, item.resultId);
    var row = document.createElement("li");
    row.className = "wakuwaku-ranking__row" + (isCurrent ? " is-current" : "");
    if (isCurrent) row.setAttribute("aria-current", "true");

    var rank = document.createElement("span");
    rank.className = "wakuwaku-ranking__rank";
    rank.textContent = item.rank <= 3 ? ["🥇", "🥈", "🥉"][item.rank - 1] : item.rank + "位";

    var icon = document.createElement("span");
    icon.className = "wakuwaku-ranking__icon";
    icon.textContent = label.icon;
    icon.setAttribute("aria-hidden", "true");

    var name = document.createElement("span");
    name.className = "wakuwaku-ranking__name";
    name.textContent = label.label;
    if (label.subLabel) {
      var subLabel = document.createElement("small");
      subLabel.textContent = label.subLabel;
      name.appendChild(subLabel);
    }

    var stat = document.createElement("span");
    stat.className = "wakuwaku-ranking__stat";
    stat.textContent = item.count + "人";
    if (item.count > 0) {
      var percentage = document.createElement("small");
      percentage.textContent = Number(item.percentage || 0).toFixed(1) + "%";
      stat.appendChild(percentage);
    }

    row.appendChild(rank);
    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(stat);
    return row;
  }

  function removeSection(section) {
    if (section && section.parentNode) section.parentNode.removeChild(section);
  }

  function renderRanking(section, data, options) {
    var results = Array.isArray(data.results) ? data.results : [];
    var total = Number(data.total || 0);
    section.innerHTML = "";

    var eyebrow = document.createElement("p");
    eyebrow.className = "wakuwaku-ranking__eyebrow";
    eyebrow.textContent = "👥 みんなの診断結果";
    var title = document.createElement("h2");
    title.className = "wakuwaku-ranking__title";
    title.textContent = options.title || "みんなの診断結果ランキング";
    var intro = document.createElement("p");
    intro.className = "wakuwaku-ranking__intro";
    intro.textContent = options.intro || "みんなの結果を匿名で集計しています。";
    section.appendChild(eyebrow);
    section.appendChild(title);
    section.appendChild(intro);

    var countLine = document.createElement("p");
    countLine.className = "wakuwaku-ranking__total";
    countLine.textContent = total + "人が診断";
    section.appendChild(countLine);

    if (total === 0) {
      var empty = document.createElement("p");
      empty.className = "wakuwaku-ranking__empty";
      empty.textContent = "みんなの結果はこれから集まります。あなたが最初の一人かも！";
      section.appendChild(empty);
      return;
    }

    var limit = Math.max(1, Number(options.limit || 5));
    var visibleResults = results.slice(0, limit);
    var list = document.createElement("ol");
    list.className = "wakuwaku-ranking__list";
    visibleResults.forEach(function (item) {
      list.appendChild(createRow(item, options, item.resultId === options.resultId));
    });
    section.appendChild(list);

    var hiddenResults = results.slice(limit);
    if (hiddenResults.length > 0) {
      var expandButton = document.createElement("button");
      expandButton.type = "button";
      expandButton.className = "wakuwaku-ranking__expand";
      expandButton.setAttribute("aria-expanded", "false");
      expandButton.textContent = "全ランキングを見る ＋";
      var allList = document.createElement("ol");
      allList.className = "wakuwaku-ranking__list wakuwaku-ranking__list--all";
      allList.hidden = true;
      hiddenResults.forEach(function (item) {
        allList.appendChild(createRow(item, options, item.resultId === options.resultId));
      });
      expandButton.addEventListener("click", function () {
        var expanded = expandButton.getAttribute("aria-expanded") === "true";
        expandButton.setAttribute("aria-expanded", String(!expanded));
        allList.hidden = expanded;
        expandButton.textContent = expanded ? "全ランキングを見る ＋" : "ランキングを閉じる −";
      });
      section.appendChild(expandButton);
      section.appendChild(allList);
    }

    var current = results.filter(function (item) { return item.resultId === options.resultId; })[0];
    if (current && current.rank > limit) {
      var outside = document.createElement("div");
      outside.className = "wakuwaku-ranking__outside";
      var outsideTitle = document.createElement("strong");
      outsideTitle.textContent = "あなたの結果";
      outside.appendChild(outsideTitle);
      outside.appendChild(createRow(current, options, true));
      section.appendChild(outside);
    }

    var currentLabel = normalizedLabel(options, options.resultId);
    var same = document.createElement("p");
    same.className = "wakuwaku-ranking__same";
    var prefix = options.currentMessage || "あなたの結果は";
    same.textContent = prefix + "「" + currentLabel.label + "」が " + (current ? current.count : 0) + "人！";
    section.appendChild(same);
  }

  function mount(options) {
    options = options || {};
    var slot = options.slot;
    if (!slot || !isValidType(options.type) || typeof options.resultId !== "string") return;

    var section = document.createElement("section");
    section.className = "wakuwaku-ranking wakuwaku-ranking--loading";
    section.setAttribute("aria-live", "polite");
    section.innerHTML = '<p class="wakuwaku-ranking__loading">みんなの結果を集計中…</p>';
    slot.appendChild(section);

    record(options.type, options.resultId).then(function () {
      return load(options.type);
    }).then(function (data) {
      if (!data || data.available !== true) {
        removeSection(section);
        return;
      }
      section.classList.remove("wakuwaku-ranking--loading");
      renderRanking(section, data, options);
    }).catch(function () {
      removeSection(section);
    });
  }

  root.WakuwakuRanking = {
    anonymousStorageKey: STORAGE_KEY,
    getAnonymousId: getAnonymousId,
    record: record,
    load: load,
    mount: mount
  };
}(window));
