// Googleフォームの共有URLは、この1か所だけに入力してください。
const CONTACT_FORM_URL = "";

const contactFormLink = document.querySelector("#contact-form-link");
const contactFormNote = document.querySelector("#contact-form-note");

function isGoogleFormUrl(value) {
  try {
    const url = new URL(value);
    const isAllowedHost = url.hostname === "forms.gle" || (url.hostname === "docs.google.com" && url.pathname.startsWith("/forms/"));
    return url.protocol === "https:" && isAllowedHost && url.pathname.length > 1;
  } catch {
    return false;
  }
}

if (contactFormLink) {
  const formUrl = CONTACT_FORM_URL.trim();

  if (isGoogleFormUrl(formUrl)) {
    contactFormLink.href = formUrl;
    contactFormLink.target = "_blank";
    contactFormLink.rel = "noopener noreferrer";
    contactFormLink.removeAttribute("aria-disabled");
    contactFormLink.removeAttribute("tabindex");
    if (contactFormNote) contactFormNote.textContent = "入力内容はGoogleフォーム上で送信されます。";
  } else {
    contactFormLink.removeAttribute("href");
    contactFormLink.setAttribute("aria-disabled", "true");
    contactFormLink.tabIndex = -1;
    if (contactFormNote) contactFormNote.textContent = "お問い合わせフォームは現在準備中です。";
  }
}
