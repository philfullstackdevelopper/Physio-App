// Prévient Bing, Yandex, Naver et Seznam (protocole IndexNow) que des pages
// publiques ont changé, pour qu'ils les relisent tout de suite.
// Usage : node scripts/indexnow.mjs            → toutes les pages du sitemap
//         node scripts/indexnow.mjs /guides/x  → seulement ces pages
// La clé est publique par nature : elle est servie par public/<clé>.txt.
const KEY = "a3f8ea2554477ecd583892f01d216579";
const HOST = "easyphysio.fr";
const SITE = `https://${HOST}`;

let urls = process.argv.slice(2).map((p) => (p.startsWith("http") ? p : SITE + p));
if (!urls.length) {
  const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow : ${res.status} (200/202 = reçu) pour ${urls.length} page(s)`);
