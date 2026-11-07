// Tâche planifiée Scalingo (cron.json, 17 h UTC = 18 h ou 19 h à Paris) :
// déclenche les rappels de séance du jour en appelant la route protégée.
const base = process.env.CRON_BASE_URL || "https://easyphysio.fr";
const res = await fetch(`${base}/api/cron/rappels`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
});
console.log(`[rappels] ${res.status} ${await res.text()}`);
if (!res.ok) process.exit(1);
