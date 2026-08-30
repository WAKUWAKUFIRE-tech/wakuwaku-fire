(function () {
  "use strict";

  var DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;
  var STORAGE_KEYS = {
    dismissedAt: "wakuwakuFire_installPromptDismissedAt",
    lastShownAt: "wakuwakuFire_installPromptLastShownAt",
    installed: "wakuwakuFire_appInstalled"
  };
  var deferredPrompt = null;
  var modal = null;
  var dialog = null;
  var activeTrigger = null;
  var autoPromptIsOpen = false;
  var experienceObserver = null;

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // プライベートブラウズ等で保存できない場合も、案内自体は利用できます。
    }
  }

  function isStandalone() {
    var mediaStandalone = false;
    try {
      mediaStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    } catch (error) {
      mediaStandalone = false;
    }
    return Boolean(mediaStandalone || window.navigator.standalone === true || readStorage(STORAGE_KEYS.installed) === "1");
  }

  function isIOS() {
    var userAgent = window.navigator.userAgent || "";
    var platform = window.navigator.platform || "";
    return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  }

  function isInAppBrowser() {
    var userAgent = window.navigator.userAgent || "";
    return /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|MicroMessenger|GSA\//i.test(userAgent);
  }

  function isAutoPromptAllowed() {
    var dismissedAt = Number(readStorage(STORAGE_KEYS.dismissedAt) || 0);
    return !dismissedAt || Date.now() - dismissedAt >= DISMISS_FOR_MS;
  }

  function getFocusableElements() {
    if (!dialog) return [];
    return Array.prototype.slice.call(dialog.querySelectorAll("button, a[href], input, textarea, select, [tabindex]:not([tabindex='-1'])"))
      .filter(function (element) {
        return !element.hidden && !element.disabled && element.getAttribute("aria-hidden") !== "true";
      });
  }

  function closeModal(rememberDismissal) {
    if (!modal || modal.hidden) return;
    if (rememberDismissal || autoPromptIsOpen) {
      writeStorage(STORAGE_KEYS.dismissedAt, String(Date.now()));
    }
    modal.hidden = true;
    document.body.classList.remove("wakuwaku-save-is-open");
    document.removeEventListener("keydown", handleModalKeydown);
    if (activeTrigger && typeof activeTrigger.focus === "function") activeTrigger.focus();
    activeTrigger = null;
    autoPromptIsOpen = false;
  }

  function handleModalKeydown(event) {
    if (!modal || modal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal(true);
      return;
    }
    if (event.key !== "Tab") return;
    var focusable = getFocusableElements();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function ensureModal() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "wakuwaku-save-modal";
    modal.hidden = true;
    modal.innerHTML = [
      '<section class="wakuwaku-save-dialog" role="dialog" aria-modal="true" aria-labelledby="wakuwaku-save-title">',
        '<button class="wakuwaku-save-dialog__close" type="button" data-wakuwaku-save-close aria-label="保存案内を閉じる">×</button>',
        '<p class="wakuwaku-save-dialog__eyebrow">また遊びに来るなら 🔥</p>',
        '<h2 id="wakuwaku-save-title">ワクワクFIREを保存できます</h2>',
        '<p class="wakuwaku-save-dialog__copy" data-wakuwaku-save-copy></p>',
        '<div class="wakuwaku-save-guide" data-wakuwaku-save-guide hidden></div>',
        '<p class="wakuwaku-save-dialog__note" data-wakuwaku-save-note></p>',
        '<div class="wakuwaku-save-dialog__actions">',
          '<button class="wakuwaku-save-dialog__install" type="button" data-wakuwaku-save-install></button>',
          '<button class="wakuwaku-save-dialog__later" type="button" data-wakuwaku-save-later>あとで</button>',
        '</div>',
      '</section>'
    ].join("");
    document.body.appendChild(modal);
    dialog = modal.querySelector(".wakuwaku-save-dialog");
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal(true);
    });
    modal.querySelector("[data-wakuwaku-save-close]").addEventListener("click", function () {
      closeModal(true);
    });
    modal.querySelector("[data-wakuwaku-save-later]").addEventListener("click", function () {
      closeModal(true);
    });
    modal.querySelector("[data-wakuwaku-save-install]").addEventListener("click", installOrAcknowledge);
  }

  function renderGuide() {
    ensureModal();
    var copy = modal.querySelector("[data-wakuwaku-save-copy]");
    var guide = modal.querySelector("[data-wakuwaku-save-guide]");
    var note = modal.querySelector("[data-wakuwaku-save-note]");
    var installButton = modal.querySelector("[data-wakuwaku-save-install]");

    guide.hidden = true;
    guide.innerHTML = "";

    if (deferredPrompt && !isInAppBrowser()) {
      copy.textContent = "また来るなら、ホーム画面に置いておくと便利です。次回から1タップでワクワクFIREを開けます。";
      note.textContent = "診断やゲームを楽しんだあとも、すぐに戻ってこられます。";
      installButton.textContent = "ホーム画面に追加";
      return;
    }

    if (isIOS()) {
      copy.textContent = "Safariの共有メニューからホーム画面に追加できます。";
      guide.innerHTML = "<p><strong>Safariで次の順に選んでください。</strong></p><ol><li>画面下の共有ボタン</li><li>「ホーム画面に追加」</li></ol>";
      guide.hidden = false;
      note.textContent = "アプリのように、次回から1タップで開けます。";
      installButton.textContent = "わかった";
      return;
    }

    if (isInAppBrowser()) {
      copy.textContent = "アプリ内ブラウザではホーム画面への追加が使えない場合があります。";
      guide.innerHTML = "<p><strong>Safari / Chromeで開くと、ホーム画面に追加できます。</strong></p>";
      guide.hidden = false;
      note.textContent = "いったん通常のブラウザでこのページを開いてください。";
      installButton.textContent = "わかった";
      return;
    }

    copy.textContent = "このブラウザでは自動追加に対応していないため、お気に入りに登録しておくと便利です。";
    guide.innerHTML = "<p><strong>ブックマークのショートカット</strong></p><p>Windows：Ctrl + D　／　Mac：Command + D</p>";
    guide.hidden = false;
    note.textContent = "対応ブラウザでは、ブラウザのメニューに「インストール」が表示されることもあります。";
    installButton.textContent = "わかった";
  }

  function installOrAcknowledge() {
    if (!deferredPrompt || isInAppBrowser()) {
      closeModal(true);
      return;
    }
    var promptEvent = deferredPrompt;
    deferredPrompt = null;
    promptEvent.prompt();
    Promise.resolve(promptEvent.userChoice).then(function (choice) {
      if (choice && choice.outcome === "accepted") {
        writeStorage(STORAGE_KEYS.installed, "1");
      } else {
        writeStorage(STORAGE_KEYS.dismissedAt, String(Date.now()));
      }
      closeModal(false);
      updateSaveControls();
    }).catch(function () {
      closeModal(true);
      updateSaveControls();
    });
  }

  function showSaveWakuwakuFirePrompt(options) {
    options = options || {};
    if (isStandalone()) {
      updateSaveControls();
      return false;
    }
    var isAuto = options.reason === "experience" || options.auto === true;
    if (isAuto && !isAutoPromptAllowed()) return false;
    ensureModal();
    activeTrigger = options.trigger || document.activeElement;
    autoPromptIsOpen = isAuto;
    if (isAuto) writeStorage(STORAGE_KEYS.lastShownAt, String(Date.now()));
    renderGuide();
    modal.hidden = false;
    document.body.classList.add("wakuwaku-save-is-open");
    document.addEventListener("keydown", handleModalKeydown);
    var focusable = getFocusableElements();
    if (focusable.length) window.setTimeout(function () { focusable[0].focus(); }, 0);
    return true;
  }

  function updateSaveControls() {
    var hide = isStandalone();
    Array.prototype.forEach.call(document.querySelectorAll("[data-save-wakuwaku-fire]"), function (button) {
      button.hidden = hide;
    });
    if (hide && modal && !modal.hidden) closeModal(false);
  }

  function makeButton(className, text, shortText) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("data-save-wakuwaku-fire", "true");
    button.setAttribute("aria-label", "ワクワクFIREを保存する案内を開く");
    if (shortText) {
      button.innerHTML = '<span class="wakuwaku-save-button__full">' + text + '</span><span class="wakuwaku-save-button__short">' + shortText + '</span>';
    } else {
      button.textContent = text;
    }
    return button;
  }

  function addSaveButtons() {
    var headerInner = document.querySelector(".site-header__inner");
    if (headerInner && !headerInner.querySelector("[data-save-wakuwaku-fire]")) {
      var headerButton = makeButton("wakuwaku-save-button", "🔥 ワクワクFIREを保存", "🔥 保存");
      var before = headerInner.querySelector(".nav-toggle, .site-nav");
      headerInner.insertBefore(headerButton, before || null);
    }

    var footerBottom = document.querySelector(".site-footer__bottom");
    var gameFooter = document.querySelector(".game-footer");
    if (footerBottom && !footerBottom.querySelector("[data-save-wakuwaku-fire]")) {
      footerBottom.appendChild(makeButton("wakuwaku-save-button", "また来るなら保存 🔥"));
    } else if (gameFooter && !gameFooter.querySelector("[data-save-wakuwaku-fire]")) {
      gameFooter.appendChild(makeButton("wakuwaku-save-button", "また来るなら保存 🔥"));
    } else if (!headerInner && !gameFooter && !document.querySelector("[data-save-wakuwaku-fire]")) {
      document.body.appendChild(makeButton("wakuwaku-save-button wakuwaku-save-button--standalone", "🔥 保存"));
    }
    updateSaveControls();
  }

  function watchExperienceCompletion() {
    if (typeof window.MutationObserver !== "function") return;
    var selectors = [".afire-result", ".iju-result-screen", ".wigu-result"];
    var found = function () {
      return selectors.some(function (selector) { return document.querySelector(selector); });
    };
    if (found()) return;
    experienceObserver = new MutationObserver(function () {
      if (!found()) return;
      experienceObserver.disconnect();
      window.setTimeout(function () {
        showSaveWakuwakuFirePrompt({ reason: "experience" });
      }, 350);
    });
    experienceObserver.observe(document.body, { childList: true, subtree: true });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {
        // 非対応環境やローカル確認時も、サイト本体の動作は止めません。
      });
    });
  }

  function init() {
    ensureModal();
    addSaveButtons();
    watchExperienceCompletion();
    registerServiceWorker();

    document.addEventListener("click", function (event) {
      var button = event.target.closest ? event.target.closest("[data-save-wakuwaku-fire]") : null;
      if (!button) return;
      showSaveWakuwakuFirePrompt({ trigger: button });
    });

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredPrompt = event;
      updateSaveControls();
    });

    window.addEventListener("appinstalled", function () {
      writeStorage(STORAGE_KEYS.installed, "1");
      deferredPrompt = null;
      updateSaveControls();
    });
  }

  window.showSaveWakuwakuFirePrompt = showSaveWakuwakuFirePrompt;
  window.WakuwakuPWA = {
    showSaveWakuwakuFirePrompt: showSaveWakuwakuFirePrompt,
    isInstalled: isStandalone,
    experienceComplete: function () {
      showSaveWakuwakuFirePrompt({ reason: "experience" });
    }
  };
  window.addEventListener("wakuwaku:experience-complete", function () {
    showSaveWakuwakuFirePrompt({ reason: "experience" });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
