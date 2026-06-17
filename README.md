# onco-daily · motor de contenido

Busca cada día las novedades en PubMed sobre **adenocarcinoma de páncreas, otros tumores de páncreas, vía biliar, hepatocarcinoma, tumores neuroendocrinos y vías moleculares (KRAS)**, descarta lo que ya viste y genera una **tarjeta clínica bilingüe** (resumen rápido, visual) usando la **IA gratuita de Google (Gemini)**.

Esta es la primera pieza del proyecto: el "cerebro". Funciona de forma aislada y se puede probar sin la app. Después se conecta a la app (Expo) y a la automatización diaria (GitHub Actions + notificación push).

## Requisitos

- Node.js 18 o superior (`node -v` para comprobar).
- Una clave GRATUITA de Google AI Studio (`GEMINI_API_KEY`), que empieza por `AIza`.
- (Opcional) Una clave gratuita de NCBI para ir más rápido.

## Instalación

```bash
cd onco-daily
npm install
cp .env.example .env       # y rellena GEMINI_API_KEY
```

## Uso

```bash
node --env-file=.env buildDigest.js
# o:  npm run digest   (si ya cargaste las variables de entorno)
```

Resultados en `data/`:

- `data/latest.json` — el digest de hoy (lo que leerá la app).
- `data/AAAA-MM-DD.json` — copia fechada de cada día.
- `data/seen.json` — artículos ya procesados (para no repetir).

## Privacidad

A la IA solo se le envían **abstracts públicos de PubMed** (nunca datos de pacientes). En el plan gratuito de Gemini, Google puede usar las entradas/salidas para mejorar sus modelos; como solo viajan resúmenes públicos ya publicados, no hay problema de confidencialidad.

## Ajustes (todo en `src/config.js`)

- **Categorías y consultas PubMed**: edita `topics`. Hay ejemplos comentados para añadir **FGFR2/IDH1** y **HER2**.
- `daysBack`: ventana de búsqueda (por defecto 7 días).
- `itemsPerTopic` / `maxCards`: cuántas tarjetas por categoría / en total.
- `model`: `gemini-2.5-flash` (gratuito) o `gemini-2.5-flash-lite` (más ligero).

## Límites del plan gratuito

El plan gratuito de Gemini tiene un tope de peticiones por minuto y por día, de sobra para ~6-8 tarjetas diarias. El motor ya espera entre resúmenes para no superarlo. PubMed E-utilities es gratuito.

## Nota honesta sobre la ejecución

No puedo ejecutar este script desde el chat (mi entorno solo accede a repositorios de paquetes, no a PubMed ni a la IA). Está listo para que lo corras tú o, mejor, en GitHub Actions. Si algún `query` trae poco o demasiado, lo afinamos juntos.

## Próximos pasos

1. Probar el motor y ajustar las consultas a tu criterio clínico.
2. Montar la **app Expo** que lee `latest.json` y muestra el feed de tarjetas.
3. Automatizar con **GitHub Actions** (cron diario) + **notificación push** al móvil.
