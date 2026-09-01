// Googleフォームの共有URLは、この1か所だけに入力してください。
const CONTACT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScEpmP_3DzroXRybFETGA5TXQ8hJ1geK54i6noE9I9F2CmyoQ/viewform?usp=publish-editor";

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
    if (contactFormNote) {
      contactFormNote.textContent = "入力内容はGoogleフォーム上で送信されます。";
      contactFormNote.hidden = false;
    }
  } else {
    contactFormLink.removeAttribute("href");
    contactFormLink.setAttribute("aria-disabled", "true");
    contactFormLink.tabIndex = -1;
    if (contactFormNote) contactFormNote.hidden = true;
  }
}
