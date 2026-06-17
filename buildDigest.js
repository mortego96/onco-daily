// =============================================================
//  Orquestador principal
//  Ejecuta:  npm run digest
//
//  Flujo: para cada categoría -> busca PMIDs recientes -> descarta vistos
//         -> descarga abstracts -> resume con Claude -> escribe el digest.
//  Salidas en /data:  latest.json, AAAA-MM-DD.json, seen.json
// =============================================================

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { topics, settings } from "./config.js";
import { searchRecentPmids, fetchArticles, sleep } from "./pubmed.js";
import { summarizeArticle } from "./summarize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const SEEN_FILE = path.join(DATA_DIR, "seen.json");

// Espera entre llamadas a NCBI: ~3/s sin clave, ~10/s con clave.
const NCBI_DELAY = process.env.NCBI_API_KEY ? 120 : 350;
// Espera entre resúmenes para no superar el límite del plan gratuito de Gemini (~10/min).
const GEMINI_DELAY = 6500;

async function loadSeen() {
  try {
    const raw = await fs.readFile(SEEN_FILE, "utf8");
    return new Set(JSON.parse(raw).pmids ?? []);
  } catch {
    return new Set();
  }
}

async function saveSeen(seenSet) {
  const pmids = [...seenSet].slice(-settings.seenMemory);
  await fs.writeFile(SEEN_FILE, JSON.stringify({ pmids }, null, 2));
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Falta GEMINI_API_KEY en el entorno.");
    process.exit(1);
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const seen = await loadSeen();

  const ncbiOpts = {
    tool: settings.ncbiTool,
    email: settings.ncbiEmail,
    apiKey: process.env.NCBI_API_KEY || "",
    reldate: settings.daysBack,
    retmax: settings.candidatesPerTopic,
    englishOnly: settings.englishOnly,
  };

  const cards = [];

  for (const topic of topics) {
    if (cards.length >= settings.maxCards) break;
    process.stdout.write(`\n[${topic.tag}] buscando… `);

    let pmids;
    try {
      pmids = await searchRecentPmids(topic.query, ncbiOpts);
    } catch (e) {
      console.log(`error de búsqueda: ${e.message}`);
      continue;
    }
    await sleep(NCBI_DELAY);

    const fresh = pmids.filter((id) => !seen.has(id)).slice(0, settings.itemsPerTopic);
    if (!fresh.length) {
      console.log("sin novedades.");
      continue;
    }
    console.log(`${fresh.length} novedad(es).`);

    let articles = [];
    try {
      articles = await fetchArticles(fresh, ncbiOpts);
    } catch (e) {
      console.log(`  error al descargar: ${e.message}`);
      continue;
    }
    await sleep(NCBI_DELAY);

    for (const article of articles) {
      if (cards.length >= settings.maxCards) break;
      try {
        const card = await summarizeArticle(article, topic, {
          apiKey: process.env.GEMINI_API_KEY,
          model: settings.model,
        });
        cards.push(card);
        seen.add(article.pmid);
        console.log(`  ✓ ${card.headlineEs}`);
      } catch (e) {
        console.log(`  ✗ no se pudo resumir PMID ${article.pmid}: ${e.message}`);
      }
      await sleep(GEMINI_DELAY);
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const digest = { date, generatedAt: new Date().toISOString(), count: cards.length, cards };

  await fs.writeFile(path.join(DATA_DIR, "latest.json"), JSON.stringify(digest, null, 2));
  await fs.writeFile(path.join(DATA_DIR, `${date}.json`), JSON.stringify(digest, null, 2));
  await saveSeen(seen);

  console.log(`\n=== Digest del ${date}: ${cards.length} tarjeta(s) ===`);
  console.log(`Guardado en ${path.join(DATA_DIR, "latest.json")}`);
}

main().catch((e) => {
  console.error("\nError fatal:", e);
  process.exit(1);
});
