(() => {
  const dialog = document.querySelector("#secret-base-dialog");
  const form = document.querySelector("[data-secret-base-form]");
  const status = document.querySelector("[data-secret-base-status]");
  const password = document.querySelector("#secret-base-password");
  if (!dialog || !form || !status || !password) return;

  function openDialog() {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    window.setTimeout(() => password.focus(), 30);
  }

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    status.textContent = "";
  }

  document.querySelectorAll("[data-open-secret-base]").forEach((button) => button.addEventListener("click", openDialog));
  document.querySelectorAll("[data-close-secret-base]").forEach((button) => button.addEventListener("click", closeDialog));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = password.value;
    if (!value) return;
    status.textContent = "鍵を確認しています…";
    try {
      const response = await fetch("/api/secret-base/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: value })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        status.textContent = result.error === "configuration_missing" ? "現在、鍵の準備中です。少し時間を置いてお試しください。" : "鍵が違うようです。もう一度確認してください。";
        password.select();
        return;
      }
      status.textContent = "🔓 鍵が開きました。中へどうぞ。";
      window.setTimeout(() => { window.location.href = result.redirect || "/community/secret-base/member/"; }, 180);
    } catch (error) {
      status.textContent = "鍵の確認に失敗しました。通信状態を確認してもう一度お試しください。";
    }
  });
})();
