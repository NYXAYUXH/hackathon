# 🎃 NIGHTSTOCK — Hackathon Pitch Deck & Live Demo Script
> **Brand:** NIGHTSTOCK  
> **Tagline:** The Inventory of the Damned  
> **Problem Statement:** Smart Inventory & Demand Prediction  
> **Format:** 3-Minute College Hackathon Judge Presentation  
> **Team Size:** 3 Members  

---

## 👥 3-Member Role Distribution

| Role | Team Member | Primary Responsibility | Focus Area |
| :--- | :--- | :--- | :--- |
| **Speaker 1** | **Product & Business Lead** | Problem statement, value proposition, theme & brand hook | Minutes 0:00 – 1:00 |
| **Speaker 2** | **Full-Stack Operations** | Live dashboard demo, real-time stock adjustments, consumption logging | Minutes 1:00 – 2:00 |
| **Speaker 3** | **AI & Prediction Engineer** | Scikit-Learn ML engine, 7-day forecast confidence bounds, spike anomaly detection | Minutes 2:00 – 3:00 |

---

## ⏱️ Minute-by-Minute Pitch Script

### ⏱️ Minute 0:00 – 1:00: The Hook & Business Problem (Speaker 1)

> **Speaker 1:**  
> *"Good morning judges! Every year, retail businesses and hospital supply chains lose over **\$1.75 Trillion** due to inventory miscalculations. Too little stock leads to catastrophic stockouts and lost revenue. Too much stock ties up working capital and causes inventory to spoil or expire.*  
>  
> *To solve this, we built **NIGHTSTOCK — The Inventory of the Damned**. We took enterprise inventory management and wrapped it in a high-octane Halloween cyberpunk dashboard that demonstrates smart inventory tracking, anomaly detection, and automated demand prediction.*  
>  
> *Rather than a bland spreadsheet, our platform empowers inventory managers with real-time health indicators, automated stockout warnings, and machine-learning predictions."*

*(Speaker 1 gestures to Speaker 2 to drive the live screen)*

---

### ⏱️ Minute 1:00 – 2:00: Live Inventory Operations (Speaker 2)

> **Speaker 2:**  
> *"Let's step into The Crypt. Here on our **Dashboard**, you can see our key real-time metrics:*
> - *Total inventory valuation calculated dynamically at \$18,723.*
> - *Low-stock alerts and critical stockouts.*
> - *Our **Crypt Vitality Index**, which statistically scores overall inventory health.*
>  
> *Now let's switch to the **Inventory Crypt** tab. Notice the responsive search and category filters. Let's look at `Vampire Blood Elixir`. With our quick-adjustment steppers, we can adjust stock up or down with instant SQLite persistence and no page reloads.*
>  
> *When workers brew a batch or dispense reagents, they click **🧪 Log Consumption**. Let me record 6 vials used for 'Midnight Ritual Demand'. Instantly, the stock updates, the inventory health recalculates, and the audit trail is recorded."*

*(Speaker 2 clicks the 'Forecast' button on Vampire Blood Elixir and passes to Speaker 3)*

---

### ⏱️ Minute 2:00 – 3:00: The AI Demand Prediction Engine (Speaker 3)

> **Speaker 3:**  
> *"Here is the true brain of NIGHTSTOCK: our **Demand Prediction Engine**.*  
>  
> *Unlike projects that fake deep learning with random numbers, NIGHTSTOCK uses a **transparent, production-grade Machine Learning pipeline** built with Scikit-Learn and statistical time-series forecasting.*
>  
> *We train a **Ridge Regression model** on 30 days of historical ritual consumption, using engineered features including day-of-week seasonality, 7-day rolling means, and lag indicators. Notice the **$R^2$ accuracy score** and the **95% Confidence Bounds** plotted on this interactive Chart.js visualization.*
>  
> *Best of all, our engine translates the math into **The Necromancer's Diagnostic**: a plain-English explanation explaining exactly when the product will deplete (0.6 days!), lead time risk, and the exact recommended reorder batch size to maintain a 95% service level.*
>  
> *Now watch this live: if I click **🧪 Inject Supernatural Spike** from our Demo Cockpit..."*  
> *(Speaker 3 clicks the demo button — an alert chimes, a purple spike anomaly appears)*  
>  
> *"...our engine immediately performs a **Z-Score and IQR test**, flags the 3.8x surge as an anomaly, and generates an emergency warning on the Smart Alerts dashboard!*
>  
> *Finally, our **Grimoire Reports** tab lets managers export full audit logs and predictions to CSV with a single click.*
>  
> *Thank you judges! We are Team NIGHTSTOCK, and we're ready for your questions!"*

---

## 🎯 Anticipated Judge Q&A & Winning Answers

### Q1: *"How does your demand prediction model work under the hood?"*
> **Answer:**  
> *"We use a dual-tier approach:  
> 1. For products with sufficient history ($\ge 12$ days), we train a **Scikit-Learn Ridge Regression model** on feature vectors composed of time step $t$, $\text{lag}_1$, $\text{lag}_7$, 7-day rolling mean, and one-hot encoded day-of-week seasonality to capture weekend ritual spikes.  
> 2. For items with sparse data, it cleanly falls back to **7-Day Exponentially Weighted Moving Average (EWMA)** with a calculated day-of-week seasonality index.  
> 3. Prediction intervals are calculated using residual standard errors ($1.645 \times \text{std}$) to provide actionable 95% confidence bands."*

### Q2: *"How do you detect consumption anomalies and spikes?"*
> **Answer:**  
> *"We compute the rolling Z-Score $Z = \frac{x_i - \mu}{\sigma}$ against historical daily demand. Any consumption event with $Z > 2.0$ or that exceeds $2.5\times$ the 7-day rolling mean is flagged as a statistical anomaly, triggering an alert with root-cause reason tracking."*

### Q3: *"How is the recommended reorder quantity calculated?"*
> **Answer:**  
> *"We use the standard industrial inventory formula:  
> $$\text{Safety Stock} = Z_{0.95} \times \sqrt{\text{Lead Time}} \times \sigma_{\text{daily}}$$  
> $$\text{Recommended Reorder} = \max\Big(0,\; (\text{Lead Time Demand} + \text{Forecast}_{7d} + \text{Safety Stock}) - \text{Current Stock}\Big)$$  
> This ensures the business never stocks out while supplier shipments are in transit."*

### Q4: *"Why SQLite instead of PostgreSQL or MongoDB?"*
> **Answer:**  
> *"For a hackathon and edge deployment, SQLite requires zero setup, zero cloud credentials, has microsecond read times, supports full ACID transactions and Foreign Key cascade constraints, and ensures any judge or evaluator can run the entire project with zero external database configuration."*

---

## 🏆 Checklist for Demo Day
- [ ] Sound enabled or checked beforehand (use the toggle button in the sidebar).
- [ ] Browser window zoomed to 100% or 110% on high-DPI displays.
- [ ] Have the **Demo Cockpit** tab open or use the top demo strip to trigger the live spike during minute 2:40!
