(function () {
  "use strict";

  function today() {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  function emit(name, parameters) {
    var eventParameters = Object.assign({}, parameters, {
      page: window.location.pathname,
      date: today(),
      timestamp: new Date().toISOString()
    });

    window.dispatchEvent(new CustomEvent(name, { detail: eventParameters }));
    if (typeof window.gtag === "function") {
      window.gtag("event", name, eventParameters);
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: name }, eventParameters));
    }
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var link = target.closest("a[data-affiliate-offer-id], a[data-amazon-sale-click]");
    if (!link) return;

    if (link.dataset.amazonSaleClick === "true") {
      emit("amazon_sale_click", {
        provider: "amazon",
        placement: "otoku-amazon-sale"
      });
      return;
    }

    emit("affiliate_click", {
      provider: link.dataset.affiliateProvider || "other",
      offer_id: link.dataset.affiliateOfferId || "unknown",
      category: link.dataset.affiliateCategory || "general",
      placement: link.dataset.affiliatePlacement || "otoku"
    });
  }, { passive: true });
}());
