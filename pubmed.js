// =============================================================
//  Cliente de PubMed (NCBI E-utilities)
//  - searchRecentPmids: busca PMIDs recientes para una consulta
//  - fetchArticles: descarga título, abstract, revista, fecha y DOI
// =============================================================

import { XMLParser } from "fast-xml-parser";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Añade datos de autenticación/cortesía a los parámetros de la petición.
function addAuth(params, opts) {
  if (opts.tool) params.set("tool", opts.tool);
  if (opts.email) params.set("email", opts.email);
  if (opts.apiKey) params.set("api_key", opts.apiKey);
}

// Convierte cualquier nodo del XML en texto plano (maneja strings, números,
// arrays y objetos con #text o etiquetas de sección como en los abstracts).
function txt(node) {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(txt).filter(Boolean).join(" ");
  if (typeof node === "object") {
    const label = node["@_Label"] ? `${node["@_Label"]}: ` : "";
    return (label + txt(node["#text"] ?? "")).trim();
  }
  return "";
}

function extractDate(pubDate) {
  if (!pubDate) return "";
  const y = txt(pubDate.Year);
  const m = txt(pubDate.Month);
  const d = txt(pubDate.Day);
  return [y, m, d].filter(Boolean).join("-");
}

function parseArticle(pa) {
  try {
    const mc = pa.MedlineCitation;
    const art = mc?.Article;
    if (!art) return null;

    const pmid = txt(mc.PMID);
    const title = txt(art.ArticleTitle);
    const abstract = txt(art.Abstract?.AbstractText);
    if (!abstract) return null; // sin abstract no hay tarjeta de calidad

    const journal =
      txt(art.Journal?.ISOAbbreviation) || txt(art.Journal?.Title) || "PubMed";
    const pubdate = extractDate(art.Journal?.JournalIssue?.PubDate);

    let doi = null;
    const ids = pa.PubmedData?.ArticleIdList?.ArticleId;
    const idArr = Array.isArray(ids) ? ids : ids ? [ids] : [];
    for (const id of idArr) {
      if (id?.["@_IdType"] === "doi") doi = txt(id);
    }

    const url = doi
      ? `https://doi.org/${doi}`
      : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

    return { pmid, title, abstract, journal, pubdate, doi, url };
  } catch {
    return null;
  }
}

// Devuelve un array de PMIDs recientes para una consulta dada.
export async function searchRecentPmids(query, opts = {}) {
  const term = opts.englishOnly ? `(${query}) AND english[la]` : query;
  const params = new URLSearchParams({
    db: "pubmed",
    term,
    retmax: String(opts.retmax ?? 20),
    retmode: "json",
    sort: "date",
    datetype: "edat", // fecha de entrada en PubMed = "lo nuevo"
    reldate: String(opts.reldate ?? 7),
  });
  addAuth(params, opts);

  const res = await fetch(`${EUTILS}/esearch.fcgi?${params}`);
  if (!res.ok) throw new Error(`esearch HTTP ${res.status}`);
  const data = await res.json();
  return data?.esearchresult?.idlist ?? [];
}

// Descarga y parsea los artículos correspondientes a una lista de PMIDs.
export async function fetchArticles(pmids, opts = {}) {
  if (!pmids.length) return [];
  const params = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "xml",
    rettype: "abstract",
  });
  addAuth(params, opts);

  const res = await fetch(`${EUTILS}/efetch.fcgi?${params}`);
  if (!res.ok) throw new Error(`efetch HTTP ${res.status}`);
  const xml = await res.text();

  const doc = parser.parse(xml);
  let articles = doc?.PubmedArticleSet?.PubmedArticle ?? [];
  if (!Array.isArray(articles)) articles = [articles];
  return articles.map(parseArticle).filter(Boolean);
}
