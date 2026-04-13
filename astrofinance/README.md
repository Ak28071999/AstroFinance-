# 🪐 AstroFinance Oracle

**9 Global Markets · Real Vedic Ephemeris · 5-Dimension AI Analysis · 300+ Stocks**

A financial analysis tool combining real astronomical calculations with AI-powered market predictions across NYSE, NSE/BSE, LSE, TSE, Euronext, SGX, ASX, TSX, and HKEX.

---

## Features

- **Real Ephemeris** — J2000 planetary positions computed locally in the browser, no API
- **9 Global Markets** — USA, India, UK, Japan, Europe, Singapore, Australia, Canada, Hong Kong
- **Instant Analysis** — Sector scoring, stock analysis, and warnings load in milliseconds
- **5-Dimension Stock Analysis** — Fundamental · Technical · Astrological · Geopolitical · Macro
- **AI Predictions** — 3-horizon predictions (4 days / 1 week / 1 month) via Claude API
- **Planetary Aspects** — Conjunction, Sextile, Square, Trine, Opposition with 8° orb
- **Risk Warnings** — Debilitated planets, Mars-Rahu conjunction, Saturn-Jupiter conjunction
- **Oracle Chat** — Ask questions about any stock or sector with full market context

## Stack

- React 18 + Vite
- Vanilla inline styles (zero CSS framework dependencies)
- Anthropic Claude API (optional — only fires on user request)
- No other dependencies

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deploy

**GitHub Pages** (automatic via GitHub Actions on every push to `main`):
1. Enable GitHub Pages in repo Settings → Pages → Source: GitHub Actions
2. Push to `main` — the workflow builds and deploys automatically

**Vercel / Netlify**:
1. Import the repo
2. Framework: Vite
3. Build command: `npm run build`
4. Output dir: `dist`
5. Change `base` in `vite.config.js` from `'/astrofinance-oracle/'` to `'/'`

## Disclaimer

Educational and exploratory tool only. Not financial advice. Consult a SEBI/SEC/FCA-registered advisor before making investment decisions. Astrological analysis is one of many inputs and should not be the sole basis for any investment.

---

Built with ❤️ using React, Vite, and the Anthropic Claude API.
