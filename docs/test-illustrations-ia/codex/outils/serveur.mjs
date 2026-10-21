// Petit serveur local pour relire la galerie des animations 8 images.
//   node serveur.mjs   →  http://localhost:8090/galerie.html
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const ROOT = path.resolve(HERE, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".gif": "image/gif", ".svg": "image/svg+xml", ".png": "image/png" };

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.resolve(ROOT, "." + (url === "/" ? "/galerie.html" : url));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end("introuvable");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(8090, () => console.log("galerie : http://localhost:8090/galerie.html"));
