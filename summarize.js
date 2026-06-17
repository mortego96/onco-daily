// =============================================================
//  Resumidor con la API de Gemini (Google AI Studio) — plan GRATUITO
//  Convierte un artículo (título + abstract) en una "tarjeta" JSON
//  bilingüe con la estructura que consume la app.
// =============================================================

const SYSTEM = `Eres oncólogo experto en tumores hepatobiliopancreáticos, neuroendocrinos y vías moleculares (KRAS).
Resumes un artículo científico en una TARJETA clínica bilingüe: español como idioma principal, inglés conciso para términos clave.
Tu salida debe ser ÚNICAMENTE un objeto JSON válido, sin markdown, sin texto antes ni después.

Reglas:
- Fidelidad absoluta al abstract. No inventes cifras. Si un dato no aparece, usa null.
- Titulares cortos y claros (máx. ~12 palabras).
- En "arms" pon SOLO la comparación cuantitativa más importante (p. ej. mediana de SG por brazo). Si no hay comparación cuantitativa, deja "arms": [].
- "hr" en formato "0.58 (IC95% 0.46–0.73)" si el abstract lo da; si no, null.
- "facts": 2 a 4 datos clave (población, mecanismo, biomarcador, tolerabilidad). "icon" = nombre de icono Tabler sin prefijo (users, pill, dna, shield-check, target, clock, alert-triangle).
- "relevance": "Práctica clínica" (resultado clínico accionable), "Emergente" (fase temprana/señal) o "Preclínico".

Esquema EXACTO:
{
  "tumorType": string,
  "headlineEs": string,
  "headlineEn": string,
  "studyType": string,
  "trialName": string|null,
  "n": string|null,
  "primaryMetricLabelEs": string|null,
  "primaryMetricLabelEn": string|null,
  "arms": [ { "name": string, "value": string, "months": number|null, "highlight": boolean } ],
  "hr": string|null,
  "pfs": string|null,
  "facts": [ { "icon": string, "es": string, "en": string } ],
  "bottomLineEs": string,
  "bottomLineEn": string,
  "relevance": "Práctica clínica" | "Emergente" | "Preclínico"
}`;

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Extrae un objeto JSON del texto devuelto (tolera restos por si acaso).
function extractJson(raw) {
  let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Sin JSON en la respuesta");
  return JSON.parse(s.slice(start, end + 1));
}

export async function summarizeArticle(article, topic, opts) {
  const { apiKey, model } = opts;

  const user =
    `Categoría: ${topic.tag}\n` +
    `Revista: ${article.journal}\n` +
    `Título: ${article.title}\n\n` +
    `Abstract:\n${article.abstract}\n\n` +
    `Genera la tarjeta JSON usando "${topic.tag}" como tumorType.`;

  const res = await fetch(`${ENDPOINT(model)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json", // pide JSON limpio
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Respuesta vacía de Gemini");

  const card = extractJson(text);

  // Metadatos de procedencia que añade el motor (no el modelo).
  card.pmid = article.pmid;
  card.url = article.url;
  card.source = article.journal;
  card.date = article.pubdate || new Date().toISOString().slice(0, 10);
  card.topicId = topic.id;
  return card;
}
