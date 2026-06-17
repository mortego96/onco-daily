// =============================================================
//  Configuración del motor de contenido
//  Edita aquí las categorías, las consultas PubMed y los ajustes.
// =============================================================

// Filtro que se EXCLUYE de todas las búsquedas. Aquí quitamos los casos
// clínicos aislados (incluso los recién publicados, mirando también el título).
const EXCLUIR =
  ' NOT ("Case Reports"[Publication Type] OR "case report"[ti] OR "case series"[ti] OR "a case of"[ti])';

// Cada categoría tiene:
//   id    -> identificador interno (no lo cambies una vez en uso; se usa para deduplicar)
//   tag   -> etiqueta que verás en la tarjeta (puedes ajustarla a tu gusto)
//   query -> consulta PubMed. Usa sintaxis estándar de PubMed.
//            [tiab] = título/abstract, [ti] = solo título, [la] = idioma.
//            El filtro de FECHA no va aquí: se controla con settings.daysBack.

export const topics = [
  {
    id: "pdac",
    tag: "Páncreas · adenocarcinoma (PDAC)",
    query:
      '("pancreatic adenocarcinoma"[tiab] OR "pancreatic ductal adenocarcinoma"[tiab] OR PDAC[tiab]) ' +
      'AND (treatment[tiab] OR therapy[tiab] OR trial[tiab] OR survival[tiab] OR chemotherapy[tiab] OR immunotherapy[tiab] OR targeted[tiab])' +
      EXCLUIR,
  },
  {
    id: "panc_other",
    tag: "Páncreas · otros tumores",
    query:
      '(pancreatic[tiab] OR pancreas[tiab]) ' +
      'AND ("acinar cell carcinoma"[tiab] OR "cystic neoplasm"[tiab] OR IPMN[tiab] OR "solid pseudopapillary"[tiab] OR pancreatoblastoma[tiab]) ' +
      'NOT "ductal adenocarcinoma"[tiab]' +
      EXCLUIR,
  },
  {
    id: "biliary",
    tag: "Vía biliar (BTC)",
    query:
      '(cholangiocarcinoma[tiab] OR "biliary tract cancer"[tiab] OR "gallbladder cancer"[tiab] OR "bile duct cancer"[tiab]) ' +
      'AND (treatment[tiab] OR therapy[tiab] OR trial[tiab] OR FGFR[tiab] OR IDH[tiab] OR HER2[tiab] OR durvalumab[tiab])' +
      EXCLUIR,
  },
  {
    id: "hcc",
    tag: "Hepatocarcinoma (HCC)",
    query:
      '("hepatocellular carcinoma"[tiab] OR HCC[tiab]) ' +
      'AND (treatment[tiab] OR therapy[tiab] OR trial[tiab] OR atezolizumab[tiab] OR lenvatinib[tiab] OR durvalumab[tiab] OR immunotherapy[tiab])' +
      EXCLUIR,
  },
  {
    id: "net",
    tag: "Tumores neuroendocrinos (NET)",
    query:
      '("neuroendocrine tumor"[tiab] OR "neuroendocrine tumour"[tiab] OR "neuroendocrine neoplasm"[tiab] OR "neuroendocrine carcinoma"[tiab] OR GEP-NET[tiab]) ' +
      'AND (treatment[tiab] OR therapy[tiab] OR trial[tiab] OR PRRT[tiab] OR somatostatin[tiab] OR "177Lu"[tiab])' +
      EXCLUIR,
  },
  {
    id: "kras",
    tag: "Vías moleculares · KRAS",
    query:
      '(KRAS[tiab] OR "RAS"[ti]) ' +
      'AND (pancreatic[tiab] OR cholangiocarcinoma[tiab] OR biliary[tiab] OR hepatocellular[tiab] OR neuroendocrine[tiab] OR gastrointestinal[tiab]) ' +
      'AND (inhibitor[tiab] OR mutation[tiab] OR targeted[tiab] OR therapy[tiab] OR G12[tiab] OR degrader[tiab])' +
      EXCLUIR,
  },

  // ---- Categorías moleculares extra (descoméntalas cuando quieras) ----
  // {
  //   id: "fgfr_idh",
  //   tag: "Vías moleculares · FGFR2 / IDH1",
  //   query:
  //     '((FGFR2[tiab] OR "FGFR fusion"[tiab] OR IDH1[tiab] OR IDH2[tiab])) ' +
  //     'AND (cholangiocarcinoma[tiab] OR "biliary tract"[tiab] OR pancreatic[tiab])' + EXCLUIR,
  // },
  // {
  //   id: "her2",
  //   tag: "Vías moleculares · HER2 (ERBB2)",
  //   query:
  //     '(HER2[tiab] OR ERBB2[tiab]) ' +
  //     'AND (biliary[tiab] OR cholangiocarcinoma[tiab] OR gallbladder[tiab] OR pancreatic[tiab] OR gastrointestinal[tiab])' + EXCLUIR,
  // },
];

export const settings = {
  // Ventana de búsqueda: artículos AÑADIDOS a PubMed en los últimos N días.
  daysBack: 7,

  // Cuántos candidatos recientes pedir por categoría antes de filtrar lo ya visto.
  candidatesPerTopic: 20,

  // Cuántas tarjetas generar por categoría que tenga novedades.
  itemsPerTopic: 1,

  // Tope total de tarjetas por ejecución (hasta una por tema = 6-8 al día).
  maxCards: 8,

  // Restringir a artículos en inglés (recomendado para resúmenes de calidad).
  englishOnly: true,

  // Modelo de la API de Gemini (Google AI Studio) para resumir.
  // "gemini-2.5-flash" está en el plan gratuito y va sobrado para esto.
  // Alternativa gratuita más ligera/rápida: "gemini-2.5-flash-lite".
  model: "gemini-2.5-flash",

  // Datos de cortesía que NCBI pide en las llamadas a E-utilities.
  ncbiTool: "onco-daily",
  ncbiEmail: process.env.NCBI_EMAIL || "",

  // Cuántos PMIDs recordar como "ya vistos" (evita crecimiento infinito).
  seenMemory: 8000,
};
