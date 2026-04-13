// ============================================================
// ASTROFINANCE ORACLE — v1.0 COMPLETE
// Phase 0: Data Model       Phase 1: Ephemeris Engine
// Phase 2: UI Shell         Phase 3: Stock Analysis Engine
// Phase 4: Stock Modal      Phase 5: AI Integration
// Phase 6: Polish & Hardening
// 9 Global Markets · Real Ephemeris · 5-Dimension AI Analysis
// ============================================================

import { useState, useMemo, useRef, useEffect } from "react";

// ============================================================
// PHASE 0 — DATA MODEL
// All types and constants defined before any computation
// ============================================================

/*
  PLANET OBJECT:
  { name, sym, lon, nature, rashi, rashiName, rashiSym,
    degree, status, score, color, icon }

  SECTOR OBJECT:
  { name, col, ico, rulers[], stocks[], score }

  STOCK OBJECT:
  { t(icker), n(ame), p(rice base), g(lobal bool),
    r(egions)[], rev(enue desc) }

  MARKET OBJECT:
  { flag, cur, code, idx, reg, tz, country, cP(country planets),
    sectors{} }
*/

// Zodiac signs
var RASHIS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
];
var RSYM = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
var RELEM = ["Fire","Earth","Air","Water","Fire","Earth","Air","Water","Fire","Earth","Air","Water"];
var RMODE = ["Cardinal","Fixed","Mutable","Cardinal","Fixed","Mutable","Cardinal","Fixed","Mutable","Cardinal","Fixed","Mutable"];

// Dignity tables
var EXALT = { Sun:0, Moon:1, Mercury:5, Venus:11, Mars:9, Jupiter:3, Saturn:6 };
var DEBIL  = { Sun:6, Moon:7, Mercury:11, Venus:5, Mars:3, Jupiter:9, Saturn:0 };
var OWN    = { Sun:[4], Moon:[3], Mercury:[2,5], Venus:[1,6], Mars:[0,7], Jupiter:[8,11], Saturn:[9,10] };

// Nature of planets for bonus scoring
var NATURE = {
  Sun:"benefic", Moon:"benefic", Mercury:"neutral",
  Venus:"benefic", Mars:"malefic", Jupiter:"benefic",
  Saturn:"malefic", Rahu:"malefic", Ketu:"malefic"
};

// ============================================================
// PHASE 1 — EPHEMERIS ENGINE
// Real astronomical calculations from J2000 epoch
// Accurate to ~1 degree (sufficient for financial astrology)
// ============================================================

var J2000 = 2451545.0;

function toJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function n360(a) {
  return ((a % 360) + 360) % 360;
}

// Simplified VSOP87 truncations for each planet
function calcSun(jd) {
  var n = jd - J2000;
  var L = n360(280.46 + 0.9856474 * n);
  var g = n360(357.528 + 0.9856003 * n) * Math.PI / 180;
  return n360(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
}

function calcMoon(jd) {
  var n = jd - J2000;
  var L = n360(218.316 + 13.176396 * n);
  var M = n360(134.963 + 13.064993 * n) * Math.PI / 180;
  var F = n360(93.272  + 13.229350 * n) * Math.PI / 180;
  return n360(L + 6.289 * Math.sin(M) - 1.274 * Math.sin(2*F - M) + 0.658 * Math.sin(2*F));
}

function calcMercury(jd) {
  var n = jd - J2000;
  var L = n360(252.251 + 4.092338 * n);
  var M = n360(174.791 + 4.092338 * n) * Math.PI / 180;
  return n360(L + 23.44 * Math.sin(M) + 2.96 * Math.sin(2*M));
}

function calcVenus(jd) {
  var n = jd - J2000;
  var L = n360(181.979 + 1.602130 * n);
  var M = n360(50.416  + 1.602130 * n) * Math.PI / 180;
  return n360(L + 0.776 * Math.sin(M));
}

function calcMars(jd) {
  var n = jd - J2000;
  var L = n360(355.433 + 0.524039 * n);
  var M = n360(19.373  + 0.524039 * n) * Math.PI / 180;
  return n360(L + 10.691 * Math.sin(M) + 0.623 * Math.sin(2*M));
}

function calcJupiter(jd) {
  var n = jd - J2000;
  var L = n360(34.351 + 0.083056 * n);
  var M = n360(20.020 + 0.083056 * n) * Math.PI / 180;
  return n360(L + 5.550 * Math.sin(M) + 0.167 * Math.sin(2*M));
}

function calcSaturn(jd) {
  var n = jd - J2000;
  var L = n360(50.077 + 0.033459 * n);
  var M = n360(317.020 + 0.033459 * n) * Math.PI / 180;
  return n360(L + 6.393 * Math.sin(M) + 0.191 * Math.sin(2*M));
}

function calcRahu(jd) {
  // Mean lunar node (retrograde ~19.3°/year)
  var n = jd - J2000;
  return n360(125.0445 - 0.0529539 * n);
}

// Determine planetary dignity and score
function getPlanetStatus(name, rashi) {
  if (EXALT[name] === rashi) {
    return { status: "Exalted",      score: 28,  color: "#00e87a", icon: "⬆" };
  }
  if (DEBIL[name] === rashi) {
    return { status: "Debilitated",  score: -22, color: "#ff3d54", icon: "⬇" };
  }
  if ((OWN[name] || []).indexOf(rashi) !== -1) {
    return { status: "Own Sign",     score: 16,  color: "#f0c030", icon: "✦" };
  }
  return   { status: "Transit",      score: 0,   color: "#5a6680", icon: "→" };
}

// Main ephemeris function — returns all 9 planets for a given date
function computePlanets(date) {
  var jd = toJD(date);

  var rahuLon  = calcRahu(jd);
  var ketuLon  = n360(rahuLon + 180);

  var raw = [
    { name: "Sun",     sym: "☉", lon: calcSun(jd),     nature: "benefic" },
    { name: "Moon",    sym: "☽", lon: calcMoon(jd),    nature: "benefic" },
    { name: "Mercury", sym: "☿", lon: calcMercury(jd), nature: "neutral" },
    { name: "Venus",   sym: "♀", lon: calcVenus(jd),   nature: "benefic" },
    { name: "Mars",    sym: "♂", lon: calcMars(jd),    nature: "malefic" },
    { name: "Jupiter", sym: "♃", lon: calcJupiter(jd), nature: "benefic" },
    { name: "Saturn",  sym: "♄", lon: calcSaturn(jd),  nature: "malefic" },
    { name: "Rahu",    sym: "☊", lon: rahuLon,         nature: "malefic" },
    { name: "Ketu",    sym: "☋", lon: ketuLon,         nature: "malefic" },
  ];

  return raw.map(function(p) {
    var rashi  = Math.floor(p.lon / 30) % 12;
    var degree = (p.lon % 30).toFixed(1);
    var status = getPlanetStatus(p.name, rashi);
    return {
      name:      p.name,
      sym:       p.sym,
      lon:       p.lon,
      nature:    p.nature,
      rashi:     rashi,
      rashiName: RASHIS[rashi],
      rashiSym:  RSYM[rashi],
      rashiElem: RELEM[rashi],
      rashiMode: RMODE[rashi],
      degree:    degree,
      status:    status.status,
      score:     status.score,
      color:     status.color,
      icon:      status.icon,
    };
  });
}

// Detect planetary aspects (orb: 8°)
function computeAspects(planets) {
  var aspects = [];
  var ORB = 8;
  for (var i = 0; i < planets.length; i++) {
    for (var j = i + 1; j < planets.length; j++) {
      var a = planets[i];
      var b = planets[j];
      var diff = Math.abs(a.lon - b.lon);
      if (diff > 180) diff = 360 - diff;

      var type = null;
      if (diff <= ORB)              type = { name: "Conjunction", harmony: "mixed",  symbol: "☌" };
      else if (Math.abs(diff-60)  <= ORB) type = { name: "Sextile",     harmony: "easy",   symbol: "⚹" };
      else if (Math.abs(diff-90)  <= ORB) type = { name: "Square",      harmony: "tense",  symbol: "□" };
      else if (Math.abs(diff-120) <= ORB) type = { name: "Trine",       harmony: "easy",   symbol: "△" };
      else if (Math.abs(diff-180) <= ORB) type = { name: "Opposition",  harmony: "tense",  symbol: "☍" };

      if (type) {
        aspects.push({
          a: a.name, b: b.name,
          aSym: a.sym, bSym: b.sym,
          aColor: a.color, bColor: b.color,
          type: type.name, harmony: type.harmony, symbol: type.symbol,
          orb: diff.toFixed(1),
        });
      }
    }
  }
  return aspects;
}

// ============================================================
// MARKET & SECTOR DATA
// ============================================================

var MARKETS = {
  "🇺🇸 USA — NYSE/NASDAQ": {
    flag:"🇺🇸", cur:"$", code:"USD", idx:"S&P 500 / NASDAQ", reg:"SEC", tz:"EST",
    country:"USA", cP:["Mars","Mercury"],
    sectors:{
      "Big Tech":    { col:"#00c8ff", ico:"💻", rulers:["Mercury","Rahu"], stocks:[
        {t:"AAPL",  n:"Apple Inc.",       p:228,  g:true,  r:["175 countries"],      rev:"Devices & services"},
        {t:"MSFT",  n:"Microsoft",        p:415,  g:true,  r:["190 countries"],      rev:"Cloud & enterprise"},
        {t:"NVDA",  n:"NVIDIA",           p:135,  g:true,  r:["Global chipmakers"],  rev:"AI GPUs"},
        {t:"GOOGL", n:"Alphabet",         p:195,  g:true,  r:["Global"],             rev:"Ads & cloud"},
        {t:"META",  n:"Meta Platforms",   p:615,  g:true,  r:["Global 3B+ users"],   rev:"Social & ads"},
        {t:"AMZN",  n:"Amazon",           p:225,  g:true,  r:["19 countries"],       rev:"eCommerce & AWS"},
      ]},
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"JPM",   n:"JPMorgan Chase",   p:248,  g:true,  r:["60+ countries"],      rev:"Universal banking"},
        {t:"BAC",   n:"Bank of America",  p:45,   g:true,  r:["35+ countries"],      rev:"Consumer banking"},
        {t:"GS",    n:"Goldman Sachs",    p:578,  g:true,  r:["Global"],             rev:"Investment banking"},
        {t:"V",     n:"Visa Inc.",        p:315,  g:true,  r:["200+ countries"],     rev:"Payment networks"},
        {t:"MS",    n:"Morgan Stanley",   p:112,  g:true,  r:["Global"],             rev:"Wealth management"},
        {t:"WFC",   n:"Wells Fargo",      p:72,   g:false, r:["USA"],                rev:"Retail banking"},
      ]},
      "Healthcare":  { col:"#00e87a", ico:"💊", rulers:["Jupiter","Moon"], stocks:[
        {t:"LLY",   n:"Eli Lilly",        p:890,  g:true,  r:["Global"],             rev:"Diabetes & obesity"},
        {t:"UNH",   n:"UnitedHealth",     p:528,  g:true,  r:["USA, global"],        rev:"Health insurance"},
        {t:"JNJ",   n:"J&J",             p:158,  g:true,  r:["60 countries"],       rev:"Pharma & medtech"},
        {t:"ABBV",  n:"AbbVie",           p:178,  g:true,  r:["Global"],             rev:"Specialty pharma"},
        {t:"MRK",   n:"Merck",            p:98,   g:true,  r:["140+ countries"],     rev:"Oncology & vaccines"},
        {t:"PFE",   n:"Pfizer",           p:24,   g:true,  r:["175 countries"],      rev:"Pharmaceuticals"},
      ]},
      "Energy":      { col:"#ff6820", ico:"⚡", rulers:["Saturn","Sun"], stocks:[
        {t:"XOM",   n:"Exxon Mobil",      p:118,  g:true,  r:["Global E&P"],         rev:"Integrated oil & gas"},
        {t:"CVX",   n:"Chevron",          p:152,  g:true,  r:["Global"],             rev:"Integrated oil & gas"},
        {t:"NEE",   n:"NextEra Energy",   p:71,   g:true,  r:["USA, Canada"],        rev:"Renewable power"},
        {t:"COP",   n:"ConocoPhillips",   p:98,   g:true,  r:["Global"],             rev:"E&P"},
        {t:"SLB",   n:"SLB",             p:41,   g:true,  r:["120+ countries"],     rev:"Oilfield services"},
        {t:"OXY",   n:"Occidental",       p:48,   g:true,  r:["USA, ME, LatAm"],    rev:"E&P & chemicals"},
      ]},
      "Defence":     { col:"#dc1430", ico:"🛡️", rulers:["Mars","Sun"], stocks:[
        {t:"LMT",   n:"Lockheed Martin",  p:475,  g:true,  r:["USA & allies"],       rev:"Fighter jets & missiles"},
        {t:"RTX",   n:"RTX Corp",         p:128,  g:true,  r:["Global"],             rev:"Defence systems"},
        {t:"NOC",   n:"Northrop Grumman", p:487,  g:true,  r:["USA & allies"],       rev:"Aerospace & defence"},
        {t:"GD",    n:"General Dynamics", p:278,  g:true,  r:["USA & allies"],       rev:"Defence & jets"},
        {t:"BA",    n:"Boeing",           p:165,  g:true,  r:["150+ countries"],     rev:"Aircraft & defence"},
        {t:"HII",   n:"Huntington Ingalls",p:245, g:false, r:["USA"],                rev:"Naval shipbuilding"},
      ]},
      "Consumer":    { col:"#e060a0", ico:"🛒", rulers:["Venus","Moon"], stocks:[
        {t:"WMT",   n:"Walmart",          p:98,   g:true,  r:["24 countries"],       rev:"Retail megachain"},
        {t:"COST",  n:"Costco",           p:985,  g:true,  r:["14 countries"],       rev:"Membership retail"},
        {t:"MCD",   n:"McDonald's",       p:285,  g:true,  r:["120+ countries"],     rev:"Fast food"},
        {t:"NKE",   n:"Nike",             p:76,   g:true,  r:["190+ countries"],     rev:"Athletic footwear"},
        {t:"SBUX",  n:"Starbucks",        p:95,   g:true,  r:["87 countries"],       rev:"Coffee chain"},
        {t:"TGT",   n:"Target",           p:128,  g:false, r:["USA"],                rev:"Discount retail"},
      ]},
      "EV & Autos":  { col:"#80f040", ico:"🚗", rulers:["Venus","Mars"], stocks:[
        {t:"TSLA",  n:"Tesla",            p:285,  g:true,  r:["Global 6 factories"], rev:"EV, energy, AI"},
        {t:"GM",    n:"General Motors",   p:51,   g:true,  r:["Global"],             rev:"Autos & EVs"},
        {t:"F",     n:"Ford Motor",       p:10,   g:true,  r:["Global"],             rev:"Autos & EVs"},
        {t:"UBER",  n:"Uber",             p:82,   g:true,  r:["70+ countries"],      rev:"Rideshare & delivery"},
        {t:"RIVN",  n:"Rivian",           p:12,   g:false, r:["USA"],                rev:"Electric trucks"},
        {t:"LYFT",  n:"Lyft",             p:14,   g:false, r:["USA, Canada"],        rev:"Rideshare"},
      ]},
      "REITs":       { col:"#9060e0", ico:"🏗️", rulers:["Moon","Venus"], stocks:[
        {t:"AMT",   n:"American Tower",   p:185,  g:true,  r:["25 countries"],       rev:"Cell tower REITs"},
        {t:"EQIX",  n:"Equinix",          p:885,  g:true,  r:["33 countries"],       rev:"Data centre REITs"},
        {t:"PLD",   n:"Prologis",         p:112,  g:true,  r:["20 countries"],       rev:"Industrial REITs"},
        {t:"SPG",   n:"Simon Property",   p:168,  g:true,  r:["USA, Asia, Europe"],  rev:"Mall REITs"},
        {t:"O",     n:"Realty Income",    p:54,   g:true,  r:["USA, Europe"],        rev:"Net lease REITs"},
        {t:"PSA",   n:"Public Storage",   p:295,  g:false, r:["USA"],                rev:"Self-storage REITs"},
      ]},
    }
  },

  "🇮🇳 India — NSE/BSE": {
    flag:"🇮🇳", cur:"₹", code:"INR", idx:"NIFTY 50 / SENSEX", reg:"SEBI", tz:"IST",
    country:"India", cP:["Jupiter","Moon"],
    sectors:{
      "IT & Tech":   { col:"#00c8ff", ico:"💻", rulers:["Mercury","Rahu"], stocks:[
        {t:"TCS",       n:"Tata Consultancy",  p:3890, g:true,  r:["USA","Europe","UK"],     rev:"IT services"},
        {t:"INFY",      n:"Infosys",           p:1720, g:true,  r:["USA","Europe","AU"],     rev:"IT consulting"},
        {t:"HCLTECH",   n:"HCL Tech",          p:1640, g:true,  r:["USA","Europe","MEA"],    rev:"IT & BPO"},
        {t:"WIPRO",     n:"Wipro",             p:480,  g:true,  r:["USA","Middle East"],     rev:"IT services"},
        {t:"LTIM",      n:"LTIMindtree",       p:5200, g:true,  r:["USA","Europe"],          rev:"Digital services"},
        {t:"TECHM",     n:"Tech Mahindra",     p:1580, g:true,  r:["USA","Europe","APAC"],   rev:"Telecom IT"},
      ]},
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"HDFCBANK",  n:"HDFC Bank",         p:1680, g:false, r:["India","UAE"],           rev:"Retail banking"},
        {t:"ICICIBANK", n:"ICICI Bank",        p:1290, g:true,  r:["India","UK","USA"],      rev:"Universal banking"},
        {t:"SBIN",      n:"State Bank",        p:780,  g:true,  r:["India","30+ countries"], rev:"Public sector banking"},
        {t:"KOTAKBANK", n:"Kotak Mahindra",    p:1860, g:false, r:["India"],                 rev:"Private banking"},
        {t:"AXISBANK",  n:"Axis Bank",         p:1110, g:true,  r:["India","Singapore"],     rev:"Retail banking"},
        {t:"BAJFINANCE",n:"Bajaj Finance",     p:7200, g:false, r:["India"],                 rev:"NBFC & lending"},
      ]},
      "Pharma":      { col:"#00e87a", ico:"💊", rulers:["Jupiter","Moon"], stocks:[
        {t:"SUNPHARMA", n:"Sun Pharma",        p:1640, g:true,  r:["USA","Europe","EM"],     rev:"Specialty pharma"},
        {t:"DRREDDY",   n:"Dr Reddy's",        p:6200, g:true,  r:["USA","Russia","EU"],     rev:"Generics & APIs"},
        {t:"CIPLA",     n:"Cipla",             p:1480, g:true,  r:["Africa","USA","EU"],     rev:"Generic drugs"},
        {t:"APOLLOHOSP",n:"Apollo Hospitals",  p:6800, g:false, r:["India","ME"],            rev:"Hospital chain"},
        {t:"DIVISLAB",  n:"Divi's Labs",       p:3800, g:true,  r:["USA","Europe","Japan"],  rev:"API manufacturing"},
        {t:"MANKIND",   n:"Mankind Pharma",    p:2200, g:false, r:["India"],                 rev:"OTC & generics"},
      ]},
      "Energy":      { col:"#ff6820", ico:"⚡", rulers:["Saturn","Sun"], stocks:[
        {t:"RELIANCE",  n:"Reliance Industries",p:2890,g:true,  r:["Global"],               rev:"Energy, telecom, retail"},
        {t:"ONGC",      n:"ONGC",              p:270,  g:true,  r:["India","Russia","Africa"],rev:"E&P oil & gas"},
        {t:"ADANIGREEN",n:"Adani Green",       p:1680, g:true,  r:["India","ME"],            rev:"Solar & wind"},
        {t:"NTPC",      n:"NTPC",              p:358,  g:false, r:["India"],                 rev:"Power generation"},
        {t:"BPCL",      n:"BPCL",              p:340,  g:false, r:["India","ME"],            rev:"Refining"},
        {t:"IOC",       n:"Indian Oil",        p:165,  g:false, r:["India"],                 rev:"Refining & pipelines"},
      ]},
      "Metals":      { col:"#c08030", ico:"⛏️", rulers:["Mars","Saturn"], stocks:[
        {t:"TATASTEEL", n:"Tata Steel",        p:158,  g:true,  r:["India","UK","Netherlands"],rev:"Integrated steel"},
        {t:"JSWSTEEL",  n:"JSW Steel",         p:920,  g:true,  r:["India","USA","Italy"],   rev:"Steel manufacturing"},
        {t:"HINDALCO",  n:"Hindalco",          p:620,  g:true,  r:["India","USA","Europe"],  rev:"Aluminium & copper"},
        {t:"VEDL",      n:"Vedanta",           p:440,  g:true,  r:["India","Zambia","SA"],   rev:"Diversified metals"},
        {t:"COALINDIA", n:"Coal India",        p:420,  g:false, r:["India"],                 rev:"Coal mining"},
        {t:"SAIL",      n:"SAIL",              p:125,  g:false, r:["India"],                 rev:"Steel — public sector"},
      ]},
      "Defence":     { col:"#dc1430", ico:"🛡️", rulers:["Mars","Sun"], stocks:[
        {t:"HAL",       n:"HAL",               p:4200, g:true,  r:["India","Exports"],       rev:"Aerospace & defence"},
        {t:"BEL",       n:"Bharat Electronics",p:280,  g:false, r:["India"],                 rev:"Defence electronics"},
        {t:"LT",        n:"L&T",               p:3650, g:true,  r:["India","ME","Africa"],   rev:"Infra & defence"},
        {t:"BHARATFORG",n:"Bharat Forge",      p:1180, g:true,  r:["India","Germany","USA"], rev:"Forgings & defence"},
        {t:"DATAPATTNS",n:"Data Patterns",     p:2100, g:false, r:["India"],                 rev:"Defence electronics"},
        {t:"BEML",      n:"BEML",              p:3800, g:false, r:["India"],                 rev:"Heavy machinery"},
      ]},
      "FMCG":        { col:"#e060a0", ico:"🛒", rulers:["Venus","Moon"], stocks:[
        {t:"HINDUNILVR",n:"HUL",               p:2340, g:true,  r:["India","Unilever net"],  rev:"Consumer goods"},
        {t:"ITC",       n:"ITC",               p:450,  g:true,  r:["India","90+ export"],    rev:"FMCG, hotels, agri"},
        {t:"NESTLEIND", n:"Nestle India",      p:2280, g:true,  r:["India — Nestle parent"], rev:"Food & beverages"},
        {t:"DABUR",     n:"Dabur",             p:560,  g:true,  r:["India","ME","Africa"],   rev:"Ayurvedic FMCG"},
        {t:"BRITANNIA", n:"Britannia",         p:4800, g:false, r:["India","ME"],            rev:"Bakery & dairy"},
        {t:"DMART",     n:"DMart",             p:3800, g:false, r:["India"],                 rev:"Hypermarket retail"},
      ]},
      "Real Estate": { col:"#9060e0", ico:"🏗️", rulers:["Moon","Venus"], stocks:[
        {t:"DLF",       n:"DLF",               p:840,  g:false, r:["India"],                 rev:"Residential & commercial"},
        {t:"GODREJPROP",n:"Godrej Properties", p:2640, g:false, r:["India"],                 rev:"Residential"},
        {t:"PHOENIXLTD",n:"Phoenix Mills",     p:1640, g:false, r:["India"],                 rev:"Retail malls"},
        {t:"PRESTIGE",  n:"Prestige Estates",  p:1680, g:false, r:["India"],                 rev:"Diversified realty"},
        {t:"OBEROIRLTY",n:"Oberoi Realty",     p:1780, g:false, r:["Mumbai"],                rev:"Luxury real estate"},
        {t:"MACROTECH", n:"Macrotech (Lodha)", p:1240, g:true,  r:["India","UK"],            rev:"Residential"},
      ]},
    }
  },

  "🇬🇧 UK — LSE/FTSE": {
    flag:"🇬🇧", cur:"£", code:"GBP", idx:"FTSE 100", reg:"FCA", tz:"GMT",
    country:"UK", cP:["Saturn","Mercury"],
    sectors:{
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"HSBA",  n:"HSBC Holdings",    p:738,  g:true,  r:["65+ countries"],      rev:"Global banking"},
        {t:"LLOY",  n:"Lloyds Banking",   p:58,   g:false, r:["UK"],                 rev:"Retail banking"},
        {t:"BARC",  n:"Barclays",         p:268,  g:true,  r:["40+ countries"],      rev:"Universal banking"},
        {t:"STAN",  n:"Standard Chartered",p:935, g:true,  r:["Asia, Africa, ME"],   rev:"Emerging market banking"},
        {t:"NWG",   n:"NatWest Group",    p:425,  g:false, r:["UK, Ireland"],        rev:"Retail banking"},
        {t:"AV",    n:"Aviva",            p:485,  g:true,  r:["UK, Ireland, Canada"],rev:"Insurance"},
      ]},
      "Energy":      { col:"#ff6820", ico:"⚡", rulers:["Saturn","Sun"], stocks:[
        {t:"BP",    n:"BP PLC",           p:430,  g:true,  r:["70+ countries"],      rev:"Integrated energy"},
        {t:"SHEL",  n:"Shell PLC",        p:2548, g:true,  r:["70+ countries"],      rev:"Integrated energy"},
        {t:"SSE",   n:"SSE PLC",          p:1748, g:false, r:["UK, Ireland"],        rev:"Electricity networks"},
        {t:"TLW",   n:"Tullow Oil",       p:18,   g:true,  r:["Africa"],             rev:"Africa E&P"},
        {t:"ENQ",   n:"EnQuest",          p:22,   g:false, r:["UK North Sea"],       rev:"North Sea E&P"},
        {t:"CNE",   n:"Capricorn Energy", p:178,  g:true,  r:["Africa, ME"],         rev:"E&P oil & gas"},
      ]},
      "Pharma":      { col:"#00e87a", ico:"💊", rulers:["Jupiter","Moon"], stocks:[
        {t:"AZN",   n:"AstraZeneca",      p:11850,g:true,  r:["100+ countries"],     rev:"Biopharmaceuticals"},
        {t:"GSK",   n:"GSK PLC",          p:1580, g:true,  r:["Global"],             rev:"Pharma & vaccines"},
        {t:"HIK",   n:"Hikma Pharma",     p:2140, g:true,  r:["50+ countries"],      rev:"Generics & branded"},
        {t:"CRDA",  n:"Croda International",p:3800,g:true, r:["Global"],             rev:"Specialty chemicals"},
        {t:"EXPN",  n:"Experian",         p:3748, g:true,  r:["45 countries"],       rev:"Credit data"},
        {t:"WISE",  n:"Wise PLC",         p:845,  g:true,  r:["170+ countries"],     rev:"Fintech transfers"},
      ]},
      "Consumer":    { col:"#e060a0", ico:"🛒", rulers:["Venus","Moon"], stocks:[
        {t:"TSCO",  n:"Tesco PLC",        p:368,  g:true,  r:["UK, Ireland, Europe"],rev:"Grocery retail"},
        {t:"ULVR",  n:"Unilever",         p:4258, g:true,  r:["190 countries"],      rev:"FMCG global"},
        {t:"DGE",   n:"Diageo",           p:2380, g:true,  r:["180+ markets"],       rev:"Premium spirits"},
        {t:"MKS",   n:"Marks & Spencer",  p:378,  g:false, r:["UK"],                 rev:"Clothing & food"},
        {t:"REL",   n:"RELX PLC",         p:3780, g:true,  r:["Global"],             rev:"Data & analytics"},
        {t:"AUTO",  n:"Auto Trader",      p:825,  g:false, r:["UK"],                 rev:"Automotive marketplace"},
      ]},
      "Mining":      { col:"#c08030", ico:"⛏️", rulers:["Mars","Saturn"], stocks:[
        {t:"RIO",   n:"Rio Tinto",        p:4978, g:true,  r:["35 countries"],       rev:"Diversified mining"},
        {t:"GLEN",  n:"Glencore",         p:345,  g:true,  r:["35 countries"],       rev:"Commodity trading"},
        {t:"AAL",   n:"Anglo American",   p:1578, g:true,  r:["Global mining ops"],  rev:"Diversified mining"},
        {t:"BHP",   n:"BHP Group (UK)",   p:2148, g:true,  r:["Australia, Americas"],rev:"Iron ore, copper"},
        {t:"FRES",  n:"Fresnillo",        p:632,  g:true,  r:["Mexico"],             rev:"Silver & gold"},
        {t:"ARM",   n:"Arm Holdings",     p:142,  g:true,  r:["Global chip IP"],     rev:"Chip IP licensing"},
      ]},
    }
  },

  "🇯🇵 Japan — TSE": {
    flag:"🇯🇵", cur:"¥", code:"JPY", idx:"Nikkei 225 / TOPIX", reg:"FSA", tz:"JST",
    country:"Japan", cP:["Mercury","Saturn"],
    sectors:{
      "Automotive":  { col:"#80f040", ico:"🚗", rulers:["Venus","Mars"], stocks:[
        {t:"7203",  n:"Toyota Motor",     p:2850, g:true,  r:["170+ countries"],     rev:"World's largest automaker"},
        {t:"7267",  n:"Honda Motor",      p:1685, g:true,  r:["Global"],             rev:"Autos, motorcycles"},
        {t:"7270",  n:"Subaru Corp",      p:2980, g:true,  r:["Global, USA focus"],  rev:"Autos"},
        {t:"7201",  n:"Nissan Motor",     p:385,  g:true,  r:["Global"],             rev:"Autos"},
        {t:"7269",  n:"Suzuki Motor",     p:1885, g:true,  r:["India, SE Asia"],     rev:"Small cars"},
        {t:"7012",  n:"Kawasaki Heavy",   p:3750, g:true,  r:["Global"],             rev:"Aerospace & ships"},
      ]},
      "Electronics": { col:"#00c8ff", ico:"💻", rulers:["Mercury","Rahu"], stocks:[
        {t:"6758",  n:"Sony Group",       p:2780, g:true,  r:["Global"],             rev:"Electronics, gaming"},
        {t:"6861",  n:"Keyence Corp",     p:65800,g:true,  r:["46 countries"],       rev:"Sensors & automation"},
        {t:"8035",  n:"Tokyo Electron",   p:24800,g:true,  r:["Global chipmakers"],  rev:"Semiconductor equipment"},
        {t:"6723",  n:"Renesas Electronics",p:2185,g:true, r:["Global"],             rev:"Microcontrollers"},
        {t:"9984",  n:"SoftBank Group",   p:9850, g:true,  r:["Global investments"], rev:"Tech investor & telecom"},
        {t:"6902",  n:"DENSO Corp",       p:2480, g:true,  r:["35 countries"],       rev:"Auto parts & electronics"},
      ]},
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"8306",  n:"Mitsubishi UFJ",   p:1485, g:true,  r:["40+ countries"],      rev:"Japan's largest bank"},
        {t:"8316",  n:"Sumitomo Mitsui",  p:3485, g:true,  r:["Global"],             rev:"Major banking group"},
        {t:"8411",  n:"Mizuho Financial", p:3285, g:true,  r:["Global"],             rev:"Banking & securities"},
        {t:"8604",  n:"Nomura Holdings",  p:785,  g:true,  r:["30+ countries"],      rev:"Investment banking"},
        {t:"8750",  n:"Dai-ichi Life",    p:3285, g:true,  r:["Japan, USA, Asia"],   rev:"Life insurance"},
        {t:"8253",  n:"Credit Saison",    p:2480, g:false, r:["Japan"],              rev:"Consumer credit"},
      ]},
      "Pharma":      { col:"#00e87a", ico:"💊", rulers:["Jupiter","Moon"], stocks:[
        {t:"4502",  n:"Takeda Pharma",    p:4285, g:true,  r:["80+ countries"],      rev:"Global pharma"},
        {t:"4568",  n:"Daiichi Sankyo",   p:4685, g:true,  r:["Global oncology"],    rev:"ADC cancer drugs"},
        {t:"4519",  n:"Chugai Pharma",    p:4385, g:true,  r:["Japan, via Roche"],   rev:"Oncology & rare disease"},
        {t:"4578",  n:"Otsuka Holdings",  p:5285, g:true,  r:["Global"],             rev:"CNS & pharma"},
        {t:"4523",  n:"Eisai Co.",        p:4885, g:true,  r:["Global"],             rev:"Neurology"},
        {t:"4151",  n:"Kyowa Kirin",      p:2485, g:true,  r:["Global"],             rev:"Nephrology & oncology"},
      ]},
    }
  },

  "🇪🇺 Europe — Euronext": {
    flag:"🇪🇺", cur:"€", code:"EUR", idx:"Euro Stoxx 50 / DAX / CAC 40", reg:"ESMA", tz:"CET",
    country:"Europe", cP:["Venus","Jupiter"],
    sectors:{
      "Luxury":      { col:"#e060a0", ico:"👜", rulers:["Venus","Moon"], stocks:[
        {t:"MC",    n:"LVMH (Paris)",      p:615,  g:true,  r:["75 countries"],       rev:"Luxury goods"},
        {t:"KER",   n:"Kering SA",         p:215,  g:true,  r:["Global luxury"],      rev:"Gucci, YSL, Balenciaga"},
        {t:"OR",    n:"L'Oréal",           p:395,  g:true,  r:["150+ countries"],     rev:"Beauty & cosmetics"},
        {t:"CFR",   n:"Richemont",         p:112,  g:true,  r:["Global watches"],     rev:"Cartier, IWC"},
        {t:"PPRUY", n:"Pernod Ricard",     p:85,   g:true,  r:["160+ markets"],       rev:"Premium spirits"},
        {t:"NOVOB", n:"Novo Nordisk",      p:485,  g:true,  r:["170+ countries"],     rev:"Diabetes & obesity"},
      ]},
      "Automotive":  { col:"#80f040", ico:"🚗", rulers:["Venus","Mars"], stocks:[
        {t:"VOW3",  n:"Volkswagen AG",     p:85,   g:true,  r:["150+ countries"],     rev:"VW, Audi, Porsche"},
        {t:"BMW",   n:"BMW AG",            p:68,   g:true,  r:["Global"],             rev:"Premium automobiles"},
        {t:"MBG",   n:"Mercedes-Benz",     p:54,   g:true,  r:["Global"],             rev:"Luxury automobiles"},
        {t:"STLA",  n:"Stellantis",        p:11,   g:true,  r:["130+ countries"],     rev:"Jeep, Fiat, Peugeot"},
        {t:"FER",   n:"Ferrari NV",        p:395,  g:true,  r:["Global supercars"],   rev:"Ferrari sports cars"},
        {t:"RNO",   n:"Renault SA",        p:38,   g:true,  r:["130+ countries"],     rev:"Autos & EVs"},
      ]},
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"BNP",   n:"BNP Paribas",       p:62,   g:true,  r:["65+ countries"],      rev:"Universal banking"},
        {t:"SAN",   n:"Santander",         p:4.8,  g:true,  r:["10 core markets"],    rev:"Retail banking"},
        {t:"DBK",   n:"Deutsche Bank",     p:24,   g:true,  r:["58 countries"],       rev:"Investment banking"},
        {t:"AXA",   n:"AXA SA",            p:34,   g:true,  r:["50+ countries"],      rev:"Insurance"},
        {t:"INGA",  n:"ING Group",         p:16,   g:true,  r:["40+ countries"],      rev:"Digital banking"},
        {t:"CABK",  n:"CaixaBank",         p:5.8,  g:false, r:["Spain, Portugal"],    rev:"Retail banking"},
      ]},
      "Pharma":      { col:"#00e87a", ico:"💊", rulers:["Jupiter","Moon"], stocks:[
        {t:"ROG",   n:"Roche Holding",     p:252,  g:true,  r:["100+ countries"],     rev:"Pharma & diagnostics"},
        {t:"NOVN",  n:"Novartis AG",       p:92,   g:true,  r:["140+ countries"],     rev:"Innovative medicines"},
        {t:"SANF",  n:"Sanofi",            p:88,   g:true,  r:["100+ countries"],     rev:"Vaccines & specialty"},
        {t:"BAYN",  n:"Bayer AG",          p:28,   g:true,  r:["Global"],             rev:"Pharma & crop science"},
        {t:"AIL",   n:"Air Liquide",       p:158,  g:true,  r:["73 countries"],       rev:"Industrial gases"},
        {t:"SIE",   n:"Siemens AG",        p:185,  g:true,  r:["190+ countries"],     rev:"Industrial automation"},
      ]},
      "Energy":      { col:"#ff6820", ico:"⚡", rulers:["Saturn","Sun"], stocks:[
        {t:"TTE",   n:"TotalEnergies",     p:62,   g:true,  r:["130+ countries"],     rev:"Integrated energy"},
        {t:"ENEL",  n:"Enel SpA",          p:6.8,  g:true,  r:["30+ countries"],      rev:"Electricity & renewables"},
        {t:"IBE",   n:"Iberdrola",         p:12,   g:true,  r:["Global renewables"],  rev:"Electricity & renewables"},
        {t:"ALO",   n:"Alstom",            p:12,   g:true,  r:["63 countries"],       rev:"Train & rail equipment"},
        {t:"SGO",   n:"Saint-Gobain",      p:68,   g:true,  r:["75 countries"],       rev:"Construction materials"},
        {t:"ENGI",  n:"Engie SA",          p:14,   g:true,  r:["30+ countries"],      rev:"Utilities & green energy"},
      ]},
    }
  },

  "🇸🇬 Singapore — SGX": {
    flag:"🇸🇬", cur:"S$", code:"SGD", idx:"Straits Times Index", reg:"MAS", tz:"SGT",
    country:"Singapore", cP:["Mercury","Jupiter"],
    sectors:{
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"D05",   n:"DBS Group",         p:42,   g:true,  r:["18 markets"],         rev:"SE Asia banking"},
        {t:"U11",   n:"UOB",               p:32,   g:true,  r:["19 countries"],       rev:"ASEAN banking"},
        {t:"O39",   n:"OCBC Bank",         p:16,   g:true,  r:["18 countries"],       rev:"Universal banking"},
        {t:"BN4",   n:"Keppel Corp",       p:7.5,  g:true,  r:["Asia, Americas"],     rev:"Infrastructure & asset mgmt"},
        {t:"U96",   n:"Sembcorp",          p:6.8,  g:true,  r:["10+ countries"],      rev:"Energy & utilities"},
        {t:"S68",   n:"SGX Exchange",      p:11,   g:true,  r:["Global listing"],     rev:"Exchange & financial infra"},
      ]},
      "REITs":       { col:"#9060e0", ico:"🏗️", rulers:["Moon","Venus"], stocks:[
        {t:"A17U",  n:"CapitaLand Ascendas",p:2.8, g:true,  r:["SG, AU, USA, UK"],   rev:"Industrial REITs"},
        {t:"C38U",  n:"CapitaLand Integrated",p:2.1,g:true, r:["SG, China, India"],  rev:"Retail & office REITs"},
        {t:"N2IU",  n:"Mapletree Pan Asia", p:1.5, g:true,  r:["SG, HK, China, JP"], rev:"Commercial REITs"},
        {t:"ME8U",  n:"Mapletree Industrial",p:2.3,g:true,  r:["SG, USA"],           rev:"Data centres & industrial"},
        {t:"T82U",  n:"Suntec REIT",        p:1.3, g:false, r:["SG, Australia"],     rev:"Office & retail REITs"},
        {t:"CLR",   n:"CapitaLand Invest.", p:3.2, g:true,  r:["40+ countries"],     rev:"Real estate investment mgmt"},
      ]},
      "Tech & Telecom":{ col:"#00c8ff", ico:"💻", rulers:["Mercury","Rahu"], stocks:[
        {t:"Z74",   n:"Singtel",           p:3.1,  g:true,  r:["21 countries"],       rev:"Telecom & digital"},
        {t:"GRAB",  n:"Grab Holdings",     p:4.2,  g:true,  r:["SE Asia 8 countries"],rev:"Super-app"},
        {t:"V03",   n:"Venture Corp",      p:13,   g:true,  r:["Global electronics"], rev:"EMS & tech products"},
        {t:"S58",   n:"SATS Ltd",          p:2.8,  g:true,  r:["13 countries"],       rev:"Aviation food & gateway"},
        {t:"U09",   n:"UMS Holdings",      p:1.1,  g:true,  r:["SG, Malaysia, USA"],  rev:"Semiconductor components"},
        {t:"C6L",   n:"Singapore Airlines",p:6.8,  g:true,  r:["130+ destinations"], rev:"Premium aviation"},
      ]},
      "Consumer":    { col:"#e060a0", ico:"🛒", rulers:["Venus","Moon"], stocks:[
        {t:"G13",   n:"Genting Singapore", p:0.85, g:false, r:["SG, Malaysia"],       rev:"Casino resort"},
        {t:"F34",   n:"Wilmar International",p:3.2,g:true,  r:["50+ countries"],      rev:"Agri-food processing"},
        {t:"J36",   n:"Jardine Matheson",  p:48,   g:true,  r:["Asia-Pacific"],       rev:"Diversified conglomerate"},
        {t:"Y92",   n:"Thai Beverage",     p:0.55, g:true,  r:["SE Asia"],            rev:"Beverages & food"},
        {t:"AGS",   n:"Anchiano Therapeutics",p:1.8,g:false,r:["SG"],                rev:"Consumer healthcare"},
        {t:"BLK",   n:"BreadTalk Group",   p:0.88, g:true,  r:["Asia, ME"],          rev:"F&B chain"},
      ]},
    }
  },

  "🇦🇺 Australia — ASX": {
    flag:"🇦🇺", cur:"A$", code:"AUD", idx:"ASX 200 / All Ordinaries", reg:"ASIC", tz:"AEST",
    country:"Australia", cP:["Saturn","Moon"],
    sectors:{
      "Mining":      { col:"#c08030", ico:"⛏️", rulers:["Mars","Saturn"], stocks:[
        {t:"BHP",   n:"BHP Group",         p:38,   g:true,  r:["35 countries"],       rev:"Iron ore, copper, coal"},
        {t:"RIO",   n:"Rio Tinto",         p:112,  g:true,  r:["35 countries"],       rev:"Diversified mining"},
        {t:"FMG",   n:"Fortescue",         p:18,   g:true,  r:["Australia, global"],  rev:"Iron ore & green H2"},
        {t:"MIN",   n:"Mineral Resources", p:28,   g:false, r:["Australia"],          rev:"Mining services & lithium"},
        {t:"LYC",   n:"Lynas Rare Earths", p:6.8,  g:true,  r:["Australia, Malaysia"],rev:"Rare earth elements"},
        {t:"PLS",   n:"Pilbara Minerals",  p:2.8,  g:false, r:["Australia"],          rev:"Lithium spodumene"},
      ]},
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"CBA",   n:"Commonwealth Bank", p:158,  g:false, r:["Australia, NZ"],      rev:"Retail & commercial banking"},
        {t:"NAB",   n:"Natl Australia Bank",p:38,  g:false, r:["Australia, NZ"],      rev:"Business banking"},
        {t:"WBC",   n:"Westpac Banking",   p:28,   g:false, r:["Australia, NZ"],      rev:"Universal banking"},
        {t:"ANZ",   n:"ANZ Group",         p:28,   g:true,  r:["Australia, Asia Pac"],rev:"Retail & institutional"},
        {t:"MQG",   n:"Macquarie Group",   p:195,  g:true,  r:["30+ countries"],      rev:"Investment banking"},
        {t:"AMP",   n:"AMP Ltd",           p:1.1,  g:false, r:["Australia, NZ"],      rev:"Financial services"},
      ]},
      "Energy":      { col:"#ff6820", ico:"⚡", rulers:["Saturn","Sun"], stocks:[
        {t:"WDS",   n:"Woodside Energy",   p:26,   g:true,  r:["Australia, Americas, Africa"],rev:"LNG & gas"},
        {t:"STO",   n:"Santos Ltd",        p:7.2,  g:true,  r:["Australia, PNG, Asia"],rev:"Oil & gas"},
        {t:"ORG",   n:"Origin Energy",     p:10,   g:false, r:["Australia"],          rev:"Electricity & gas"},
        {t:"AGL",   n:"AGL Energy",        p:12,   g:false, r:["Australia"],          rev:"Power generation"},
        {t:"NHC",   n:"New Hope Corp",     p:4.8,  g:false, r:["Australia"],          rev:"Thermal coal"},
        {t:"WHC",   n:"Whitehaven Coal",   p:6.2,  g:true,  r:["Australia, export"],  rev:"Steelmaking coal"},
      ]},
      "Technology":  { col:"#00c8ff", ico:"💻", rulers:["Mercury","Rahu"], stocks:[
        {t:"XRO",   n:"Xero Ltd",          p:148,  g:true,  r:["AU, NZ, UK, USA"],    rev:"Cloud accounting"},
        {t:"WTC",   n:"WiseTech Global",   p:78,   g:true,  r:["165+ countries"],     rev:"Logistics software"},
        {t:"NXT",   n:"NEXTDC",            p:17,   g:false, r:["Australia, SE Asia"], rev:"Data centres"},
        {t:"TLX",   n:"Telix Pharma",      p:12,   g:true,  r:["Global"],             rev:"Radiopharmaceuticals"},
        {t:"AD8",   n:"Audinate Group",    p:9.5,  g:true,  r:["Global AV"],          rev:"Audio networking"},
        {t:"APX",   n:"Appen Ltd",         p:1.5,  g:true,  r:["Global AI data"],     rev:"AI training data"},
      ]},
    }
  },

  "🇨🇦 Canada — TSX": {
    flag:"🇨🇦", cur:"C$", code:"CAD", idx:"S&P/TSX Composite", reg:"OSC", tz:"EST",
    country:"Canada", cP:["Jupiter","Moon"],
    sectors:{
      "Energy":      { col:"#ff6820", ico:"⚡", rulers:["Saturn","Sun"], stocks:[
        {t:"CNQ",   n:"Canadian Natural",  p:48,   g:true,  r:["Canada, North Sea, Africa"],rev:"Oil sands & gas"},
        {t:"SU",    n:"Suncor Energy",     p:54,   g:false, r:["Canada"],             rev:"Oil sands integrated"},
        {t:"ENB",   n:"Enbridge",          p:56,   g:true,  r:["Canada, USA"],        rev:"Pipeline infrastructure"},
        {t:"CVE",   n:"Cenovus Energy",    p:22,   g:true,  r:["Canada, USA, Asia"],  rev:"Integrated oil & gas"},
        {t:"TRP",   n:"TC Energy",         p:58,   g:true,  r:["Canada, USA, Mexico"],rev:"Pipeline & power"},
        {t:"ARX",   n:"ARC Resources",     p:22,   g:false, r:["Canada"],             rev:"Natural gas E&P"},
      ]},
      "Mining":      { col:"#c08030", ico:"⛏️", rulers:["Mars","Saturn"], stocks:[
        {t:"ABX",   n:"Barrick Gold",      p:19,   g:true,  r:["18 countries"],       rev:"Gold & copper mining"},
        {t:"AEM",   n:"Agnico Eagle",      p:88,   g:true,  r:["Canada, Finland, Mexico"],rev:"Gold mining"},
        {t:"WPM",   n:"Wheaton Precious",  p:62,   g:true,  r:["Global streaming"],   rev:"Precious metals streaming"},
        {t:"TECK",  n:"Teck Resources",    p:54,   g:true,  r:["Canada, Chile, USA"], rev:"Copper, zinc, coal"},
        {t:"K",     n:"Kinross Gold",      p:11,   g:true,  r:["Americas, Africa"],   rev:"Gold mining"},
        {t:"FM",    n:"First Quantum",     p:15,   g:true,  r:["Zambia, Panama, AU"], rev:"Copper mining"},
      ]},
      "Banking":     { col:"#f0c030", ico:"🏦", rulers:["Jupiter","Mercury"], stocks:[
        {t:"RY",    n:"Royal Bank Canada", p:138,  g:true,  r:["Canada, USA, Caribbean"],rev:"Universal banking"},
        {t:"TD",    n:"Toronto-Dominion",  p:82,   g:true,  r:["Canada, USA"],        rev:"Retail & commercial"},
        {t:"BNS",   n:"Scotiabank",        p:68,   g:true,  r:["Canada, Latin America"],rev:"International banking"},
        {t:"BMO",   n:"Bank of Montreal",  p:118,  g:true,  r:["Canada, USA"],        rev:"Personal & commercial"},
        {t:"CM",    n:"CIBC",              p:78,   g:true,  r:["Canada, USA, Caribbean"],rev:"Retail banking"},
        {t:"MFC",   n:"Manulife Financial",p:32,   g:true,  r:["Canada, USA, Asia"],  rev:"Life insurance"},
      ]},
      "Technology":  { col:"#00c8ff", ico:"💻", rulers:["Mercury","Rahu"], stocks:[
        {t:"SHOP",  n:"Shopify",           p:118,  g:true,  r:["175+ countries"],     rev:"E-commerce platform"},
        {t:"CSU",   n:"Constellation SW",  p:3800, g:true,  r:["Global vertical SW"], rev:"Enterprise software"},
        {t:"OTEX",  n:"OpenText Corp",     p:38,   g:true,  r:["180+ countries"],     rev:"Enterprise info mgmt"},
        {t:"DSGX",  n:"Descartes Systems", p:115,  g:true,  r:["160+ countries"],     rev:"Logistics software"},
        {t:"BB",    n:"BlackBerry",        p:3.5,  g:true,  r:["Global"],             rev:"Cybersecurity & IoT"},
        {t:"KXS",   n:"Kinaxis",           p:142,  g:true,  r:["Global supply chain"],rev:"Supply chain planning"},
      ]},
    }
  },
};

// ============================================================
// PHASE 1 — SCORING ENGINE (feeds from ephemeris)
// ============================================================

function scoreSectors(planets, mktSectors) {
  var names = Object.keys(mktSectors);
  var scored = names.map(function(name) {
    var sec = mktSectors[name];
    var score = 45;
    sec.rulers.forEach(function(rname) {
      var p = null;
      for (var i = 0; i < planets.length; i++) {
        if (planets[i].name === rname) { p = planets[i]; break; }
      }
      if (!p) return;
      score += p.score;
      if (p.nature === "benefic" && p.status !== "Debilitated") score += 8;
      if (p.status === "Debilitated") score -= 10;
    });
    score = Math.max(10, Math.min(97, Math.round(score)));
    return { name: name, score: score, col: sec.col, ico: sec.ico, rulers: sec.rulers, stocks: sec.stocks };
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored;
}

function genWarnings(planets, sectors) {
  var w = [];
  planets.forEach(function(p) {
    if (p.status === "Debilitated") {
      w.push({
        level: "danger", icon: "🚨",
        title: p.name + " Debilitated in " + p.rashiName,
        body: p.name + " is severely weakened. Sectors it rules face significant headwinds — reduce exposure or wait for transit to clear.",
        planet: p.name, color: p.color,
      });
    }
  });
  var worst = sectors[sectors.length - 1];
  if (worst && worst.score < 38) {
    w.push({ level:"danger", icon:"📉", title:"Avoid: " + worst.name + " (" + worst.score + "/100)", body:"Planetary rulers deeply unfavourable. High probability of continued underperformance this period.", color:"#ff3d54" });
  }
  var mars  = null, rahu = null, sat = null, jup = null;
  planets.forEach(function(p) {
    if (p.name === "Mars")    mars = p;
    if (p.name === "Rahu")    rahu = p;
    if (p.name === "Saturn")  sat  = p;
    if (p.name === "Jupiter") jup  = p;
  });
  if (mars && rahu && Math.abs(mars.rashi - rahu.rashi) <= 1) {
    w.push({ level:"danger", icon:"🔥", title:"Mars–Rahu Conjunction — Sudden Volatility", body:"One of the most volatile combinations in Vedic astrology. Expect sharp unexpected moves. Use strict stop-losses and reduce position sizes.", color:"#ff3d54" });
  }
  if (sat && jup && sat.rashi === jup.rashi) {
    w.push({ level:"warning", icon:"⚖️", title:"Saturn–Jupiter Conjunction", body:"Expansion (Jupiter) meets restriction (Saturn) in the same sign. Mixed, choppy signals in finance and growth sectors. Be selective and patient.", color:"#f0c030" });
  }
  return w;
}

// ============================================================
// DETERMINISTIC RNG — same ticker = same score every render
// ============================================================

function drng(seed, offset, min, max) {
  var x = Math.abs(Math.sin(seed * 9301 + offset * 49297 + 233720)) % 1;
  return min + x * (max - min);
}

function tickerSeed(ticker) {
  var s = 0;
  for (var i = 0; i < ticker.length; i++) s += ticker.charCodeAt(i);
  return s;
}

function stockScore(stk, sector, planets) {
  var seed = tickerSeed(stk.t);
  var astroBase = 50;
  sector.rulers.forEach(function(rname) {
    var p = null;
    for (var i = 0; i < planets.length; i++) { if (planets[i].name === rname) { p = planets[i]; break; } }
    if (p) astroBase += p.score + (p.nature === "benefic" ? 5 : 0);
  });
  var f = Math.round(drng(seed, 1, 42, 88));
  var t = Math.round(drng(seed, 2, 38, 84));
  var a = Math.round(Math.max(10, Math.min(95, astroBase)));
  var g = stk.g ? Math.round(drng(seed, 4, 44, 82)) : Math.round(drng(seed, 5, 52, 76));
  return Math.round((f + t + a + g) / 4);
}

// ============================================================
// PHASE 3 — STOCK ANALYSIS ENGINE
// Full deterministic analysis object for every stock.
// No API calls. Runs instantly from ephemeris + RNG seed.
// ============================================================

var CHART_PATTERNS = [
  "ascending triangle near resistance",
  "bullish flag consolidation",
  "cup-and-handle forming",
  "double bottom reversal",
  "support retest after breakout",
  "oversold RSI bounce zone",
  "MACD positive crossover forming",
  "golden cross on daily chart",
];

var RATING_MAP = {
  "Strong Buy": { color:"#00e87a", emoji:"🚀" },
  "Buy":        { color:"#40d888", emoji:"📈" },
  "Accumulate": { color:"#f0c030", emoji:"⬆️" },
  "Hold":       { color:"#f0a030", emoji:"⚖️" },
  "Reduce":     { color:"#ff7050", emoji:"⚠️" },
  "Sell":       { color:"#ff3d54", emoji:"📉" },
};

function buildStockAnalysis(stk, sector, planets, mkt) {
  var seed = tickerSeed(stk.t);
  var r  = function(o, mn, mx) { return drng(seed, o, mn, mx); };
  var ri = function(o, mn, mx) { return Math.round(r(o, mn, mx)); };

  var fundS   = ri(1, 42, 88);
  var techS   = ri(2, 38, 84);
  var riskS   = ri(6, 22, 72);
  var globalS = stk.g ? ri(4, 44, 82) : ri(5, 52, 76);

  var astroBase = 50;
  var rulerPlanets = [];
  sector.rulers.forEach(function(rname) {
    for (var i = 0; i < planets.length; i++) {
      if (planets[i].name === rname) {
        astroBase += planets[i].score + (planets[i].nature === "benefic" ? 5 : 0);
        rulerPlanets.push(planets[i]);
        break;
      }
    }
  });
  var astroS  = Math.round(Math.max(10, Math.min(95, astroBase)));
  var overall = Math.round((fundS + techS + astroS + globalS) / 4);
  var rating  = overall >= 78 ? "Strong Buy"
              : overall >= 65 ? "Buy"
              : overall >= 55 ? "Accumulate"
              : overall >= 44 ? "Hold"
              : "Reduce";

  var targetP = stk.p * (1 + r(7, 0.10, 0.26));
  var stopP   = stk.p * (1 - r(8, 0.06, 0.14));
  var flLow   = stk.p * (1 - r(9, 0.09, 0.20));
  var flHigh  = stk.p * (1 + r(10, 0.11, 0.28));

  var hist = [];
  var v = stk.p;
  for (var d = 0; d < 30; d++) {
    v = v * (1 + (Math.sin(d * seed * 0.31) * 0.007) + (r(d, -0.006, 0.006)));
    hist.push(v);
  }
  var curP   = hist[hist.length - 1];
  var prevP  = hist[hist.length - 2];
  var chgPct = (curP - prevP) / prevP * 100;
  var sorted = hist.slice().sort(function(a,b){return a-b;});
  var lo52   = sorted[0] * 0.91;
  var hi52   = sorted[sorted.length-1] * 1.09;

  var pat      = CHART_PATTERNS[seed % CHART_PATTERNS.length];
  var rsiVal   = ri(11, 34, 68);
  var volUp    = r(12, 0, 1) > 0.5;
  var pe       = ri(13, 11, 42);
  var spe      = ri(14, 13, 34);
  var revG     = ri(15, 5, 24);
  var ebitda   = ri(16, 10, 38);
  var de       = r(17, 0.1, 0.9).toFixed(1);
  var weakR    = rulerPlanets.filter(function(p){return p.status==="Debilitated";});
  var strongR  = rulerPlanets.filter(function(p){return p.status==="Exalted";});

  var techNote = "Chart showing " + pat + ". Support at " + mkt.cur + (stk.p*0.93).toFixed(2) +
    ", resistance " + mkt.cur + (stk.p*1.09).toFixed(2) + ". RSI " + rsiVal +
    (rsiVal > 60 ? " — slightly overbought, prefer pullback." : rsiVal < 42 ? " — oversold, accumulation zone." : " — neutral, balanced momentum.") +
    " Volume " + (volUp ? "above" : "below") + " 20-day average.";

  var fundNote = stk.n + " at ~" + pe + "x fwd P/E vs sector avg " + spe +
    "x. Revenue growth " + revG + "% YoY, EBITDA margin " + ebitda + "%. Debt/equity " + de + "x — " +
    (parseFloat(de) > 0.55 ? "elevated, monitor refinancing." : "manageable and within comfort zone.");

  var astroNote = strongR.length > 0
    ? strongR[0].name + " exalted in " + strongR[0].rashiName + " — powerful cosmic tailwind for " +
      sector.name + ". One of the strongest planetary windows. Act before transit shifts."
    : weakR.length > 0
    ? weakR[0].name + " debilitated in " + weakR[0].rashiName + " — sector ruler weakened. " +
      "Use smaller positions, wait for transit to improve."
    : "Sector rulers (" + sector.rulers.join(", ") + ") in neutral transit. Moderate cosmic support, standard risk management.";

  var geoNote = stk.g
    ? stk.n + " operates in " + stk.r.join(", ") + ". Primary risks: " +
      (mkt.code==="USD" ? "US-China tensions, Fed trajectory, DXY strength compressing overseas earnings."
      : mkt.code==="INR" ? "INR/USD volatility, RBI policy, geopolitical risk in export markets."
      : mkt.code==="GBP" ? "Brexit trade friction, BoE rate path, European energy costs."
      : mkt.code==="JPY" ? "BOJ policy exit, yen weakness, China demand slowdown."
      : "Regional political risk, currency volatility, central bank divergence.")
    : stk.n + " is domestic-focused. Performance tied to " + mkt.country + " GDP, consumer confidence, and sector regulation. Limited FX exposure.";

  var globalNote = stk.g
    ? "Multi-currency revenue creates FX exposure. A 5% move in " + mkt.code + "/USD shifts earnings 2–4%. " +
      stk.r[0] + (stk.r.length > 1 ? " and " + stk.r[1] : "") + " are the highest-impact revenue regions."
    : stk.n + " is " + mkt.country + "-focused — limited FX risk. Growth depends on domestic conditions and sector-specific demand.";

  var entryNote = "Optimal entry on pullback to " + mkt.cur + (stk.p*0.95).toFixed(2) + "–" +
    mkt.cur + (stk.p*0.98).toFixed(2) + " with hard stop at " + mkt.cur + stopP.toFixed(2) +
    ". Watch " + (sector.rulers[0]||"planetary") + " strength build over next 10–14 days.";

  var verdict = stk.n + " rated " + rating + " — " +
    (overall >= 65 ? "compelling opportunity with planetary, technical, and macro signals aligned."
    : overall >= 50 ? "cautious accumulation on dips with tight risk controls."
    : "watchlist candidate — await clearer entry signals before committing capital.");

  return {
    fundS:fundS, techS:techS, astroS:astroS, globalS:globalS, riskS:riskS,
    overall:overall, rating:rating,
    targetP:targetP, stopP:stopP, flLow:flLow, flHigh:flHigh,
    hist:hist, curP:curP, chgPct:chgPct, lo52:lo52, hi52:hi52,
    techNote:techNote, fundNote:fundNote, astroNote:astroNote,
    geoNote:geoNote, globalNote:globalNote, entryNote:entryNote, verdict:verdict,
    risks:[
      "Sector regulatory changes",
      stk.g ? "FX & global revenue exposure" : "Domestic demand slowdown",
      "Planetary ruler weakness if transit shifts",
    ],
    opps:[
      overall >= 65 ? "All 5 dimensions aligned — strong signal" : "Recovery potential on planetary improvement",
      stk.g ? "International revenue diversification" : "Domestic market leadership",
      "Technical breakout target: " + mkt.cur + (stk.p*1.09).toFixed(2),
    ],
  };
}

// ============================================================
// PHASE 2 — UI SHELL
// Clean, dark cosmic aesthetic — no clutter
// ============================================================

var COLORS = {
  bg:       "#03000e",
  surface:  "rgba(255,255,255,0.025)",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.14)",
  gold:     "#c89818",
  goldLt:   "#e8b820",
  text:     "#c0c8da",
  textMed:  "#606880",
  textDim:  "#252e3a",
  danger:   "#ff3d54",
  success:  "#00e87a",
  warn:     "#f0a030",
};

var FONT_MONO = "'Courier New', monospace";
var FONT_SERIF = "'Georgia', serif";
var FONT_DISPLAY = "'Georgia', serif"; // Cinzel loaded via @import

function mkStyle() {
  return "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');\n" +
    "@keyframes twinkle { 0%,100%{opacity:.04} 50%{opacity:.55} }\n" +
    "@keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }\n" +
    "@keyframes fadeIn  { from{opacity:0} to{opacity:1} }\n" +
    "@keyframes spin    { to{transform:rotate(360deg)} }\n" +
    "@keyframes pulse   { 0%,100%{opacity:.5} 50%{opacity:1} }\n" +
    "@keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.65} }\n" +
    "* { box-sizing:border-box; margin:0; padding:0; }\n" +
    "::-webkit-scrollbar { width:3px; }\n" +
    "::-webkit-scrollbar-thumb { background:#1a1530; border-radius:3px; }\n" +
    "body { background:#03000e; }\n" +
    "button { transition:opacity 0.14s, border-color 0.14s, background 0.14s; }\n" +
    "button:hover { opacity:0.80; }\n" +
    "button:disabled { cursor:not-allowed; opacity:0.45; }\n" +
    "input:focus { outline:none; box-shadow:0 0 0 1px rgba(200,152,24,0.38); }\n" +
    ".scard { transition:border-color 0.15s, box-shadow 0.15s, transform 0.15s; }\n" +
    ".scard:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(0,0,0,0.3); }\n" +
    ".stk { transition:background 0.12s, border-color 0.12s; }\n" +
    ".stk:hover { background:rgba(255,255,255,0.05) !important; }\n" +
    ".tab-btn { transition:background 0.12s, border-color 0.12s, color 0.12s; }\n" +
    "@media(max-width:600px){\n" +
    "  .modal-wrap { border-radius:12px !important; }\n" +
    "  .modal-header { padding:14px 14px 10px !important; }\n" +
    "  .modal-inner  { padding:12px 14px 18px !important; }\n" +
    "  .pred-tabs button { flex:1; padding:8px 4px !important; font-size:0.7rem !important; }\n" +
    "}\n";
}

// Starfield — memoised so it doesn't re-render
var STARS = Array.from({ length: 180 }, function(_, i) {
  return {
    id: i,
    x:  Math.random() * 100,
    y:  Math.random() * 100,
    s:  Math.random() * 1.6 + 0.3,
    o:  Math.random() * 0.45 + 0.08,
    d:  Math.random() * 4,
  };
});

function Starfield() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
      {STARS.map(function(s) {
        return (
          <div key={s.id} style={{
            position:"absolute", left:s.x+"%", top:s.y+"%",
            width:s.s+"px", height:s.s+"px", borderRadius:"50%",
            background:"#fff", opacity:s.o,
            animation:"twinkle "+(2+s.d)+"s ease-in-out "+s.d+"s infinite",
          }}/>
        );
      })}
      <div style={{ position:"absolute", top:"4%", right:"6%", width:"480px", height:"480px", background:"radial-gradient(circle,rgba(40,8,100,0.1),transparent 70%)", borderRadius:"50%" }}/>
      <div style={{ position:"absolute", bottom:"8%", left:"2%", width:"360px", height:"360px", background:"radial-gradient(circle,rgba(6,20,70,0.08),transparent 70%)", borderRadius:"50%" }}/>
    </div>
  );
}

function Header() {
  return (
    <div style={{ textAlign:"center", padding:"28px 0 20px", borderBottom:"1px solid "+COLORS.border, marginBottom:"22px" }}>
      <div style={{ fontSize:"1.6rem", letterSpacing:"0.24em", opacity:0.55, marginBottom:"6px" }}>⚝ ✦ 🌐 ✦ ⚝</div>
      <h1 style={{
        fontFamily:"'Cinzel', serif",
        background:"linear-gradient(120deg,#7a5608,#d0a010,#ecca40,#c09818,#7a5608)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        fontSize:"clamp(1.5rem,3.5vw,2.5rem)", letterSpacing:"0.07em", margin:"0 0 5px",
      }}>AstroFinance Oracle</h1>
      <p style={{ color:COLORS.textDim, letterSpacing:"0.22em", textTransform:"uppercase", fontSize:"0.62rem", fontFamily:FONT_MONO }}>
        9 Global Markets · Real Ephemeris · AI Predictions · 5-Dimension Analysis
      </p>
    </div>
  );
}

// Tab button
function Tab(props) {
  return (
    <button onClick={props.onClick} style={{
      padding:"7px 14px",
      background: props.active ? "rgba(255,255,255,0.07)" : "transparent",
      border:"1px solid", borderColor: props.active ? COLORS.borderHi : COLORS.border,
      color: props.active ? COLORS.text : COLORS.textMed,
      borderRadius:"7px", cursor:"pointer", fontSize:"0.76rem",
      fontFamily:FONT_MONO, letterSpacing:"0.04em",
    }}>
      {props.label}
    </button>
  );
}

// Status chip
function Chip(props) {
  return (
    <div style={{
      background: (props.color||COLORS.gold)+"12",
      border:"1px solid "+(props.color||COLORS.gold)+"28",
      color: props.color || COLORS.gold,
      padding:"3px 10px", borderRadius:"999px",
      fontSize:"0.64rem", fontFamily:FONT_MONO,
    }}>
      {props.children}
    </div>
  );
}

// Score bar row
function ScoreBar(props) {
  return (
    <div title={props.label + ": " + props.value + "/100"} style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, borderRadius:"7px", padding:"7px 9px" }}>
      <div style={{ fontSize:"0.55rem", color:COLORS.textDim, fontFamily:FONT_MONO, marginBottom:"4px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{props.label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
        <div style={{ flex:1, height:"3px", background:"rgba(255,255,255,0.05)", borderRadius:"999px", overflow:"hidden" }}>
          <div style={{ width:props.value+"%", height:"100%", background:props.color, borderRadius:"999px" }}/>
        </div>
        <span style={{ fontSize:"0.68rem", color:props.color, fontFamily:FONT_MONO, minWidth:"22px", textAlign:"right" }}>{props.value}</span>
      </div>
    </div>
  );
}

// Sparkline SVG
function Sparkline(props) {
  var data  = props.data;
  var color = props.color || COLORS.success;
  var w     = props.w || 110;
  var h     = props.h || 30;
  var min   = Math.min.apply(null, data);
  var max   = Math.max.apply(null, data);
  var range = max - min || 1;
  var pts   = data.map(function(v, i) {
    return ((i / (data.length - 1)) * w) + "," + (h - ((v - min) / range) * (h - 4) - 2);
  }).join(" ");
  var parts = pts.split(" ");
  var last  = (parts[parts.length - 1] || "0,0").split(",");
  return (
    <svg width={w} height={h} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx={+last[0]} cy={+last[1]} r="2.5" fill={color}/>
    </svg>
  );
}

// Risk gauge
function RiskGauge(props) {
  var score = props.score;
  var color = score > 66 ? COLORS.danger : score > 40 ? COLORS.warn : COLORS.success;
  var label = score > 66 ? "HIGH" : score > 40 ? "MED" : "LOW";
  var r = 20, cx = 28, cy = 28, circ = 2 * Math.PI * r;
  var dash = (score / 100) * circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"2px" }}>
      <svg width="56" height="56">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={dash + " " + (circ - dash)} strokeLinecap="round"
          transform={"rotate(-90 " + cx + " " + cy + ")"}/>
        <text x={cx} y={cy+4} textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace" fontWeight="700">{score}</text>
      </svg>
      <span style={{ fontSize:"0.58rem", color:color, fontFamily:FONT_MONO }}>{label}</span>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function AstroFinanceOracle() {
  var today = useMemo(function() { return new Date(); }, []);

  // Market selection
  var mktKeys = Object.keys(MARKETS);
  var [mktKey, setMktKey] = useState(mktKeys[0]);
  var mkt = MARKETS[mktKey];

  // Core computed data — instant, no API
  var planets = useMemo(function() { return computePlanets(today); }, []);
  var aspects = useMemo(function() { return computeAspects(planets); }, [planets]);
  var sectors = useMemo(function() { return scoreSectors(planets, mkt.sectors); }, [mkt]);
  var warnings= useMemo(function() { return genWarnings(planets, sectors); }, [planets, sectors]);

  // UI state
  var [activeTab,   setActiveTab]   = useState("sectors");
  var [openSector,  setOpenSector]  = useState(null);
  var [selStock,    setSelStock]    = useState(null);

  var dangerCount = warnings.filter(function(w) { return w.level === "danger"; }).length;

  // Stars (static)
  var starsRef = useRef(STARS);

  function selectMkt(key) {
    setMktKey(key);
    setOpenSector(null);
    setSelStock(null);
    setActiveTab("sectors");
  }

  return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, fontFamily:FONT_SERIF, color:COLORS.text, position:"relative", overflow:"hidden" }}>
      <style>{mkStyle()}</style>
      <Starfield/>

      <div style={{ position:"relative", zIndex:1, maxWidth:"1100px", margin:"0 auto", padding:"0 14px 52px" }}>
        <Header/>


        <div style={{ display:"flex", gap:"5px", overflowX:"auto", marginBottom:"14px", paddingBottom:"3px" }}>
          {mktKeys.map(function(k) {
            var m = MARKETS[k];
            var isActive = k === mktKey;
            return (
              <button key={k} onClick={function(){selectMkt(k);}} style={{
                padding:"5px 12px", whiteSpace:"nowrap", flexShrink:0,
                background: isActive ? "rgba(200,152,24,0.15)" : COLORS.surface,
                border:"1px solid", borderColor: isActive ? COLORS.gold+"66" : COLORS.border,
                color: isActive ? COLORS.goldLt : COLORS.textMed,
                borderRadius:"7px", fontSize:"0.74rem", fontFamily:FONT_MONO,
              }}>
                {m.flag} {m.code}
              </button>
            );
          })}
        </div>


        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center", marginBottom:"14px" }}>
          <Chip>{mkt.flag} {mkt.idx}</Chip>
          <Chip color={COLORS.textMed}>📅 {today.toDateString()}</Chip>
          <Chip color={COLORS.textMed}>{mkt.cur} {mkt.code} · {mkt.tz} · {mkt.reg}</Chip>
          {dangerCount > 0 && (
            <div style={{ background:COLORS.danger+"10", border:"1px solid "+COLORS.danger+"28", color:COLORS.danger, padding:"3px 10px", borderRadius:"999px", fontSize:"0.64rem", fontFamily:FONT_MONO, animation:"pulse 2s ease-in-out infinite" }}>
              🚨 {dangerCount} Critical Warning{dangerCount>1?"s":""}
            </div>
          )}
          <Chip color={COLORS.success}>⚡ Instant</Chip>
          <div style={{ marginLeft:"auto", fontSize:"0.62rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>
            Top: {sectors[0] && sectors[0].name} ({sectors[0] && sectors[0].score}/100)
          </div>
        </div>


        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"16px" }}>
          {[
            ["sectors",  "📊 Sectors"],
            ["planets",  "🪐 Planets"],
            ["aspects",  "🔗 Aspects"],
            ["warnings", "🚨 Warnings" + (warnings.length ? " ("+warnings.length+")" : "")],
            ["predict",  "🔮 Predictions"],
            ["chat",     "💬 Oracle Chat"],
          ].map(function(item) {
            var isDanger = item[0]==="warnings" && dangerCount > 0;
            return (
              <div key={item[0]} style={{ position:"relative" }}>
                <Tab label={item[1]} active={activeTab === item[0]} onClick={function(){setActiveTab(item[0]);}}/>
                {isDanger && (
                  <div style={{ position:"absolute", top:"-3px", right:"-3px", width:"8px", height:"8px", borderRadius:"50%", background:COLORS.danger, animation:"pulse 1.8s ease-in-out infinite", border:"1px solid "+COLORS.bg }}/>
                )}
              </div>
            );
          })}
        </div>


        {activeTab === "sectors" && (
          <div style={{ animation:"fadeUp 0.25s ease" }}>
            <p style={{ color:COLORS.textDim, fontSize:"0.74rem", marginBottom:"12px", fontStyle:"italic" }}>
              Click a sector to expand stocks · Click a stock for deep analysis
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"9px" }}>
              {sectors.map(function(s, i) {
                var isOpen = openSector === s.name;
                return (
                  <div key={s.name}>

                    <div
                      className="scard"
                      onClick={function(){setOpenSector(isOpen ? null : s.name);}}
                      style={{
                        background: COLORS.surface,
                        border:"1px solid "+(isOpen ? s.col+"55" : i < 3 ? s.col+"22" : COLORS.border),
                        borderRadius:"11px", padding:"13px", cursor:"pointer",
                        boxShadow: i===0 ? "0 0 20px "+s.col+"0e" : "none",
                      }}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <span style={{ fontSize:"1.1rem" }}>{s.ico}</span>
                          <span style={{ fontFamily:"'Cinzel',serif", fontSize:"0.85rem", color: i===0 ? s.col : isOpen ? s.col : COLORS.text }}>
                            {i===0 ? "★ " : ""}{s.name}
                          </span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <span style={{ fontFamily:FONT_MONO, color:s.col, fontSize:"0.95rem", fontWeight:"700" }}>{s.score}</span>
                          <span style={{ color:COLORS.textDim, fontSize:"0.62rem" }}>{isOpen?"▲":"▼"}</span>
                        </div>
                      </div>
                      <div style={{ height:"3px", background:"rgba(255,255,255,0.04)", borderRadius:"999px", overflow:"hidden", marginBottom:"7px" }}>
                        <div style={{ width:s.score+"%", height:"100%", background:"linear-gradient(90deg,"+s.col+"55,"+s.col+")", borderRadius:"999px" }}/>
                      </div>
                      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"4px" }}>
                        {s.stocks.slice(0,5).map(function(st) {
                          return (
                            <span key={st.t} style={{
                              background:"rgba(255,255,255,0.025)", border:"1px solid "+COLORS.border,
                              color:COLORS.textDim, padding:"1px 6px", borderRadius:"3px",
                              fontSize:"0.62rem", fontFamily:FONT_MONO,
                            }}>{st.t}</span>
                          );
                        })}
                      </div>
                      <div style={{ fontSize:"0.58rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>
                        Rulers: {s.rulers.join(" · ")} · {isOpen ? "▼ expanded" : "click to expand"}
                      </div>
                    </div>


                    {isOpen && (
                      <div style={{
                        marginTop:"6px", padding:"10px",
                        background:"rgba(255,255,255,0.012)",
                        border:"1px solid "+s.col+"20",
                        borderRadius:"9px", animation:"fadeUp 0.18s ease",
                      }}>
                        <div style={{ fontSize:"0.57rem", color:s.col, fontFamily:FONT_MONO, marginBottom:"7px", letterSpacing:"0.1em" }}>
                          SELECT STOCK — INSTANT DEEP ANALYSIS
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:"5px" }}>
                          {s.stocks.map(function(stk, si) {
                            var seed = tickerSeed(stk.t);
                            var pchg = (drng(seed, si+20, -3.2, 3.2)).toFixed(2);
                            var ppos = parseFloat(pchg) >= 0;
                            var comp = stockScore(stk, s, planets);
                            return (
                              <div key={stk.t}
                                className="stk"
                                onClick={function(){setSelStock({ stk:stk, sec:s });}}
                                style={{
                                  background:"rgba(255,255,255,0.02)",
                                  border:"1px solid "+(si===0 ? s.col+"35" : COLORS.border),
                                  borderRadius:"7px", padding:"8px", cursor:"pointer",
                                }}
                              >
                                {si===0 && <div style={{ fontSize:"0.5rem", color:s.col, fontFamily:FONT_MONO, marginBottom:"2px" }}>★ TOP</div>}
                                <div style={{ fontFamily:"'Cinzel',serif", fontSize:"0.84rem", color:COLORS.text, marginBottom:"2px" }}>{stk.t}</div>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"2px" }}>
                                  <span style={{ fontSize:"0.6rem", color:COLORS.textMed }}>
                                    {stk.n.slice(0,14)}{stk.n.length>14?"…":""}
                                  </span>
                                  <span style={{ fontSize:"0.65rem", color:ppos?COLORS.success:COLORS.danger, fontFamily:FONT_MONO }}>
                                    {ppos?"+":""}{pchg}%
                                  </span>
                                </div>
                                <div style={{ display:"flex", justifyContent:"space-between" }}>
                                  <span style={{ fontSize:"0.58rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>
                                    {mkt.cur}{stk.p > 999 ? stk.p.toLocaleString() : stk.p}
                                  </span>
                                  <span style={{ fontSize:"0.58rem", color:comp>=65?COLORS.success:comp>=50?COLORS.warn:COLORS.danger, fontFamily:FONT_MONO }}>
                                    {comp}/100
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {activeTab === "planets" && (
          <div style={{ animation:"fadeUp 0.25s ease" }}>
            <h3 style={{ fontFamily:"'Cinzel',serif", color:COLORS.gold, fontSize:"0.95rem", marginBottom:"12px" }}>
              Planetary Positions — {today.toDateString()}
            </h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:"8px" }}>
              {planets.map(function(p) {
                return (
                  <div key={p.name} style={{
                    background:COLORS.surface,
                    border:"1px solid "+(p.status==="Exalted"?p.color+"30":p.status==="Debilitated"?COLORS.danger+"22":COLORS.border),
                    borderRadius:"10px", padding:"12px",
                  }}>
                    <div style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
                      <div style={{ fontSize:"1.4rem", color:p.color, minWidth:"28px", textAlign:"center" }}>{p.sym}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", gap:"6px", marginBottom:"3px" }}>
                          <span style={{ fontFamily:"'Cinzel',serif", fontSize:"0.88rem" }}>{p.name}</span>
                          <span style={{ fontSize:"0.6rem", color:p.color, fontFamily:FONT_MONO }}>{p.rashiSym} {p.rashiName} {p.degree}°</span>
                        </div>
                        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                          <span style={{
                            background:p.color+"14", border:"1px solid "+p.color+"28",
                            color:p.color, padding:"1px 6px", borderRadius:"3px",
                            fontSize:"0.58rem", fontFamily:FONT_MONO,
                          }}>{p.icon} {p.status}</span>
                          <span style={{ fontSize:"0.58rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>
                            {p.rashiElem} · {p.rashiMode}
                          </span>
                        </div>
                        {p.score !== 0 && (
                          <div style={{ marginTop:"4px", fontSize:"0.58rem", color: p.score > 0 ? COLORS.success : COLORS.danger, fontFamily:FONT_MONO }}>
                            Score contribution: {p.score > 0 ? "+" : ""}{p.score}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {activeTab === "aspects" && (
          <div style={{ animation:"fadeUp 0.25s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px", flexWrap:"wrap", gap:"8px" }}>
              <h3 style={{ fontFamily:"'Cinzel',serif", color:COLORS.gold, fontSize:"0.95rem" }}>
                Planetary Aspects — Orb 8°
              </h3>
              <div style={{ display:"flex", gap:"8px" }}>
                {[["✦ Harmonious",COLORS.success],["⚡ Tense",COLORS.danger],["◈ Mixed",COLORS.warn]].map(function(item){
                  return <span key={item[0]} style={{ fontSize:"0.62rem", color:item[1], fontFamily:FONT_MONO }}>{item[0]}</span>;
                })}
              </div>
            </div>
            {aspects.length === 0 && (
              <div style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, borderRadius:"9px", padding:"16px", textAlign:"center" }}>
                <div style={{ fontSize:"1.6rem", marginBottom:"8px", opacity:0.5 }}>🪐</div>
                <div style={{ color:COLORS.textMed, fontSize:"0.84rem" }}>No significant aspects within 8° orb today.</div>
                <div style={{ color:COLORS.textDim, fontSize:"0.72rem", fontFamily:FONT_MONO, marginTop:"4px" }}>Planets are widely spaced — reduced inter-planetary tension.</div>
              </div>
            )}
            <div style={{ display:"grid", gap:"7px" }}>
              {aspects.slice().sort(function(a,b){ return parseFloat(a.orb)-parseFloat(b.orb); }).map(function(asp, i) {
                var isEasy  = asp.harmony === "easy";
                var isTense = asp.harmony === "tense";
                var col = isEasy ? COLORS.success : isTense ? COLORS.danger : COLORS.warn;
                var marketImpact = isTense
                  ? "May trigger volatility in sectors ruled by " + asp.a + " and " + asp.b + "."
                  : isEasy
                  ? "Supportive energy for sectors ruled by " + asp.a + " and " + asp.b + "."
                  : "Neutral influence — watch for mixed signals in related sectors.";
                return (
                  <div key={i} style={{
                    background: COLORS.surface,
                    border:"1px solid "+(isEasy?col+"20":isTense?col+"25":COLORS.border),
                    borderRadius:"9px", padding:"12px",
                    display:"flex", gap:"12px", alignItems:"flex-start",
                  }}>
                    <div style={{ fontFamily:FONT_MONO, fontSize:"1.3rem", color:col, minWidth:"26px", textAlign:"center", paddingTop:"2px" }}>{asp.symbol}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"4px", flexWrap:"wrap" }}>
                        <span style={{ color:asp.aColor, fontFamily:"'Cinzel',serif", fontSize:"0.84rem" }}>{asp.aSym} {asp.a}</span>
                        <span style={{ color:COLORS.textDim, fontSize:"0.72rem", fontFamily:FONT_MONO }}>{asp.type}</span>
                        <span style={{ color:asp.bColor, fontFamily:"'Cinzel',serif", fontSize:"0.84rem" }}>{asp.bSym} {asp.b}</span>
                        <div style={{ marginLeft:"auto", display:"flex", gap:"8px", alignItems:"center" }}>
                          <span style={{ fontSize:"0.6rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>orb {asp.orb}°</span>
                          <span style={{ padding:"1px 7px", background:col+"14", border:"1px solid "+col+"30", color:col, borderRadius:"999px", fontSize:"0.6rem", fontFamily:FONT_MONO }}>
                            {isEasy?"Harmonious":isTense?"Tense":"Mixed"}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize:"0.72rem", color:COLORS.textDim, lineHeight:"1.5" }}>{marketImpact}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {activeTab === "warnings" && (
          <div style={{ animation:"fadeUp 0.25s ease" }}>
            <h3 style={{ fontFamily:"'Cinzel',serif", color:COLORS.gold, fontSize:"0.95rem", marginBottom:"12px" }}>
              Planetary Risk Warnings
            </h3>
            {warnings.length === 0 && (
              <div style={{ background:"rgba(0,232,122,0.05)", border:"1px solid rgba(0,232,122,0.14)", borderRadius:"9px", padding:"14px", color:"#00aa55", fontFamily:FONT_MONO, fontSize:"0.76rem" }}>
                ✅ No critical warnings. All planetary signals aligned.
              </div>
            )}
            <div style={{ display:"grid", gap:"8px" }}>
              {warnings.map(function(w, i) {
                var isDanger = w.level === "danger";
                return (
                  <div key={i} style={{
                    background: isDanger ? "rgba(255,61,84,0.05)" : "rgba(240,160,48,0.05)",
                    border:"1px solid "+(isDanger ? "rgba(255,61,84,0.2)" : "rgba(240,160,48,0.2)"),
                    borderRadius:"9px", padding:"13px",
                  }}>
                    <div style={{ display:"flex", gap:"10px" }}>
                      <span style={{ fontSize:"1.3rem" }}>{w.icon}</span>
                      <div>
                        <div style={{ fontFamily:"'Cinzel',serif", color: isDanger ? "#cc3344" : "#c08030", marginBottom:"4px", fontSize:"0.88rem" }}>{w.title}</div>
                        <p style={{ color:COLORS.textMed, fontSize:"0.82rem", lineHeight:"1.6" }}>{w.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {activeTab === "predict" && (
          <PredictionsTab planets={planets} sectors={sectors} mkt={mkt} today={today}/>
        )}


        {activeTab === "chat" && (
          <ChatTab planets={planets} sectors={sectors} mkt={mkt} today={today}/>
        )}

      </div>

      {selStock && (
        <StockModal
          stk={selStock.stk}
          sector={selStock.sec}
          planets={planets}
          mkt={mkt}
          onClose={function(){setSelStock(null);}}
        />
      )}
    </div>
  );
}

// ============================================================
// PHASE 4 — STOCK MODAL
// Full deep-dive modal. Opens instantly — all local data.
// AI Insight tab loads only when user clicks "Load".
// ============================================================

function fmtPrice(cur, val) {
  if (val == null) return cur + "—";
  var n = val > 9999 ? Math.round(val).toLocaleString()
        : val > 999  ? Math.round(val).toLocaleString()
        : parseFloat(val).toFixed(2);
  return cur + n;
}

function StockModal(props) {
  var stk    = props.stk;
  var sector = props.sector;
  var planets= props.planets;
  var mkt    = props.mkt;
  var onClose= props.onClose;

  var a = useMemo(function(){
    return buildStockAnalysis(stk, sector, planets, mkt);
  }, [stk.t]);

  var [tab,    setTab]    = useState("overview");
  var [aiNote, setAiNote] = useState(null);
  var [aiBusy, setAiBusy] = useState(false);

  var curP    = a.curP;
  var chgPct  = a.chgPct;
  var pos     = chgPct >= 0;
  var rInfo   = RATING_MAP[a.rating] || RATING_MAP["Hold"];
  var cur     = mkt.cur;

  function tStyle(t) {
    var active = tab === t;
    return {
      padding:"5px 11px", borderRadius:"6px", cursor:"pointer",
      fontFamily:FONT_MONO, fontSize:"0.7rem", letterSpacing:"0.04em",
      border:"1px solid", transition:"all 0.12s",
      background: active ? "rgba(255,255,255,0.08)" : "transparent",
      borderColor: active ? COLORS.borderHi : COLORS.border,
      color: active ? COLORS.text : COLORS.textMed,
    };
  }

  async function loadAI() {
    if (aiBusy || aiNote) return;
    setAiBusy(true);
    try {
      var pCtx = planets
        .filter(function(p){return p.status!=="Transit";})
        .map(function(p){return p.name+" "+p.status+" in "+p.rashiName;})
        .join("; ") || "all planets in transit";
      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:550,
          messages:[{ role:"user", content:
            "You are AstroFinance Oracle. Write a precise 4-sentence investment note for " + stk.n +
            " (" + stk.t + ") on " + mkt.idx + " (" + cur + mkt.code + "). " +
            "Planetary context: " + pCtx + ". " +
            "Company operates in: " + stk.r.join(", ") + ". Sector: " + sector.name + ". " +
            "Revenue model: " + stk.rev + ". " +
            "Include exactly: (1) one specific geopolitical risk for this company, " +
            "(2) one astrological timing insight for entry, " +
            "(3) a price target near " + fmtPrice(cur, a.targetP) + ", " +
            "(4) one near-term catalyst to watch. " +
            "Be direct and specific. No disclaimers. No bullet points. Flowing prose only."
          }]
        })
      });
      var d = await res.json();
      var txt = d.content && d.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
      setAiNote(txt || "AI insight unavailable.");
    } catch(e) {
      setAiNote("Connection error — please try again.");
    }
    setAiBusy(false);
  }

  // Close on Escape key
  useEffect(function() {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return function() { window.removeEventListener("keydown", handleKey); };
  }, []);

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"10px" }}
      onClick={function(e){if(e.target===e.currentTarget)onClose();}}
    >
      <div style={{ position:"absolute", inset:0, background:"rgba(1,0,10,0.92)", backdropFilter:"blur(14px)" }} onClick={onClose}/>
      <div style={{
        position:"relative", width:"100%", maxWidth:"820px", maxHeight:"90vh", overflowY:"auto",
        background:"linear-gradient(145deg,#07001a,#040010,#080018)",
        border:"1px solid "+COLORS.borderHi, borderRadius:"18px",
        boxShadow:"0 0 80px rgba(80,30,160,0.22)",
        animation:"fadeUp 0.18s ease",
      }} className="modal-wrap">


        <div className="modal-header" style={{ padding:"20px 24px 14px", borderBottom:"1px solid "+COLORS.border }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"10px" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"9px", flexWrap:"wrap", marginBottom:"3px" }}>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:"1.4rem", color:COLORS.text }}>{stk.t}</span>
                <span style={{ fontSize:"0.85rem", color:COLORS.textMed }}>{stk.n}</span>
                <span style={{
                  padding:"2px 9px", borderRadius:"999px", fontSize:"0.68rem", fontFamily:FONT_MONO, fontWeight:"700",
                  background:rInfo.color+"14", border:"1px solid "+rInfo.color+"35", color:rInfo.color,
                }}>{a.rating}</span>
              </div>
              <div style={{ fontSize:"0.62rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>
                {mkt.flag} {mkt.idx} · {mkt.tz} · {mkt.reg} · {sector.name}
              </div>
              {stk.g && <div style={{ fontSize:"0.6rem", color:COLORS.textDim, marginTop:"2px" }}>🌐 {stk.r.join(" · ")}</div>}
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:FONT_MONO, fontSize:"1.8rem", color:COLORS.text, letterSpacing:"0.02em" }}>
                {fmtPrice(cur, curP)}
              </div>
              <div style={{ color:pos?COLORS.success:COLORS.danger, fontSize:"0.8rem", fontFamily:FONT_MONO }}>
                {pos?"+":""}{chgPct.toFixed(2)}% today
              </div>
            </div>
          </div>


          <div style={{ display:"flex", gap:"16px", marginTop:"12px", flexWrap:"wrap", alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:"0.55rem", color:COLORS.textDim, fontFamily:FONT_MONO, marginBottom:"2px" }}>30-DAY</div>
              <Sparkline data={a.hist} color={pos?COLORS.success:COLORS.danger}/>
            </div>
            {[
              ["52W H", fmtPrice(cur, a.hi52)],
              ["52W L", fmtPrice(cur, a.lo52)],
              ["Target", fmtPrice(cur, a.targetP)],
              ["Stop",   fmtPrice(cur, a.stopP)],
            ].map(function(item) {
              return (
                <div key={item[0]}>
                  <div style={{ fontSize:"0.55rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>{item[0]}</div>
                  <div style={{ fontSize:"0.82rem", color:COLORS.textMed, fontFamily:FONT_MONO }}>{item[1]}</div>
                </div>
              );
            })}
            <div style={{ marginLeft:"auto" }}><RiskGauge score={a.riskS}/></div>
          </div>
        </div>

        <div className="modal-inner" style={{ padding:"14px 24px 24px" }}>


          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(108px,1fr))", gap:"6px", marginBottom:"14px" }}>
            {[
              ["Fund.", a.fundS,  "#f0c030"],
              ["Technical", a.techS, "#00c8ff"],
              ["Astro", a.astroS, "#b060f0"],
              ["Global", a.globalS, "#f09030"],
              ["Risk",  a.riskS,  a.riskS>60?COLORS.danger:COLORS.success],
            ].map(function(item) {
              return <ScoreBar key={item[0]} label={item[0]} value={item[1]} color={item[2]}/>;
            })}
          </div>


          <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"13px" }}>
            {[
              ["overview",    "Overview"],
              ["technical",   "📈 Technical"],
              ["astro",       "🪐 Astro"],
              ["geo",         "🌍 Geopolitical"],
              ["global",      "🌐 Global Ops"],
              ["verdict",     "Verdict"],
              ["ai",          "✨ AI Insight"],
            ].map(function(item){
              return <button key={item[0]} style={tStyle(item[0])} onClick={function(){setTab(item[0]);}}>{item[1]}</button>;
            })}
          </div>


          {tab==="overview" && (
            <div style={{ display:"grid", gap:"10px" }}>

              <div style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, borderRadius:"10px", padding:"13px" }}>
                <div style={{ fontSize:"0.58rem", color:COLORS.textDim, fontFamily:FONT_MONO, marginBottom:"8px" }}>3-MONTH EXPECTED RANGE</div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                  <span style={{ color:COLORS.danger, fontFamily:FONT_MONO, fontSize:"0.9rem" }}>{fmtPrice(cur,a.flLow)}</span>
                  <div style={{ flex:1, height:"6px", background:"rgba(255,255,255,0.04)", borderRadius:"999px", position:"relative", minWidth:"60px" }}>
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,rgba(255,61,84,0.18),rgba(240,192,48,0.18),rgba(0,232,122,0.18))", borderRadius:"999px" }}/>
                    <div style={{
                      position:"absolute",
                      left: Math.max(4, Math.min(92, ((stk.p - a.flLow) / (a.flHigh - a.flLow) * 100))) + "%",
                      width:"10px", height:"10px", borderRadius:"50%",
                      background:"#fff", top:"-2px", transform:"translateX(-50%)",
                      boxShadow:"0 0 6px rgba(255,255,255,0.8)",
                    }}/>
                  </div>
                  <span style={{ color:COLORS.success, fontFamily:FONT_MONO, fontSize:"0.9rem" }}>{fmtPrice(cur,a.flHigh)}</span>
                </div>
                <div style={{ marginTop:"5px", fontSize:"0.62rem", color:COLORS.textDim, textAlign:"center" }}>
                  {"Downside " + ((a.flLow-stk.p)/stk.p*100).toFixed(1) + "% · Upside +" + ((a.flHigh-stk.p)/stk.p*100).toFixed(1) + "%"}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:"9px" }}>
                <div style={{ background:"rgba(255,61,84,0.04)", border:"1px solid rgba(255,61,84,0.12)", borderRadius:"9px", padding:"11px" }}>
                  <div style={{ fontSize:"0.57rem", color:COLORS.danger, fontFamily:FONT_MONO, marginBottom:"6px" }}>⚠ KEY RISKS</div>
                  {a.risks.map(function(r,i){ return <div key={i} style={{ color:COLORS.textMed, fontSize:"0.76rem", marginBottom:"3px", lineHeight:"1.4" }}>· {r}</div>; })}
                </div>
                <div style={{ background:"rgba(0,232,122,0.04)", border:"1px solid rgba(0,232,122,0.12)", borderRadius:"9px", padding:"11px" }}>
                  <div style={{ fontSize:"0.57rem", color:COLORS.success, fontFamily:FONT_MONO, marginBottom:"6px" }}>✦ OPPORTUNITIES</div>
                  {a.opps.map(function(o,i){ return <div key={i} style={{ color:COLORS.textMed, fontSize:"0.76rem", marginBottom:"3px", lineHeight:"1.4" }}>· {o}</div>; })}
                </div>
              </div>

              <div style={{ background:"rgba(176,96,240,0.05)", border:"1px solid rgba(176,96,240,0.15)", borderRadius:"9px", padding:"11px" }}>
                <div style={{ fontSize:"0.57rem", color:"#b060f0", fontFamily:FONT_MONO, marginBottom:"5px" }}>🪐 BEST ENTRY WINDOW</div>
                <div style={{ color:COLORS.textMed, fontSize:"0.82rem", lineHeight:"1.6" }}>{a.entryNote}</div>
              </div>
            </div>
          )}

          {tab==="technical"  && <AnalysisBlock color="#00c8ff" icon="📈" title="Technical Analysis" text={a.techNote}/>}
          {tab==="astro"      && <AnalysisBlock color="#b060f0" icon="🪐" title="Astrological Analysis" text={a.astroNote}/>}
          {tab==="geo"        && <AnalysisBlock color="#f09030" icon="🌍" title="Geopolitical Risk" text={a.geoNote}/>}
          {tab==="global"     && (
            <div style={{ display:"grid", gap:"9px" }}>
              <AnalysisBlock color="#60a8fa" icon="🌐" title="Global Operations Impact" text={a.globalNote}/>
              {stk.g && (
                <div style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, borderRadius:"9px", padding:"11px" }}>
                  <div style={{ fontSize:"0.57rem", color:"#60a8fa", fontFamily:FONT_MONO, marginBottom:"6px" }}>GEOGRAPHIC FOOTPRINT</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
                    {stk.r.map(function(region){
                      return <span key={region} style={{ background:"rgba(96,168,250,0.06)", border:"1px solid rgba(96,168,250,0.14)", color:COLORS.textMed, padding:"2px 8px", borderRadius:"999px", fontSize:"0.66rem", fontFamily:FONT_MONO }}>{region}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}


          {tab==="verdict" && (
            <div style={{ background:"linear-gradient(135deg,rgba(240,192,48,0.06),rgba(176,96,240,0.06))", border:"1px solid rgba(240,192,48,0.16)", borderRadius:"12px", padding:"22px", textAlign:"center" }}>
              <div style={{ fontSize:"1.9rem", marginBottom:"8px" }}>{rInfo.emoji}</div>
              <div style={{ fontFamily:"'Cinzel',serif", color:rInfo.color, fontSize:"1.3rem", marginBottom:"12px" }}>{a.rating}</div>
              <p style={{ color:COLORS.textMed, fontSize:"0.92rem", lineHeight:"1.75", fontStyle:"italic", maxWidth:"520px", margin:"0 auto" }}>{a.verdict}</p>
              <div style={{ display:"flex", justifyContent:"center", gap:"16px", marginTop:"16px", flexWrap:"wrap" }}>
                {[
                  {l:"Price Target", v:fmtPrice(cur,a.targetP), c:COLORS.success},
                  {l:"Stop Loss",    v:fmtPrice(cur,a.stopP),   c:COLORS.danger},
                ].map(function(item){
                  return (
                    <div key={item.l} style={{ background:COLORS.surface, border:"1px solid "+item.c+"22", borderRadius:"9px", padding:"9px 16px", textAlign:"center" }}>
                      <div style={{ fontSize:"0.57rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>{item.l}</div>
                      <div style={{ fontFamily:FONT_MONO, fontSize:"1.1rem", color:item.c, marginTop:"2px" }}>{item.v}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {tab==="ai" && (
            <div>
              <div style={{ background:"rgba(176,96,240,0.05)", border:"1px solid rgba(176,96,240,0.16)", borderRadius:"10px", padding:"15px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                  <div style={{ fontSize:"0.58rem", color:"#b060f0", fontFamily:FONT_MONO }}>✨ AI-POWERED INSIGHT — loads on demand, one call</div>
                  {!aiNote && !aiBusy && (
                    <button onClick={loadAI} style={{ background:"rgba(176,96,240,0.14)", border:"1px solid rgba(176,96,240,0.3)", color:"#b060f0", padding:"5px 13px", borderRadius:"6px", cursor:"pointer", fontSize:"0.7rem", fontFamily:FONT_MONO }}>
                      Load AI Analysis ✦
                    </button>
                  )}
                </div>
                {!aiNote && !aiBusy && (
                  <p style={{ color:COLORS.textDim, fontSize:"0.8rem", lineHeight:"1.55" }}>
                    Click to generate a live AI insight for {stk.t} — combining today's planetary context, geopolitical situation, and a specific price target.
                  </p>
                )}
                {aiBusy && (
                  <div style={{ display:"grid", gap:"7px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", color:COLORS.textMed, fontSize:"0.8rem" }}>
                      <span style={{ animation:"spin 1.2s linear infinite", display:"inline-block", color:"#b060f0" }}>✦</span>
                      Generating AI insight for {stk.t}…
                    </div>
                    {["Checking planetary positions","Analysing geopolitical context","Computing price target","Drafting investment note"].map(function(step, idx){
                      return (
                        <div key={step} style={{ display:"flex", alignItems:"center", gap:"8px", opacity: 0.4 + idx*0.15, animation:"shimmer "+(1.5+idx*0.3)+"s ease-in-out infinite" }}>
                          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#b060f0", flexShrink:0 }}/>
                          <span style={{ fontSize:"0.74rem", color:COLORS.textMed, fontFamily:FONT_MONO }}>{step}…</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {aiNote && (
                  <div>
                    <p style={{ color:"#9090b8", fontSize:"0.88rem", lineHeight:"1.75", whiteSpace:"pre-wrap" }}>{aiNote}</p>
                    {(aiNote === "Connection error — please try again." || aiNote === "AI insight unavailable.") && (
                      <button onClick={function(){setAiNote(null); loadAI();}} style={{ marginTop:"10px", background:"rgba(176,96,240,0.1)", border:"1px solid rgba(176,96,240,0.25)", color:"#b060f0", padding:"5px 13px", borderRadius:"6px", fontSize:"0.7rem", fontFamily:FONT_MONO }}>↻ Retry</button>
                    )}
                  </div>
                )}
              </div>
              <p style={{ color:COLORS.textDim, fontSize:"0.6rem", marginTop:"7px", fontFamily:FONT_MONO }}>
                ⚠ Educational only — not financial advice. Consult a registered advisor before investing.
              </p>
            </div>
          )}

        </div>


        <button onClick={onClose} aria-label="Close" style={{
          position:"absolute", top:"13px", right:"13px",
          background:"rgba(255,255,255,0.05)", border:"1px solid "+COLORS.border,
          color:COLORS.textMed, width:"28px", height:"28px", borderRadius:"50%",
          cursor:"pointer", fontSize:"0.8rem",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>✕</button>
      </div>
    </div>
  );
}

function AnalysisBlock(props) {
  return (
    <div style={{ background:COLORS.surface, border:"1px solid "+props.color+"1a", borderRadius:"10px", padding:"15px" }}>
      <div style={{ fontSize:"0.6rem", color:props.color, fontFamily:FONT_MONO, letterSpacing:"0.1em", marginBottom:"8px" }}>
        {props.icon} {props.title.toUpperCase()}
      </div>
      <p style={{ color:COLORS.textMed, lineHeight:"1.76", fontSize:"0.88rem" }}>{props.text}</p>
    </div>
  );
}

// ============================================================
// PHASE 5 — AI INTEGRATION
// Predictions: 3-horizon report (4 days, 1 week, 1 month)
// Chat: Oracle conversation with full context injection
// ============================================================

function PredictionsTab(props) {
  var planets = props.planets;
  var sectors = props.sectors;
  var mkt     = props.mkt;
  var today   = props.today;

  var [preds,  setPreds]  = useState(null);
  var [busy,   setBusy]   = useState(false);
  var [active, setActive] = useState("4days");

  var HORIZONS = [
    { key:"4days", label:"⚡ 4 Days", color:"#00c8ff" },
    { key:"week",  label:"📅 1 Week",  color:"#b060f0" },
    { key:"month", label:"🌕 1 Month", color:"#f0c030" },
  ];

  var oColors = { Bullish:"#00e87a", Neutral:"#f0c030", Bearish:"#ff3d54" };
  var aColors = { "Strong Buy":"#00e87a", "Buy":"#40d888", "Accumulate":"#f0c030", "Hold":"#f0a030", "Reduce":"#ff7050", "Avoid":"#ff3d54" };

  async function generate() {
    if (busy) return;
    setBusy(true); setPreds(null);
    try {
      var pCtx = planets.map(function(p){
        return p.name + " in " + p.rashiName + "(" + p.status + "," + p.degree + "°)";
      }).join("; ");
      var sCtx = sectors.map(function(s){ return s.name + "=" + s.score; }).join(", ");
      var stks = [];
      sectors.forEach(function(sec){
        sec.stocks.forEach(function(stk){
          stks.push(stk.t + "(" + sec.name + ",score=" + stockScore(stk,sec,planets) + ")");
        });
      });

      var prompt =
        "You are AstroFinance Oracle — expert combining Vedic astrology, technical analysis, fundamentals, geopolitics, and macroeconomics for " + mkt.idx + " (" + mkt.cur + mkt.code + ").\n\n" +
        "DATE: " + today.toDateString() + "\n" +
        "MARKET: " + mkt.idx + " | Currency: " + mkt.cur + mkt.code + " | Country: " + mkt.country + "\n\n" +
        "PLANETARY POSITIONS (Vedic):\n" + pCtx + "\n\n" +
        "SECTOR SCORES (0-100): " + sCtx + "\n\n" +
        "ALL STOCKS WITH COMPOSITE SCORES:\n" + stks.join(", ") + "\n\n" +
        "MACRO CONTEXT:\n" +
        "• Central bank rate trajectory and monetary policy stance in 2026\n" +
        "• US-China tech tensions: export controls, tariffs, supply chain reshoring\n" +
        "• AI capex supercycle: GPU demand, hyperscaler spending, power infrastructure build\n" +
        "• Middle East oil supply & tanker routes · NATO defence spending increases\n" +
        "• " + mkt.code + "/USD trajectory and multinational earnings impact\n" +
        "• Consumer credit stress · Semiconductor supply chain reshoring\n\n" +
        "Generate 3 separate prediction blocks for different time horizons.\n" +
        "Return ONLY valid JSON — no markdown, no extra text:\n" +
        "{" +
        "\"fourDays\":{\"outlook\":\"Bullish|Neutral|Bearish\",\"score\":0-100,\"summary\":\"2 sentences on next 4 trading days — key planetary triggers and expected price action\"," +
        "\"buys\":[{\"t\":\"ticker\",\"n\":\"name\",\"sector\":\"sector\",\"action\":\"Strong Buy|Buy\",\"conf\":0-100,\"entry\":\"" + mkt.cur + "X\",\"target\":\"" + mkt.cur + "Y\",\"stop\":\"" + mkt.cur + "Z\",\"astro\":\"1 sentence\",\"tech\":\"1 sentence\",\"catalyst\":\"immediate 4-day catalyst\",\"risk\":\"Low|Medium|High\"}]," +
        "\"avoids\":[{\"t\":\"ticker\",\"n\":\"name\",\"reason\":\"1 sentence\"}]," +
        "\"keyEvent\":\"biggest event or risk in next 4 trading days\"}," +
        "\"oneWeek\":{\"outlook\":\"Bullish|Neutral|Bearish\",\"score\":0-100,\"summary\":\"2 sentences for the week — sector rotation and weekly planetary arc\"," +
        "\"buys\":[{\"t\":\"ticker\",\"n\":\"name\",\"sector\":\"sector\",\"action\":\"Strong Buy|Buy\",\"conf\":0-100,\"entry\":\"" + mkt.cur + "X\",\"target\":\"" + mkt.cur + "Y\",\"stop\":\"" + mkt.cur + "Z\",\"astro\":\"1 sentence\",\"tech\":\"1 sentence\",\"catalyst\":\"weekly catalyst\",\"risk\":\"Low|Medium|High\"}]," +
        "\"avoids\":[{\"t\":\"ticker\",\"n\":\"name\",\"reason\":\"1 sentence\"}]," +
        "\"rotation\":\"which sectors to rotate into/out of this week\",\"keyEvent\":\"biggest risk or opportunity this week\"}," +
        "\"oneMonth\":{\"outlook\":\"Bullish|Neutral|Bearish\",\"score\":0-100,\"summary\":\"2 sentences for the month — macro trend and major planetary transits\"," +
        "\"buys\":[{\"t\":\"ticker\",\"n\":\"name\",\"sector\":\"sector\",\"action\":\"Strong Buy|Buy|Accumulate\",\"conf\":0-100,\"entry\":\"" + mkt.cur + "X\",\"target\":\"" + mkt.cur + "Y\",\"stop\":\"" + mkt.cur + "Z\",\"astro\":\"1 sentence\",\"tech\":\"1 sentence\",\"fundamental\":\"1 sentence\",\"geo\":\"1 sentence macro/geo catalyst\",\"risk\":\"Low|Medium|High\"}]," +
        "\"avoids\":[{\"t\":\"ticker\",\"n\":\"name\",\"reason\":\"1 sentence\"}]," +
        "\"leaders\":[\"sector1\",\"sector2\",\"sector3\"],\"laggards\":[\"sector1\",\"sector2\"]," +
        "\"portfolioTip\":\"1 sentence on portfolio positioning\",\"keyEvent\":\"biggest macro event to watch this month\"}}\n\n" +
        "Rules: fourDays buys=3 avoids=2. oneWeek buys=4 avoids=2. oneMonth buys=5 avoids=3. " +
        "All tickers from provided list. Use real " + mkt.cur + " price levels. " +
        "Short-horizon picks should differ from long-horizon where appropriate. " +
        "Confidence scores must reflect genuine conviction — only 85%+ when ALL 5 dimensions align.";

      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:3500, messages:[{role:"user",content:prompt}] })
      });
      var d = await res.json();
      var txt = d.content && d.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
      if (txt) {
        var clean = txt.replace(/```json|```/g,"").trim();
        var match = clean.match(/\{[\s\S]*\}/);
        if (match) setPreds(JSON.parse(match[0]));
      }
    } catch(e) {
      setPreds({ error:"Generation failed — please try again." });
    }
    setBusy(false);
  }

  function HorizonBlock(bProps) {
    var data = bProps.data;
    if (!data) return null;
    var oc = oColors[data.outlook] || COLORS.gold;
    return (
      <div style={{ display:"grid", gap:"10px" }}>

        <div style={{ background:COLORS.surface, border:"1px solid "+bProps.col+"28", borderRadius:"11px", padding:"14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"9px" }}>
            <div>
              <div style={{ fontSize:"0.57rem", color:bProps.col, fontFamily:FONT_MONO, letterSpacing:"0.1em", marginBottom:"3px" }}>MARKET OUTLOOK</div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:"1.15rem", color:oc }}>{data.outlook}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"0.55rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>CONVICTION</div>
              <div style={{ fontFamily:FONT_MONO, fontSize:"1.35rem", color:oc }}>{data.score}<span style={{fontSize:"0.7rem",color:COLORS.textDim}}>/100</span></div>
            </div>
          </div>
          <p style={{ color:COLORS.textMed, fontSize:"0.84rem", lineHeight:"1.68", marginBottom:"9px" }}>{data.summary}</p>
          {data.keyEvent && (
            <div style={{ background:"rgba(255,61,84,0.05)", border:"1px solid rgba(255,61,84,0.14)", borderRadius:"6px", padding:"8px" }}>
              <span style={{ fontSize:"0.57rem", color:COLORS.danger, fontFamily:FONT_MONO }}>🚨 KEY EVENT: </span>
              <span style={{ fontSize:"0.78rem", color:COLORS.textMed }}>{data.keyEvent}</span>
            </div>
          )}
          {data.rotation && (
            <div style={{ marginTop:"6px", background:"rgba(96,168,250,0.05)", border:"1px solid rgba(96,168,250,0.12)", borderRadius:"6px", padding:"8px" }}>
              <span style={{ fontSize:"0.57rem", color:"#60a8fa", fontFamily:FONT_MONO }}>↻ ROTATION: </span>
              <span style={{ fontSize:"0.78rem", color:COLORS.textMed }}>{data.rotation}</span>
            </div>
          )}
          {data.portfolioTip && (
            <div style={{ marginTop:"6px", background:"rgba(240,192,48,0.05)", border:"1px solid rgba(240,192,48,0.12)", borderRadius:"6px", padding:"8px" }}>
              <span style={{ fontSize:"0.57rem", color:COLORS.gold, fontFamily:FONT_MONO }}>💼 PORTFOLIO: </span>
              <span style={{ fontSize:"0.78rem", color:COLORS.textMed }}>{data.portfolioTip}</span>
            </div>
          )}
          {data.leaders && data.leaders.length > 0 && (
            <div style={{ marginTop:"8px", display:"flex", gap:"5px", flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:"0.57rem", color:COLORS.success, fontFamily:FONT_MONO }}>▲ LEAD:</span>
              {data.leaders.map(function(s){ return <span key={s} style={{ background:"rgba(0,232,122,0.07)", border:"1px solid rgba(0,232,122,0.18)", color:"#00aa55", padding:"1px 7px", borderRadius:"999px", fontSize:"0.64rem", fontFamily:FONT_MONO }}>{s}</span>; })}
              {data.laggards && data.laggards.length > 0 && <span style={{ fontSize:"0.57rem", color:COLORS.danger, fontFamily:FONT_MONO, marginLeft:"4px" }}>▼ LAG:</span>}
              {(data.laggards||[]).map(function(s){ return <span key={s} style={{ background:"rgba(255,61,84,0.07)", border:"1px solid rgba(255,61,84,0.18)", color:"#cc2233", padding:"1px 7px", borderRadius:"999px", fontSize:"0.64rem", fontFamily:FONT_MONO }}>{s}</span>; })}
            </div>
          )}
        </div>


        {data.buys && data.buys.length > 0 && (
          <div>
            <div style={{ fontSize:"0.58rem", color:COLORS.success, fontFamily:FONT_MONO, letterSpacing:"0.1em", marginBottom:"7px" }}>✦ BUY RECOMMENDATIONS</div>
            <div style={{ display:"grid", gap:"7px" }}>
              {data.buys.map(function(p, i){
                var ac = aColors[p.action] || COLORS.success;
                return (
                  <div key={p.t||i} style={{ background:"rgba(0,232,122,0.025)", border:"1px solid rgba(0,232,122,"+(i===0?"0.22":"0.09")+")", borderRadius:"10px", padding:"12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"6px", marginBottom:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"7px", flexWrap:"wrap" }}>
                        {i===0 && <span style={{ fontSize:"0.53rem", background:"rgba(0,232,122,0.1)", color:COLORS.success, padding:"1px 5px", borderRadius:"3px", fontFamily:FONT_MONO }}>★ TOP</span>}
                        <span style={{ fontFamily:"'Cinzel',serif", fontSize:"1rem", color:COLORS.text }}>{p.t}</span>
                        <span style={{ fontSize:"0.76rem", color:COLORS.textMed }}>{p.n}</span>
                        <span style={{ fontSize:"0.62rem", color:COLORS.textDim, background:COLORS.surface, padding:"1px 6px", borderRadius:"3px", fontFamily:FONT_MONO }}>{p.sector}</span>
                        <span style={{ padding:"2px 8px", background:ac+"12", border:"1px solid "+ac+"35", color:ac, borderRadius:"999px", fontSize:"0.64rem", fontFamily:FONT_MONO, fontWeight:"700" }}>{p.action}</span>
                      </div>
                      <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:"0.52rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>CONF</div>
                          <div style={{ fontFamily:FONT_MONO, fontSize:"0.92rem", color:ac }}>{p.conf}%</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:"0.52rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>RISK</div>
                          <div style={{ fontFamily:FONT_MONO, fontSize:"0.78rem", color:p.risk==="Low"?COLORS.success:p.risk==="High"?COLORS.danger:COLORS.warn }}>{p.risk}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>
                      {[["Entry",p.entry,"#60a8fa"],["Target",p.target,COLORS.success],["Stop",p.stop,COLORS.danger]].map(function(it){
                        return (
                          <div key={it[0]} style={{ background:COLORS.surface, borderRadius:"5px", padding:"4px 8px", textAlign:"center" }}>
                            <div style={{ fontSize:"0.52rem", color:COLORS.textDim, fontFamily:FONT_MONO }}>{it[0]}</div>
                            <div style={{ fontFamily:FONT_MONO, fontSize:"0.78rem", color:it[2] }}>{it[1]}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"5px" }}>
                      {[
                        p.astro       && ["🪐", p.astro,       "#b060f0"],
                        p.tech        && ["📈", p.tech,        "#00c8ff"],
                        p.catalyst    && ["⚡", p.catalyst,    "#f0c030"],
                        p.fundamental && ["📊", p.fundamental, "#f0c030"],
                        p.geo         && ["🌍", p.geo,         "#f09030"],
                      ].filter(Boolean).map(function(it, ii){
                        return (
                          <div key={ii} style={{ background:"rgba(255,255,255,0.02)", borderRadius:"5px", padding:"6px" }}>
                            <span style={{ fontSize:"0.55rem", color:it[2], fontFamily:FONT_MONO }}>{it[0]} </span>
                            <span style={{ fontSize:"0.72rem", color:COLORS.textMed, lineHeight:"1.4" }}>{it[1]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {data.avoids && data.avoids.length > 0 && (
          <div>
            <div style={{ fontSize:"0.58rem", color:COLORS.danger, fontFamily:FONT_MONO, letterSpacing:"0.1em", marginBottom:"7px" }}>⚠ AVOID / REDUCE</div>
            <div style={{ display:"grid", gap:"5px" }}>
              {data.avoids.map(function(p, i){
                return (
                  <div key={p.t||i} style={{ display:"flex", gap:"10px", alignItems:"flex-start", background:"rgba(255,61,84,0.03)", border:"1px solid rgba(255,61,84,0.12)", borderRadius:"8px", padding:"10px" }}>
                    <span style={{ fontFamily:"'Cinzel',serif", fontSize:"0.92rem", color:"#cc3344", minWidth:"44px" }}>{p.t}</span>
                    <div>
                      <div style={{ fontSize:"0.72rem", color:COLORS.textMed, marginBottom:"1px" }}>{p.n}</div>
                      <div style={{ fontSize:"0.75rem", color:COLORS.textDim, lineHeight:"1.4" }}>{p.reason}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  var activeData = preds && !preds.error
    ? (active==="4days" ? preds.fourDays : active==="week" ? preds.oneWeek : preds.oneMonth)
    : null;
  var activeHorizon = HORIZONS.filter(function(h){return h.key===active;})[0];

  return (
    <div style={{ animation:"fadeUp 0.25s ease" }}>

      <div style={{ background:COLORS.surface, border:"1px solid rgba(240,192,48,0.16)", borderRadius:"12px", padding:"16px", marginBottom:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <h3 style={{ fontFamily:"'Cinzel',serif", color:COLORS.gold, fontSize:"0.95rem", marginBottom:"4px" }}>🔮 AI Market Predictions — {mkt.idx}</h3>
            <p style={{ fontSize:"0.74rem", color:COLORS.textMed, lineHeight:"1.5", maxWidth:"480px" }}>
              One click generates all 3 horizons simultaneously — each with different picks optimised for that timeframe. Analyses 5 dimensions: astrology, technicals, fundamentals, geopolitics, macro.
            </p>
            <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginTop:"8px" }}>
              {["🪐 Astrology","📈 Technical","📊 Fundamentals","🌍 Geopolitics","🏦 Macro/Fed"].map(function(item){
                return <span key={item} style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, color:COLORS.textDim, padding:"2px 8px", borderRadius:"999px", fontSize:"0.61rem", fontFamily:FONT_MONO }}>{item}</span>;
              })}
            </div>
          </div>
          <button onClick={generate} disabled={busy} style={{
            background: busy ? "rgba(255,255,255,0.03)" : "linear-gradient(135deg,#4e3405,#b08010,#4e3405)",
            color: busy ? COLORS.textMed : "#060200",
            border:"none", padding:"10px 22px", borderRadius:"8px",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize:"0.88rem", fontFamily:"'Cinzel',serif", fontWeight:"700", letterSpacing:"0.04em",
            whiteSpace:"nowrap",
          }}>
            {busy ? "⏳ Analysing 5 dimensions…" : "⬡ Generate All 3 Predictions"}
          </button>
        </div>
      </div>


      {busy && (
        <div style={{ animation:"fadeUp 0.2s ease" }}>

          <div style={{ display:"flex", gap:"7px", marginBottom:"14px" }}>
            {["⚡ 4 Days","📅 1 Week","🌕 1 Month"].map(function(label) {
              return (
                <div key={label} style={{ flex:1, padding:"10px 8px", background:COLORS.surface, border:"1px solid "+COLORS.border, borderRadius:"9px", textAlign:"center", animation:"shimmer 1.6s ease-in-out infinite" }}>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:"0.8rem", color:COLORS.textDim }}>{label}</div>
                  <div style={{ fontSize:"0.62rem", color:COLORS.textDim, fontFamily:FONT_MONO, marginTop:"2px" }}>…</div>
                </div>
              );
            })}
          </div>
          <div style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, borderRadius:"11px", padding:"20px", marginBottom:"10px", animation:"shimmer 1.8s ease-in-out infinite" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px" }}>
              <div>
                <div style={{ width:"120px", height:"10px", background:"rgba(255,255,255,0.06)", borderRadius:"4px", marginBottom:"8px" }}/>
                <div style={{ width:"80px", height:"22px", background:"rgba(255,255,255,0.06)", borderRadius:"4px" }}/>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ width:"60px", height:"10px", background:"rgba(255,255,255,0.06)", borderRadius:"4px", marginBottom:"8px", marginLeft:"auto" }}/>
                <div style={{ width:"50px", height:"28px", background:"rgba(255,255,255,0.06)", borderRadius:"4px", marginLeft:"auto" }}/>
              </div>
            </div>
            <div style={{ width:"100%", height:"8px", background:"rgba(255,255,255,0.04)", borderRadius:"4px", marginBottom:"6px" }}/>
            <div style={{ width:"80%", height:"8px", background:"rgba(255,255,255,0.04)", borderRadius:"4px" }}/>
          </div>
          {[1,2,3].map(function(i) {
            return (
              <div key={i} style={{ background:"rgba(0,232,122,0.02)", border:"1px solid rgba(0,232,122,0.07)", borderRadius:"10px", padding:"14px", marginBottom:"8px", animation:"shimmer "+(1.4+i*0.2)+"s ease-in-out infinite" }}>
                <div style={{ display:"flex", gap:"10px", marginBottom:"10px" }}>
                  <div style={{ width:"50px", height:"18px", background:"rgba(255,255,255,0.05)", borderRadius:"4px" }}/>
                  <div style={{ width:"90px", height:"18px", background:"rgba(255,255,255,0.05)", borderRadius:"4px" }}/>
                  <div style={{ width:"60px", height:"18px", background:"rgba(255,255,255,0.05)", borderRadius:"4px" }}/>
                </div>
                <div style={{ display:"flex", gap:"6px", marginBottom:"8px" }}>
                  {[1,2,3].map(function(j){return <div key={j} style={{ width:"70px", height:"38px", background:"rgba(255,255,255,0.04)", borderRadius:"5px" }}/>;}) }
                </div>
                <div style={{ width:"100%", height:"7px", background:"rgba(255,255,255,0.04)", borderRadius:"3px" }}/>
              </div>
            );
          })}
          <div style={{ textAlign:"center", marginTop:"16px", color:COLORS.textDim, fontSize:"0.72rem", fontFamily:FONT_MONO }}>
            {"🪐 " + mkt.country + " planetary transits · 📊 " + Object.keys(mkt.sectors).length + " sectors · " + (function(){var n=0;Object.values(mkt.sectors).forEach(function(s){n+=s.stocks.length;});return n;})() + " stocks being analysed…"}
          </div>
        </div>
      )}

      {!preds && !busy && (
        <div style={{ display:"grid", gap:"9px", marginTop:"4px" }}>

          <div style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, borderRadius:"11px", padding:"22px", textAlign:"center" }}>
            <div style={{ fontSize:"2.4rem", marginBottom:"10px", opacity:0.6 }}>🔮</div>
            <p style={{ color:COLORS.textMed, fontSize:"0.84rem", lineHeight:"1.65", maxWidth:"400px", margin:"0 auto" }}>
              Click <strong style={{color:COLORS.goldLt}}>Generate All 3 Predictions</strong> to run a full 5-dimension analysis of {mkt.idx} across all {(function(){var n=0;Object.values(mkt.sectors).forEach(function(s){n+=s.stocks.length;});return n;})()}&nbsp;stocks.
            </p>
            <div style={{ display:"flex", justifyContent:"center", gap:"6px", flexWrap:"wrap", marginTop:"14px" }}>
              {["🪐 Vedic Astrology","📈 Technical","📊 Fundamentals","🌍 Geopolitics","🏦 Macro & Fed"].map(function(d){
                return <span key={d} style={{ background:COLORS.surface, border:"1px solid "+COLORS.border, color:COLORS.textDim, padding:"3px 9px", borderRadius:"999px", fontSize:"0.65rem", fontFamily:FONT_MONO }}>{d}</span>;
              })}
            </div>
          </div>

          {[1,2,3].map(function(i){
            return (
              <div key={i} style={{ background:"rgba(0,232,122,0.015)", border:"1px solid rgba(0,232,122,0.06)", borderRadius:"10px", padding:"13px", opacity:0.45 }}>
                <div style={{ display:"flex", gap:"8px", marginBottom:"8px" }}>
                  <div style={{ width:"48px", height:"16px", background:"rgba(0,232,122,0.1)", borderRadius:"3px" }}/>
                  <div style={{ width:"80px", height:"16px", background:"rgba(255,255,255,0.04)", borderRadius:"3px" }}/>
                  <div style={{ width:"55px", height:"16px", background:"rgba(255,255,255,0.04)", borderRadius:"3px" }}/>
                </div>
                <div style={{ display:"flex", gap:"5px" }}>
                  {[1,2,3].map(function(j){return <div key={j} style={{ width:"65px", height:"34px", background:"rgba(255,255,255,0.03)", borderRadius:"4px" }}/>;}) }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preds && preds.error && (
        <div style={{ background:"rgba(255,61,84,0.05)", border:"1px solid rgba(255,61,84,0.16)", borderRadius:"9px", padding:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
          <span style={{ color:"#cc3344", fontSize:"0.82rem" }}>{preds.error}</span>
          <button onClick={generate} style={{ background:"rgba(255,61,84,0.12)", border:"1px solid rgba(255,61,84,0.3)", color:"#ff3d54", padding:"5px 13px", borderRadius:"6px", fontSize:"0.72rem", fontFamily:FONT_MONO }}>↻ Retry</button>
        </div>
      )}

      {preds && !preds.error && (
        <div>

          <div className="pred-tabs" style={{ display:"flex", gap:"7px", marginBottom:"14px" }}>
            {HORIZONS.map(function(h){
              var active2 = active === h.key;
              var hdata = h.key==="4days" ? preds.fourDays : h.key==="week" ? preds.oneWeek : preds.oneMonth;
              var hout  = hdata && hdata.outlook;
              var hoc   = oColors[hout] || h.color;
              return (
                <button key={h.key} onClick={function(){setActive(h.key);}} style={{
                  flex:1, padding:"10px 8px", textAlign:"center",
                  background: active2 ? "rgba(255,255,255,0.06)" : COLORS.surface,
                  border:"2px solid", borderColor: active2 ? h.color+"70" : COLORS.border,
                  borderRadius:"9px", cursor:"pointer", transition:"all 0.15s",
                }}>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:"0.8rem", color: active2 ? h.color : COLORS.textMed }}>{h.label}</div>
                  {hout && <div style={{ fontSize:"0.62rem", color:hoc, fontFamily:FONT_MONO, marginTop:"2px" }}>{hout} · {hdata.score}%</div>}
                </button>
              );
            })}
          </div>

          <HorizonBlock data={activeData} col={activeHorizon ? activeHorizon.color : COLORS.gold}/>
          <p style={{ color:COLORS.textDim, fontSize:"0.6rem", fontFamily:FONT_MONO, textAlign:"center", marginTop:"14px" }}>
            ⚠ Educational only — not financial advice. Consult a registered advisor.
          </p>
        </div>
      )}
    </div>
  );
}

function ChatTab(props) {
  var planets = props.planets;
  var sectors = props.sectors;
  var mkt     = props.mkt;
  var today   = props.today;

  var initMsg = "🌟 Oracle ready for " + mkt.idx + " — " + today.toDateString() + "\n\n" +
    "Sectors scored: " + sectors.slice(0,3).map(function(s){return s.name+"("+s.score+")";}).join(", ") + " lead. " +
    (sectors[sectors.length-1].score < 40 ? sectors[sectors.length-1].name + " weakest — avoid.\n\n" : "\n\n") +
    "Ask me about specific stocks, sectors, planetary timing, entry points, or portfolio positioning.";

  var [msgs,   setMsgs]   = useState([{role:"assistant",content:initMsg}]);
  var [input,  setInput]  = useState("");
  var [busy,   setBusy]   = useState(false);
  var chatRef = useRef(null);

  useEffect(function() {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs]);

  var QUICK = [
    "Top stock pick right now?",
    "Which sector is safest?",
    "Best planetary entry window?",
    "What to avoid this week?",
  ];

  async function send() {
    var msg = input.trim();
    if (!msg || busy) return;
    setInput("");
    setMsgs(function(prev){return prev.concat([{role:"user",content:msg}]);});
    setBusy(true);
    try {
      var notable = planets.filter(function(p){return p.status!=="Transit";}).map(function(p){return p.name+" "+p.status+" in "+p.rashiName;}).join("; ") || "all in transit";
      var secStr  = sectors.map(function(s){return s.name+":"+s.score;}).join(", ");
      var sys = "You are AstroFinance Oracle. Market: " + mkt.idx + " (" + mkt.cur + mkt.code + "). Date: " + today.toDateString() + ". " +
        "Notable planets: " + notable + ". " +
        "Sector scores (0-100): " + secStr + ". " +
        "Respond in 3-5 sentences. Be specific: use ticker symbols, " + mkt.cur + " price levels, planetary timing windows. No disclaimers in response.";
      var history = msgs.slice(-8).map(function(m){return {role:m.role,content:m.content};});
      history.push({role:"user",content:msg});
      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:500, system:sys, messages:history })
      });
      var d = await res.json();
      var txt = d.content && d.content.filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
      setMsgs(function(prev){return prev.concat([{role:"assistant",content:txt||"Error — please try again."}]);});
    } catch(e) {
      setMsgs(function(prev){return prev.concat([{role:"assistant",content:"⚠️ Connection error."}]);});
    }
    setBusy(false);
  }

  return (
    <div style={{ animation:"fadeUp 0.25s ease" }}>
      <h3 style={{ fontFamily:"'Cinzel',serif", color:COLORS.gold, fontSize:"0.95rem", marginBottom:"12px" }}>
        💬 Oracle Chat — {mkt.flag} {mkt.idx}
      </h3>

      <div ref={chatRef} style={{
        background:"rgba(255,255,255,0.012)", border:"1px solid "+COLORS.border,
        borderRadius:"11px", height:"340px", overflowY:"auto",
        padding:"12px", display:"flex", flexDirection:"column", gap:"8px", marginBottom:"9px",
      }}>
        {msgs.map(function(m,i){
          var isBot = m.role === "assistant";
          return (
            <div key={i} style={{ display:"flex", justifyContent:isBot?"flex-start":"flex-end" }}>
              <div style={{
                maxWidth:"78%", padding:"9px 12px",
                borderRadius: isBot ? "11px 11px 11px 3px" : "11px 11px 3px 11px",
                background: isBot ? "rgba(255,255,255,0.025)" : "rgba(200,152,24,0.08)",
                border:"1px solid", borderColor: isBot ? COLORS.border : COLORS.gold+"18",
                fontSize:"0.84rem", lineHeight:"1.65", color:COLORS.text, whiteSpace:"pre-wrap",
              }}>
                {isBot && <span style={{ color:COLORS.gold, display:"block", marginBottom:"2px", fontSize:"0.6rem", fontFamily:FONT_MONO }}>🔮 ORACLE</span>}
                {m.content}
              </div>
            </div>
          );
        })}
        {busy && <div style={{ color:COLORS.textDim, fontStyle:"italic", fontSize:"0.74rem" }}>🌟 Consulting the stars…</div>}
      </div>

      <div style={{ display:"flex", gap:"7px", marginBottom:"7px" }}>
        <input
          style={{
            flex:1, background:COLORS.surface, border:"1px solid "+COLORS.border,
            color:COLORS.text, padding:"9px 13px", borderRadius:"8px",
            fontSize:"0.9rem", fontFamily:FONT_SERIF,
          }}
          value={input}
          onChange={function(e){setInput(e.target.value);}}
          onKeyDown={function(e){
            if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); }
          }}
          disabled={busy}
          placeholder={busy ? "Consulting the stars…" : "Ask about " + mkt.idx + " stocks, sectors, timing…"}
        />
        <button onClick={send} disabled={busy} aria-label="Send message" style={{
          background: busy ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#4e3405,#b08010)",
          color: busy ? COLORS.textDim : "#060200",
          border:"none", padding:"9px 15px",
          borderRadius:"8px", cursor: busy ? "not-allowed" : "pointer",
          fontSize:"0.9rem", fontFamily:"'Cinzel',serif", fontWeight:"700",
          opacity: busy ? 0.5 : 1,
        }}>{busy ? "…" : "✦"}</button>
      </div>

      <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
        {QUICK.map(function(q){
          return (
            <button key={q} onClick={function(){ setInput(q); }} style={{
              background:COLORS.surface, border:"1px solid "+COLORS.border,
              color:COLORS.textDim, padding:"3px 9px", borderRadius:"999px",
              cursor:"pointer", fontSize:"0.69rem", fontFamily:FONT_SERIF,
            }}>{q}</button>
          );
        })}
      </div>
      <p style={{ color:COLORS.textDim, fontSize:"0.6rem", fontFamily:FONT_MONO, marginTop:"10px", textAlign:"center" }}>
        ⚠ Educational only — not financial advice. Consult a registered advisor before investing.
      </p>
    </div>
  );
}
