# 🎃 NIGHTSTOCK — The Inventory of the Damned
> **Smart Inventory Management & Demand Prediction Engine**  
> *A high-octane Halloween cyberpunk web platform built for college hackathons.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Witch's%20Potion%20Pantry-ffaa00.svg)](https://the-witch-s-potion-pantry-1.ai.studio/)
![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)
![Python](https://img.shields.io/badge/Python-3.11%2B%20%7C%203.15-purple.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-00ff88.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Scikit--Learn](https://img.shields.io/badge/Scikit--Learn-Ridge%20ML-blue.svg)
![License](https://img.shields.io/badge/License-MIT-red.svg)

---

## 🔮 Two Interconnected Interfaces Included

This repository contains two complete hackathon solutions for Smart Inventory & Demand Prediction:

1. **NIGHTSTOCK Cyberpunk Engine** (`/`):
   - FastAPI + SQLite + Scikit-Learn Ridge Regression backend with 95% Confidence Intervals.
   - Real-world retail dataset ingestion (`real_store_inventory.csv`, `real_consumption_history.csv`).
   - Pure HTML5/CSS3/Vanilla JS interface with retro sound synth, interactive Chart.js forecasts, and real-time CSV import/export.

2. **The Witch's Potion Pantry** (`/witch-pantry` or `witch-potion-pantry/`):
   - **Live Cloud Prototype**: [https://the-witch-s-potion-pantry-1.ai.studio/](https://the-witch-s-potion-pantry-1.ai.studio/)
   - Modern React 19 + Tailwind CSS + Framer Motion app.
   - Predictive depletion analytics, Full Moon surge stress-testing, and dual Desktop + Android mobile phone simulator layouts.

---

## 🚫 ZERO MOCK DATA GUARANTEE & REAL CSV IMPORT

NIGHTSTOCK operates strictly on **100% real data**:
1. **Real-World Benchmark Datasets**: Bundled with verified retail & pharmaceutical inventory and sales records (`data/real_store_inventory.csv` & `data/real_consumption_history.csv`).
2. **Custom CSV File Ingestion**: Upload your own enterprise or store inventory CSVs and consumption transaction logs directly via the UI or API (`POST /api/data/import-inventory` & `POST /api/data/import-consumption`).
3. **No Synthetic Fallbacks**: If a product has no transaction history, the machine learning engine honestly reports `"Awaiting Real Transaction Data"` rather than faking random forecasts.
4. **Blank Slate Mode**: Wipe the database clean anytime with one click to start from scratch with purely your own company's data.

**Problem Statement:** *Smart Inventory & Demand Prediction*

Businesses and healthcare networks lose over **\$1.75 Trillion annually** due to poor inventory management:
- **Under-stocking** causes catastrophic stockouts, unfulfilled customer demand, and lost revenue.
- **Over-stocking** locks up crucial working capital and leads to spoilage or obsolete goods.
- **Unpredicted Spikes** during peak seasons, rituals, or holidays leave operations blind and paralyzed.

**The NIGHTSTOCK Solution:**  
NIGHTSTOCK reimagines inventory management as a sleek, gothic-cyberpunk command center for *The Inventory of the Damned*. Designed for a 3-member college hackathon team, it provides enterprise-grade capabilities with zero setup friction:
1. **Real-time Inventory Crypt**: Fast tracking, categorized reagents, quick stock stepper adjustments, and daily consumption logging.
2. **Transparent Machine Learning**: Predicts 7-day demand using Scikit-Learn Ridge Regression with 95% Confidence Intervals, avoiding fake black-box claims.
3. **Statistical Anomaly & Spike Detection**: Z-score engine that flags supernatural surges in real time.
4. **The Necromancer's Diagnostics**: Plain-English explanations detailing *why* an item needs reordering, depletion horizons, and recommended batch quantities.
5. **Smart Alerts & CSV Audits**: One-click reordering, actionable notifications, and downloadable CSV grimoires.

---

## ⚡ 1-Minute Quick Start

### Prerequisites
- Python 3.11+ (Python 3.15 tested & supported!)
- No Node.js or external database required!

### Option 1: One-Click Shell Launcher (macOS / Linux)
```bash
cd /Users/elyxian/.gemini/antigravity/scratch/nightstock
./run.sh
```

### Option 2: Python Direct Run (Windows / macOS / Linux)
```bash
cd /Users/elyxian/.gemini/antigravity/scratch/nightstock

# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch application
python run.py
```

Open your browser at: **`http://127.0.0.1:8000`**  
Interactive Swagger API Docs: **`http://127.0.0.1:8000/docs`**

---

## 🔮 Core Features

### 1. 📊 The Crypt Dashboard
- **Total Products & Crypt Valuation**: Dynamic asset calculation based on unit prices and active stock.
- **Low-Stock & Stockout Counters**: Real-time counts of items below safety levels.
- **Today's Consumption**: Units dispensed across all ritual categories in the last 24 hours.
- **Aggregated 7-Day Demand Forecast**: Cumulative predicted consumption across the crypt.
- **Crypt Vitality Index**: Statistical health score (0–100%) measuring overall inventory safety buffers.
- **Interactive Visualizations**:
  - Stock Velocity Bar Chart: Current crypt stock vs. projected 7-day demand.
  - Category Distribution Donut Chart with glowing neon slices.

### 2. 📦 Inventory Management
- **Full CRUD**: Add, edit, delete, and inspect reagents with custom SKUs, suppliers, and spookiness ratings (1–5 🦇).
- **Instant Stepper Controls**: Quick `+1` / `-1` adjustments with microsecond SQLite updates.
- **Ritual Consumption Logging**: Log usage with reason tagging (`Midnight Ritual Demand`, `Cauldron Boiling`), automatically triggering stock decrements and spike detection.
- **Real-Time Filtering**: Live search by name, SKU, or supplier; filter by stock status (Healthy, Low Stock, Depleted); category chip pills.

### 3. 🔮 Demand Prediction Engine (Transparent ML)
- **Scikit-Learn Ridge Regression**:
  Trained on 30-day historical consumption using engineered features:
  - Time step $t$
  - Lag 1 ($\text{Yesterday}$)
  - Lag 7 ($\text{Same day last week}$)
  - 7-Day Rolling Mean ($\mu_{7d}$)
  - One-hot Day-of-Week Seasonality (capturing Friday/Saturday ritual spikes)
- **Statistical EWMA Fallback**: For products with sparse history ($< 12$ days), automatically applies 7-day Exponentially Weighted Moving Average with seasonality indices.
- **95% Confidence Bounds**: Plotted as shaded prediction bands using residual standard errors.
- **Calculated Reorder Recommendation**:
  $$\text{Safety Stock} = 1.65 \times \sqrt{\text{Lead Time}} \times \sigma_{\text{daily}}$$
  $$\text{Recommended Reorder} = \max\Big(0,\; (\text{Lead Time Demand} + \text{Forecast}_{7d} + \text{Safety Stock}) - \text{Current Stock}\Big)$$
- **The Necromancer's Diagnostic**: Plain-English AI explanation breaking down depletion date, lead-time emergency risks, and peak forecasted day.

### 4. ⚠️ Smart Alerts & Anomaly Spikes
- **Critical Stockout Alerts**: Immediate red warnings when inventory reaches 0.
- **Low-Stock Warnings**: Amber alerts when current stock dips below `min_stock_level`.
- **Unusual Consumption Spikes**: Detects usage exceeding $Z > 2.0$ or $2.5\times$ rolling average; tags root causes like *"🔥 Supernatural Demand Surge / Blood Moon Convergence"*.
- **One-Click Reorder Action**: Instant replenishment button directly on alert cards.

### 5. 📜 Grimoire Reports & CSV Export
- Audit tables for Category Asset Valuation and 30-day consumption histories.
- One-click CSV export:
  - 📄 `nightstock_inventory_YYYYMMDD.csv`
  - 📜 `nightstock_consumption_logs_YYYYMMDD.csv`
  - 🔮 `nightstock_demand_forecast_YYYYMMDD.csv`

### 6. ⚡ Live Hackathon Demo Cockpit
Built specifically for presentations:
- **🧪 Inject Supernatural Spike**: Fires an immediate $3.8\times$ surge to trigger the anomaly detector live in front of judges!
- **⏩ Advance 1 Day**: Advances the clock and logs automated overnight demand.
- **🔄 Summon Fresh Stock**: Instantly resets and reseeds 15 realistic Halloween items with 450 historical logs.
- **📋 3-Minute Pitch Cheatsheet**: In-app modal with turn-by-turn speaker lines for all 3 team members.

---

## 🏰 Architectural Directory Layout

```
nightstock/
├── backend/
│   ├── __init__.py
│   ├── database.py       # SQLite connection, schemas, indexes, and row converters
│   ├── models.py         # Pydantic data schemas for API requests & responses
│   ├── ml_engine.py      # Ridge regression, EWMA forecasting, Z-score spike detector & diagnostics
│   ├── seed_data.py      # 15 Halloween items + 30 days of consumption logs + initial alerts
│   └── api.py            # FastAPI REST routes (CRUD, predictions, alerts, CSV export, demo controls)
├── static/
│   ├── index.html        # Single Page Application dashboard
│   ├── css/
│   │   └── nightstock.css# Gothic-cyberpunk styles (#07040D void, neon orange, toxic green, purple)
│   └── js/
│       ├── app.js        # State controller, API client, live filters, modals, toasts
│       ├── charts.js     # Chart.js configs (7D forecast curve with 95% CI bands, velocity bars, donut)
│       ├── sounds.js     # Web Audio API procedural sound synthesizer (bubbles, chirps, alerts)
│       └── bats.js       # Background HTML5 canvas with flying bat silhouettes & floating embers
├── main.py               # FastAPI server application & static mounting
├── requirements.txt      # Python dependencies
├── run.py                # Beginner-friendly one-click launcher
├── run.sh                # Unix launch script
├── HACKATHON_PITCH.md    # 3-minute judge presentation script & role assignment
└── README.md             # Complete project documentation
```

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the Single Page Application UI |
| `GET` | `/api/dashboard/stats` | Dashboard KPIs, health score, category & stock breakdowns |
| `GET` | `/api/products` | Filterable list of products (query by `category`, `status`, `search`) |
| `GET` | `/api/products/{id}` | Product details, recent 30-day consumption logs, and forecast |
| `POST` | `/api/products` | Create a new reagent |
| `PUT` | `/api/products/{id}` | Update reagent attributes |
| `DELETE` | `/api/products/{id}` | Delete reagent and cascade records |
| `POST` | `/api/products/{id}/adjust-stock` | Quick incremental stock adjustment (`+` / `-`) |
| `POST` | `/api/consumption` | Record consumption, deduct stock, evaluate for anomaly spikes |
| `GET` | `/api/consumption/logs` | Historical consumption records |
| `GET` | `/api/predictions/all` | 7-day demand predictions for all items |
| `GET` | `/api/predictions/{id}` | Granular prediction, daily forecast bounds, and text diagnostic |
| `GET` | `/api/alerts` | Active notifications (out of stock, low stock, spikes) |
| `POST` | `/api/alerts/{id}/acknowledge` | Dismiss an alert |
| `POST` | `/api/alerts/acknowledge-all` | Dismiss all alerts |
| `GET` | `/api/reports/summary` | Financial audit & 30-day consumption report |
| `GET` | `/api/reports/export-csv` | Download CSV (`report_type=products\|consumption\|predictions`) |
| `POST` | `/api/demo/simulate-spike` | **Live Demo:** Injects immediate demand spike and triggers alert |
| `POST` | `/api/demo/simulate-day` | **Live Demo:** Advances calendar by 1 day |
| `POST` | `/api/demo/seed` | **Live Demo:** Resets database with fresh demo data |

---

## 👥 Hackathon Team Presentation Roles

- **Member 1 (Product & Business Lead):** The pitch hook, retail/supply chain problem, \$1.75T loss stat, and NIGHTSTOCK brand introduction.
- **Member 2 (Full-Stack Engineer):** Dashboard tour, category breakdown, real-time stock stepper update, and live consumption logging.
- **Member 3 (AI & Machine Learning Engineer):** Scikit-Learn Ridge model, $R^2$ accuracy, 7-day forecast chart with confidence intervals, live spike injection demo, and CSV export.

*(Read [HACKATHON_PITCH.md](HACKATHON_PITCH.md) for the complete script!)*

---

## 📜 License
MIT License. Created with 🎃 by Team NIGHTSTOCK.
