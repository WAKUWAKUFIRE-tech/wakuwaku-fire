// URLを入れると自動表示。休止するときは enabled を false にします。
export const externalRanking = {
  blogmura: { enabled: true, url: "" }
};
// 将来の「外部評価・掲載実績」用。トップページへの自動表示はしません。
export const externalRecognition = [];

export function activeRankings(config = externalRanking) {
  return Object.entries(config).flatMap(([key, value]) => {
    const name = key === "blogmura" ? "にほんブログ村" : null;
    try {
      const url = new URL(value.url);
      const domain = "blogmura.com";
      if (!name || !value.enabled || url.protocol !== "https:" || url.username || url.password || !(url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return [];
      return [{ name, url: url.href }];
    } catch { return []; }
  });
}
