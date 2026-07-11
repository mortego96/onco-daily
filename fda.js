// =============================================================
//  Fuente: aprobaciones de la FDA (feed RSS oficial)
//  Filtra solo las aprobaciones relevantes para tus tumores y
//  las deja en el mismo formato que un artículo de PubMed, para
//  que el resumidor (summarize.js) las trate igual.
// =============================================================

import { XMLParser } from "fast-xml-parser";

const FDA_RSS_URL =
  "http://www.fda.gov/AboutFDA/ContactFDA/StayInformed/RSSFeeds/Drugs/rss.xml";

// Palabras clave que identifican que una aprobación es relevante.
// (En minúsculas; la comprobación ignora mayúsculas/minúsculas.)
const KEYWORDS = [
  "pancreatic",
  "pancreas",
  "cholangiocarcinoma",
  "biliary",
  "bile duct",
  "gallbladder",
  "hepatocellular",
  "liver cancer",
  "neuroendocrine",
  "carcinoid",
  "kras",
];

const parser = new XMLParser({ ignoreAttributes: false, textNodeName: "#text" });

function txt(node) {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object") return node["#text"] ?? "";
  return String(node);
}

function isRelevant(title, description) {
  const s = `${title} ${description}`.toLowerCase();
  return KEYWORDS.some((k) => s.includes(k));
}

// Devuelve artículos "sintéticos" con la misma forma que los de PubMed,
// para que summarizeArticle() los procese sin cambios.
export async function fetchFdaApprovals(daysBack = 7) {
  const res = await fetch(FDA_RSS_URL);
  if (!res.ok) throw new Error(`FDA RSS HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);

  let items = doc?.rss?.channel?.item ?? [];
  if (!Array.isArray(items)) items = [items];

  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  const out = [];
  for (const item of items) {
    const title = txt(item.title);
    const description = txt(item.description).replace(/<[^>]+>/g, " ");
    const link = txt(item.link);
    const pubDateRaw = txt(item.pubDate);
    const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;

    if (pubDate && pubDate.getTime() < cutoff) continue;
    if (!isRelevant(title, description)) continue;

    out.push({
      pmid: `fda-${Buffer.from(link).toString("base64").slice(0, 16)}`,
      title,
      abstract:
        description ||
        `Aprobación / actualización de la FDA: ${title}. Consulta el enlace oficial para el detalle completo.`,
      journal: "FDA (aprobación oficial)",
      pubdate: pubDate ? pubDate.toISOString().slice(0, 10) : "",
      doi: null,
      url: link || "https://www.fda.gov/drugs",
    });
  }
  return out;
}
