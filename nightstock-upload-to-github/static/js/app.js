/**
 * NIGHTSTOCK Main Application Controller
 * Modern reactive Single Page Architecture for College Hackathon Demonstrations.
 */

const API_BASE = '/api';

const App = {
    state: {
        activeTab: 'dashboard',
        products: [],
        categories: [],
        alerts: [],
        stats: null,
        selectedPredictionId: null,
        currentUser: null,
        calendarYear: new Date().getFullYear(),
        calendarMonth: new Date().getMonth(),
        calendarEvents: { shipments: [], depletions: [] },
        filters: {
            category: 'ALL',
            status: 'ALL',
            search: ''
        }
    },

    async init() {
        console.log("🎃 NIGHTSTOCK Engine Initialized.");
        this.initAuth();
        this.bindEvents();
        await this.loadDashboard();
        await this.loadAlertsCount();
    },

    bindEvents() {
        // Navigation clicks
        document.querySelectorAll('.nav-item button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
        });

        // Search and Filters
        const searchInput = document.getElementById('search-products');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.filters.search = e.target.value.toLowerCase();
                this.renderInventoryTable();
            });
        }

        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.state.filters.status = e.target.value;
                this.renderInventoryTable();
            });
        }

        // Sound toggle
        const soundBtn = document.getElementById('toggle-sound-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const enabled = window.soundEngine.toggle();
                soundBtn.innerHTML = enabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
                soundBtn.classList.toggle('active', enabled);
                this.showToast(enabled ? "🎃 Atmospheric sounds unmuted!" : "🔇 Audio muted.", "info");
            });
        }

        // Ambient Visual Effects toggle
        const fxBtn = document.getElementById('toggle-fx-btn');
        if (fxBtn) {
            const isEnabled = window.isAmbientFXEnabled ? window.isAmbientFXEnabled() : true;
            fxBtn.innerHTML = isEnabled ? '✨ FX: ON' : '✨ FX: OFF';
            fxBtn.classList.toggle('active', isEnabled);
            fxBtn.addEventListener('click', () => {
                if (window.toggleAmbientFX) {
                    const active = window.toggleAmbientFX();
                    fxBtn.innerHTML = active ? '✨ FX: ON' : '✨ FX: OFF';
                    fxBtn.classList.toggle('active', active);
                    this.showToast(active ? "✨ Ambient effects enabled." : "⚡ Minimal performance mode (Animations OFF).", "info");
                }
            });
        }

        // Mobile sidebar toggle
        const mobileToggle = document.getElementById('mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    },

    async switchTab(tabId) {
        this.state.activeTab = tabId;

        // Update nav UI
        document.querySelectorAll('.nav-item').forEach(item => {
            const btn = item.querySelector('button');
            if (btn && btn.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Hide all views, show active
        document.querySelectorAll('.tab-view').forEach(view => {
            view.style.display = 'none';
        });

        const activeView = document.getElementById(`view-${tabId}`);
        if (activeView) {
            activeView.style.display = 'block';
        }

        const tabTitles = {
            'dashboard': '📊 Inventory & Prediction Dashboard',
            'inventory': '📦 Inventory Crypt & Stock Management',
            'predictions': '🔮 7-Day Demand Prediction & Restock Horizon',
            'alerts': '⚠️ Smart Alerts & Anomaly Monitor',
            'reports': '📜 Grimoire Reports & CSV Audit Logs',
            'calendar': '📅 Delivery & Depletion Calendar',
            'demosandbox': '⚡ Hackathon Demo Cockpit & Scenarios'
        };
        const titleEl = document.getElementById('topbar-title');
        if (titleEl && tabTitles[tabId]) titleEl.textContent = tabTitles[tabId];

        // Play navigation sound
        window.soundEngine.playBatChirp();

        // Close mobile drawer if open
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('open');

        // Load data specific to tab
        if (tabId === 'dashboard') await this.loadDashboard();
        else if (tabId === 'inventory') await this.loadInventory();
        else if (tabId === 'predictions') await this.loadPredictionsView();
        else if (tabId === 'alerts') await this.loadAlertsView();
        else if (tabId === 'reports') await this.loadReportsView();
        else if (tabId === 'calendar') await this.loadCalendarView();

        if (window.refreshCardTilt) setTimeout(window.refreshCardTilt, 60);
    },

    // -------------------------------------------------------------
    // DASHBOARD
    // -------------------------------------------------------------
    async loadDashboard() {
        try {
            const res = await fetch(`${API_BASE}/dashboard/stats`);
            const stats = await res.json();
            this.state.stats = stats;

            // Toggle empty manual testing banner
            const emptyBanner = document.getElementById('dashboard-empty-banner');
            if (emptyBanner) {
                emptyBanner.style.display = stats.total_products === 0 ? 'block' : 'none';
            }

            // Update KPI cards with animated roll-up
            if (window.animateValue) {
                window.animateValue('stat-total-products', 0, stats.total_products);
                window.animateValue('stat-low-stock', 0, stats.low_stock_count);
                window.animateValue('stat-out-stock', 0, stats.out_of_stock_count);
                window.animateValue('stat-today-consumption', 0, Math.round(stats.today_consumption));
                window.animateValue('stat-predicted-7d', 0, Math.round(stats.predicted_7d_consumption));
            } else {
                document.getElementById('stat-total-products').textContent = stats.total_products;
                document.getElementById('stat-low-stock').textContent = stats.low_stock_count;
                document.getElementById('stat-out-stock').textContent = stats.out_of_stock_count;
                document.getElementById('stat-today-consumption').textContent = `${stats.today_consumption}`;
                document.getElementById('stat-predicted-7d').textContent = `${stats.predicted_7d_consumption}`;
            }
            document.getElementById('stat-inventory-val').textContent = `$${stats.total_inventory_value.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            
            // Health Score Meter
            const healthScore = stats.inventory_health_score;
            document.getElementById('health-score-val').textContent = `${healthScore}%`;
            const healthBar = document.getElementById('health-bar-fill');
            if (healthBar) healthBar.style.width = `${healthScore}%`;

            // Urgent alerts count badge
            const urgentBadge = document.getElementById('urgent-alerts-badge');
            if (urgentBadge) {
                urgentBadge.textContent = stats.urgent_alerts_count;
                urgentBadge.style.display = stats.urgent_alerts_count > 0 ? 'inline-block' : 'none';
            }

            // Render Charts
            window.charts.renderCategoryDonut('category-chart', stats.category_breakdown);

            // Fetch top products for Stock Velocity comparison chart
            const pRes = await fetch(`${API_BASE}/predictions/all`);
            const preds = await pRes.json();
            window.charts.renderStockVelocityChart('velocity-chart', preds);

            // Refresh 3D card tilt
            if (window.refreshCardTilt) window.refreshCardTilt();

        } catch (err) {
            console.error("Failed to load dashboard stats:", err);
        }
    },

    async loadAlertsCount() {
        try {
            const res = await fetch(`${API_BASE}/alerts?acknowledged=0`);
            const alerts = await res.json();
            this.state.alerts = alerts;
            const badge = document.getElementById('nav-alerts-badge');
            if (badge) {
                badge.textContent = alerts.length;
                badge.style.display = alerts.length > 0 ? 'inline-block' : 'none';
            }
        } catch (e) {
            console.error(e);
        }
    },

    // -------------------------------------------------------------
    // INVENTORY MANAGEMENT
    // -------------------------------------------------------------
    async loadInventory() {
        try {
            const res = await fetch(`${API_BASE}/products`);
            const products = await res.json();
            this.state.products = products;

            // Extract unique categories
            const cats = Array.from(new Set(products.map(p => p.category)));
            this.state.categories = cats;
            this.renderCategoryPills(cats);
            this.renderInventoryTable();
        } catch (err) {
            console.error("Failed to load products:", err);
            this.showToast("Failed to summon inventory records.", "error");
        }
    },

    renderCategoryPills(categories) {
        const container = document.getElementById('category-pills-container');
        if (!container) return;

        let html = `<button class="pill-btn ${this.state.filters.category === 'ALL' ? 'active' : ''}" onclick="App.setCategoryFilter('ALL')">All Reagents (${this.state.products.length})</button>`;
        categories.forEach(cat => {
            const count = this.state.products.filter(p => p.category === cat).length;
            const isActive = this.state.filters.category === cat;
            html += `<button class="pill-btn ${isActive ? 'active' : ''}" onclick="App.setCategoryFilter('${cat}')">${cat} (${count})</button>`;
        });
        container.innerHTML = html;
    },

    setCategoryFilter(cat) {
        this.state.filters.category = cat;
        this.renderCategoryPills(this.state.categories);
        this.renderInventoryTable();
    },

    renderInventoryTable() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        const { search, category, status } = this.state.filters;

        const filtered = this.state.products.filter(p => {
            // Category filter
            if (category !== 'ALL' && p.category !== category) return false;
            // Status filter
            if (status !== 'ALL' && p.stock_status !== status) return false;
            // Search filter
            if (search) {
                const term = search.toLowerCase();
                return p.name.toLowerCase().includes(term) ||
                       p.sku.toLowerCase().includes(term) ||
                       p.supplier.toLowerCase().includes(term);
            }
            return true;
        });

        if (this.state.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 48px; color: var(--text-secondary);">
                        <div style="font-size: 2.5rem; margin-bottom: 10px;">🧪</div>
                        <h4 style="color: #fff; margin-bottom: 6px; font-size: 1.1rem;">Your Crypt is 100% Clean & Empty</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                            Zero mock data loaded. Start manual testing by adding your first real product!
                        </p>
                        <button class="btn-primary" onclick="App.openAddProductModal()">+ Summon Your First Reagent</button>
                    </td>
                </tr>
            `;
            return;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);">
                        👻 No cursed reagents match your filters. Try adjusting your search query!
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filtered.forEach(p => {
            let statusBadge = '';
            if (p.stock_status === 'OUT_OF_STOCK') {
                statusBadge = `<span class="status-badge badge-out">💀 Out of Stock</span>`;
            } else if (p.stock_status === 'LOW_STOCK') {
                statusBadge = `<span class="status-badge badge-low">🟡 Low Stock</span>`;
            } else {
                statusBadge = `<span class="status-badge badge-healthy">🟢 Healthy</span>`;
            }

            const spookStars = '🦇'.repeat(p.spookiness_level || 3);

            html += `
                <tr id="prod-row-${p.id}">
                    <td>
                        <span style="font-family: monospace; font-size: 0.8rem; color: var(--neon-purple);">${p.sku}</span>
                    </td>
                    <td>
                        <strong style="color: #ffffff; cursor: pointer;" onclick="App.viewPredictionForProduct(${p.id})">${p.name}</strong>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">${p.supplier}</div>
                    </td>
                    <td>
                        <span style="font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 6px;">${p.category}</span>
                    </td>
                    <td>
                        <div class="stock-stepper">
                            <button onclick="App.adjustStockQuick(${p.id}, -1)">−</button>
                            <span class="stock-stepper-val" id="stock-val-${p.id}">${p.current_stock}</span>
                            <button onclick="App.adjustStockQuick(${p.id}, 1)">+</button>
                        </div>
                        <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 6px;">${p.unit}</span>
                    </td>
                    <td>
                        <span style="color: var(--text-secondary);">${p.min_stock_level} ${p.unit}</span>
                    </td>
                    <td>$${p.unit_price.toFixed(2)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display: flex; gap: 6px;">
                            <button class="demo-strip-btn" title="Log Consumption" onclick="App.openLogConsumptionModal(${p.id})">🧪 Log</button>
                            <button class="demo-strip-btn" title="View Demand Prediction" onclick="App.viewPredictionForProduct(${p.id})">🔮 Forecast</button>
                            <button class="demo-strip-btn" title="Edit Reagent" onclick="App.openEditModal(${p.id})">✏️</button>
                            <button class="demo-strip-btn" style="border-color: rgba(255,42,85,0.4); color:#ff4d6d;" title="Banish Reagent" onclick="App.confirmDelete(${p.id})">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    async adjustStockQuick(productId, delta) {
        try {
            const res = await fetch(`${API_BASE}/products/${productId}/adjust-stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adjustment: delta,
                    reason: delta > 0 ? "Crypt Restock Batch" : "Ritual Dispense",
                    logged_by: "Quick Adjuster"
                })
            });

            if (res.ok) {
                const data = await res.json();
                const stockValElem = document.getElementById(`stock-val-${productId}`);
                if (stockValElem) stockValElem.textContent = data.new_stock;

                // Update local model
                const prod = this.state.products.find(p => p.id === productId);
                if (prod) {
                    prod.current_stock = data.new_stock;
                    prod.stock_status = data.new_stock === 0 ? 'OUT_OF_STOCK' : (data.new_stock <= prod.min_stock_level ? 'LOW_STOCK' : 'HEALTHY');
                }

                if (delta > 0) {
                    window.soundEngine.playSuccess();
                    if (window.spawnEctoplasmBurst) window.spawnEctoplasmBurst();
                } else {
                    window.soundEngine.playCauldronBubble();
                }

                this.renderInventoryTable();
                this.loadAlertsCount();
            }
        } catch (e) {
            console.error(e);
        }
    },

    // -------------------------------------------------------------
    // MODALS: ADD, EDIT, LOG CONSUMPTION, DELETE
    // -------------------------------------------------------------
    openAddProductModal() {
        document.getElementById('modal-add-product').classList.add('active');
    },

    closeAddProductModal() {
        document.getElementById('modal-add-product').classList.remove('active');
    },

    async handleAddProduct(e) {
        e.preventDefault();
        const form = e.target;
        const payload = {
            sku: form.sku.value,
            name: form.name.value,
            category: form.category.value,
            unit: form.unit.value,
            current_stock: parseFloat(form.current_stock.value),
            min_stock_level: parseFloat(form.min_stock_level.value),
            max_stock_capacity: parseFloat(form.max_stock_capacity.value || 100),
            unit_price: parseFloat(form.unit_price.value),
            lead_time_days: parseInt(form.lead_time_days.value || 3),
            supplier: form.supplier.value || 'Netherworld Crypts',
            spookiness_level: parseInt(form.spookiness_level.value || 3),
            notes: form.notes.value || ''
        };

        try {
            const res = await fetch(`${API_BASE}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                this.closeAddProductModal();
                form.reset();
                this.showToast(`🎉 Summoned '${payload.name}' to the crypt!`, "success");
                window.soundEngine.playSuccess();

                // Crazy victory animations!
                if (window.confetti) {
                    window.confetti({
                        particleCount: 80,
                        spread: 90,
                        origin: { y: 0.6 },
                        colors: ['#ff6a00', '#00ff88', '#b026ff', '#ffd700']
                    });
                }
                if (window.spawnEctoplasmBurst) {
                    window.spawnEctoplasmBurst();
                }

                await this.loadInventory();
                await this.loadDashboard();
            } else {
                const err = await res.json();
                this.showToast(err.detail || "Error summoning product", "error");
            }
        } catch (e) {
            console.error(e);
            this.showToast("Failed to connect to crypt server.", "error");
        }
    },

    openEditModal(productId) {
        const prod = this.state.products.find(p => p.id === productId);
        if (!prod) return;

        const form = document.getElementById('form-edit-product');
        form.product_id.value = prod.id;
        form.name.value = prod.name;
        form.sku.value = prod.sku;
        form.category.value = prod.category;
        form.unit.value = prod.unit;
        form.current_stock.value = prod.current_stock;
        form.min_stock_level.value = prod.min_stock_level;
        form.unit_price.value = prod.unit_price;
        form.lead_time_days.value = prod.lead_time_days;
        form.supplier.value = prod.supplier;

        document.getElementById('modal-edit-product').classList.add('active');
    },

    closeEditModal() {
        document.getElementById('modal-edit-product').classList.remove('active');
    },

    async handleEditProduct(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.product_id.value;
        const payload = {
            sku: form.sku.value,
            name: form.name.value,
            category: form.category.value,
            unit: form.unit.value,
            current_stock: parseFloat(form.current_stock.value),
            min_stock_level: parseFloat(form.min_stock_level.value),
            unit_price: parseFloat(form.unit_price.value),
            lead_time_days: parseInt(form.lead_time_days.value),
            supplier: form.supplier.value
        };

        try {
            const res = await fetch(`${API_BASE}/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                this.closeEditModal();
                this.showToast("Product properties re-inscribed!", "success");
                await this.loadInventory();
                await this.loadDashboard();
            } else {
                const err = await res.json();
                this.showToast(err.detail || "Update failed", "error");
            }
        } catch (e) {
            console.error(e);
        }
    },

    openLogConsumptionModal(productId) {
        const prod = this.state.products.find(p => p.id === productId);
        if (!prod) return;

        const form = document.getElementById('form-log-consumption');
        form.product_id.value = prod.id;
        document.getElementById('log-prod-name').textContent = `${prod.name} (Current: ${prod.current_stock} ${prod.unit})`;
        form.quantity.value = '5';
        document.getElementById('modal-log-consumption').classList.add('active');
    },

    closeLogConsumptionModal() {
        document.getElementById('modal-log-consumption').classList.remove('active');
    },

    async handleLogConsumption(e) {
        e.preventDefault();
        const form = e.target;
        const payload = {
            product_id: parseInt(form.product_id.value),
            quantity: parseFloat(form.quantity.value),
            reason: form.reason.value,
            logged_by: form.logged_by.value
        };

        try {
            const res = await fetch(`${API_BASE}/consumption`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                this.closeLogConsumptionModal();
                window.soundEngine.playCauldronBubble();

                if (data.is_anomaly === 1) {
                    window.soundEngine.playAlert();
                    if (window.triggerLightningFlash) window.triggerLightningFlash();
                    this.showToast(`🦇 UNUSUAL SPIKE DETECTED! ${data.quantity} units logged. Alert spawned!`, "warning");
                } else {
                    this.showToast(`🧪 Logged ritual usage of ${data.quantity} units.`, "success");
                }

                await this.loadInventory();
                await this.loadDashboard();
                await this.loadAlertsCount();
            }
        } catch (e) {
            console.error(e);
        }
    },

    async confirmDelete(productId) {
        const prod = this.state.products.find(p => p.id === productId);
        if (!prod) return;

        if (confirm(`💀 Are you certain you wish to banish '${prod.name}' to the void?`)) {
            try {
                const res = await fetch(`${API_BASE}/products/${productId}`, { method: 'DELETE' });
                if (res.ok) {
                    this.showToast(`Banishment complete: '${prod.name}' has vanished.`, "info");
                    await this.loadInventory();
                    await this.loadDashboard();
                }
            } catch (e) {
                console.error(e);
            }
        }
    },

    // -------------------------------------------------------------
    // DEMAND PREDICTION VIEW
    // -------------------------------------------------------------
    async loadPredictionsView() {
        try {
            // Ensure products are loaded
            if (this.state.products.length === 0) {
                const res = await fetch(`${API_BASE}/products`);
                this.state.products = await res.json();
            }

            if (this.state.products.length === 0) {
                const selector = document.getElementById('prediction-product-select');
                if (selector) selector.innerHTML = '<option value="">(No products in crypt)</option>';
                const exp = document.getElementById('pred-explanation-text');
                if (exp) exp.innerHTML = 'ℹ️ No products registered yet. Please add a product in the <strong>Inventory Crypt</strong> tab first to test demand forecasting!';
                document.getElementById('pred-current-stock').textContent = '0';
                document.getElementById('pred-avg-daily').textContent = '0/day';
                document.getElementById('pred-7d-total').textContent = '0';
                document.getElementById('pred-days-stockout').textContent = 'N/A';
                document.getElementById('pred-reorder-qty').textContent = '0';
                document.getElementById('pred-safety-stock').textContent = '0';
                const grid = document.getElementById('forecast-daily-cards');
                if (grid) grid.innerHTML = '<div style="grid-column: span 7; text-align:center; padding: 20px; color: var(--text-muted);">Awaiting manual products and transactions.</div>';
                return;
            }

            // Populate selector dropdown
            const selector = document.getElementById('prediction-product-select');
            if (selector) {
                selector.innerHTML = this.state.products.map(p => 
                    `<option value="${p.id}" ${p.id === this.state.selectedPredictionId ? 'selected' : ''}>${p.name} (${p.category})</option>`
                ).join('');

                selector.onchange = (e) => {
                    this.state.selectedPredictionId = parseInt(e.target.value);
                    this.renderPredictionDetails(this.state.selectedPredictionId);
                };
            }

            const targetId = this.state.selectedPredictionId || this.state.products[0]?.id;
            if (targetId) {
                this.state.selectedPredictionId = targetId;
                if (selector) selector.value = targetId;
                await this.renderPredictionDetails(targetId);
            }
        } catch (e) {
            console.error(e);
        }
    },

    async viewPredictionForProduct(productId) {
        this.state.selectedPredictionId = productId;
        await this.switchTab('predictions');
    },

    gazeIntoCrystalBall() {
        if (window.soundEngine) window.soundEngine.playCauldronBubble();
        window.spawnEctoplasmBurst();
        const curProd = this.state.products.find(p => p.id === this.state.selectedPredictionId);
        const name = curProd ? curProd.name : "your inventory";
        this.showToast(`🔮 Crystal Ball reveals: Gaze active for ${name}!`, "info");
    },

    async renderPredictionDetails(productId) {
        try {
            const [predRes, prodRes] = await Promise.all([
                fetch(`${API_BASE}/predictions/${productId}`),
                fetch(`${API_BASE}/products/${productId}`)
            ]);

            const pred = await predRes.json();
            const prodDetail = await prodRes.json();

            // Model badge
            const badge = document.getElementById('pred-model-badge');
            if (badge) {
                badge.textContent = `⚙️ Model: ${pred.forecast_model_used}`;
                badge.className = pred.forecast_model_used.includes('Ridge') ? 'status-badge badge-healthy' : 'status-badge badge-spike';
            }

            // Stats row
            document.getElementById('pred-current-stock').textContent = `${pred.current_stock} ${pred.unit}`;
            document.getElementById('pred-avg-daily').textContent = `${pred.avg_daily_consumption} ${pred.unit}/day`;
            document.getElementById('pred-7d-total').textContent = `${pred.predicted_7d_total} ${pred.unit}`;
            
            // Update Crystal Ball Orb Reading & Status Pill
            const orbReading = document.getElementById('orb-horizon-val');
            const orbStatus = document.getElementById('orb-status-pill');
            const crystalName = document.getElementById('crystal-item-name');
            const crystalSub = document.getElementById('crystal-item-sub');

            if (crystalName) crystalName.textContent = `${prodDetail.name} (${prodDetail.category})`;
            if (crystalSub) crystalSub.textContent = `Supplier: ${prodDetail.supplier} · SKU: ${prodDetail.sku} · Buffer: ${pred.safety_stock_recommended} ${pred.unit}`;

            if (orbReading) {
                if (pred.days_until_stockout !== null) {
                    orbReading.textContent = `${pred.days_until_stockout} Days`;
                } else {
                    orbReading.textContent = '>30 Days';
                }
            }

            if (orbStatus) {
                if (pred.days_until_stockout !== null && pred.days_until_stockout <= 3) {
                    orbStatus.innerHTML = `● 🔴 Stockout Imminent (~${pred.days_until_stockout}d)`;
                    orbStatus.style.borderColor = 'var(--neon-red)';
                    orbStatus.style.color = '#f87171';
                } else if (pred.days_until_stockout !== null && pred.days_until_stockout <= 7) {
                    orbStatus.innerHTML = `● 🟡 Reorder Soon (~${pred.days_until_stockout}d)`;
                    orbStatus.style.borderColor = 'var(--neon-orange)';
                    orbStatus.style.color = '#fb923c';
                } else {
                    orbStatus.innerHTML = `● 🟢 Horizon Safe (>7d)`;
                    orbStatus.style.borderColor = 'var(--neon-green)';
                    orbStatus.style.color = '#4ade80';
                }
            }

            const daysElem = document.getElementById('pred-days-stockout');
            if (daysElem) {
                if (pred.days_until_stockout !== null) {
                    daysElem.textContent = `~${pred.days_until_stockout} days`;
                    daysElem.style.color = pred.days_until_stockout <= 3 ? 'var(--neon-red)' : 'var(--neon-green)';
                } else {
                    daysElem.textContent = 'Stable (>30d)';
                    daysElem.style.color = 'var(--neon-green)';
                }
            }

            // Reorder recommendation
            document.getElementById('pred-reorder-qty').textContent = `${pred.recommended_reorder_qty} ${pred.unit}`;
            document.getElementById('pred-safety-stock').textContent = `${pred.safety_stock_recommended} ${pred.unit}`;

            // Anomaly indicator
            const spikeElem = document.getElementById('pred-spike-indicator');
            if (spikeElem) {
                if (pred.anomaly_spike_detected) {
                    spikeElem.innerHTML = `<span class="status-badge badge-spike">🦇 ${pred.spike_count_last_14d} Spikes Detected (Last 14d)</span>`;
                } else {
                    spikeElem.innerHTML = `<span class="status-badge badge-healthy">🟢 No Recent Spikes</span>`;
                }
            }

            // Explanation box
            document.getElementById('pred-explanation-text').textContent = pred.explanation;

            // 7-Day Forecast Grid
            const grid = document.getElementById('forecast-daily-cards');
            if (grid) {
                // Find peak day
                const peakQty = Math.max(...pred.daily_forecast.map(d => d.predicted_quantity));

                grid.innerHTML = pred.daily_forecast.map(d => {
                    const isPeak = d.predicted_quantity === peakQty;
                    return `
                        <div class="forecast-day-card ${isPeak ? 'peak-day' : ''}">
                            <div class="forecast-day-name">${d.day_name} ${isPeak ? '⚡' : ''}</div>
                            <div class="forecast-day-date">${d.date.slice(5)}</div>
                            <div class="forecast-day-qty">${d.predicted_quantity}</div>
                            <div class="forecast-day-bounds">${d.lower_bound} – ${d.upper_bound} ${pred.unit}</div>
                        </div>
                    `;
                }).join('');
            }

            // Render forecast chart
            window.charts.renderForecastChart('forecast-main-chart', pred, prodDetail.recent_logs);

        } catch (e) {
            console.error(e);
        }
    },

    // -------------------------------------------------------------
    // SMART ALERTS
    // -------------------------------------------------------------
    async loadAlertsView() {
        try {
            const res = await fetch(`${API_BASE}/alerts?acknowledged=0`);
            const alerts = await res.json();
            this.state.alerts = alerts;

            const list = document.getElementById('alerts-container');
            if (!list) return;

            if (alerts.length === 0) {
                list.innerHTML = `
                    <div class="ns-card" style="text-align: center; padding: 48px;">
                        <span style="font-size: 3rem;">🕊️</span>
                        <h3 style="margin-top: 12px; color: var(--neon-green);">All Spirits Are Resting Peacefully</h3>
                        <p style="color: var(--text-secondary); margin-top: 6px;">No urgent stockouts, low-stock warnings, or consumption anomalies active.</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = alerts.map(a => {
                const icon = a.type === 'OUT_OF_STOCK' ? '💀' : (a.type === 'SPIKE_DETECTED' ? '🦇' : '🟡');
                return `
                    <div class="alert-item severity-${a.severity}" id="alert-card-${a.id}">
                        <div style="font-size: 1.8rem;">${icon}</div>
                        <div class="alert-content" style="flex:1;">
                            <h4>${a.message}</h4>
                            <p>Recorded at: ${a.created_at.slice(0, 16).replace('T', ' ')} • Severity: <strong style="text-transform:uppercase;">${a.severity}</strong></p>
                        </div>
                        <div class="alert-actions">
                            ${a.product_id ? `<button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="App.quickRestockFromAlert(${a.product_id})">📦 Reorder</button>` : ''}
                            <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="App.dismissAlert(${a.id})">Dismiss</button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error(e);
        }
    },

    async dismissAlert(alertId) {
        try {
            const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
            if (res.ok) {
                const card = document.getElementById(`alert-card-${alertId}`);
                if (card) {
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(20px)';
                    setTimeout(() => card.remove(), 250);
                }
                await this.loadAlertsCount();
                this.showToast("Alert spirit dismissed.", "info");
            }
        } catch (e) {
            console.error(e);
        }
    },

    async dismissAllAlerts() {
        try {
            const res = await fetch(`${API_BASE}/alerts/acknowledge-all`, { method: 'POST' });
            if (res.ok) {
                this.showToast("All haunting alerts silenced.", "info");
                await this.loadAlertsView();
                await this.loadAlertsCount();
            }
        } catch (e) {
            console.error(e);
        }
    },

    quickRestockFromAlert(productId) {
        const prod = this.state.products.find(p => p.id === productId);
        if (prod) {
            this.adjustStockQuick(productId, Math.max(10, Math.round(prod.min_stock_level * 1.5)));
            this.showToast(`Restocked ${prod.name}! Stock replenishment registered.`, "success");
        }
    },

    // -------------------------------------------------------------
    // REPORTS & CSV EXPORT
    // -------------------------------------------------------------
    async loadReportsView() {
        try {
            const res = await fetch(`${API_BASE}/reports/summary`);
            const summary = await res.json();

            // Category Valuation Table
            const catTbody = document.getElementById('report-category-tbody');
            if (catTbody) {
                if (!summary.category_valuation || summary.category_valuation.length === 0) {
                    catTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:28px; color:var(--text-muted);">No inventory records registered yet.</td></tr>';
                } else {
                    catTbody.innerHTML = summary.category_valuation.map(c => `
                        <tr>
                            <td><strong>${c.category}</strong></td>
                            <td>${c.item_count} items</td>
                            <td>${c.total_units} units</td>
                            <td>$${c.category_value.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    `).join('');
                }
            }

            // Top Consumption Table
            const conTbody = document.getElementById('report-consumption-tbody');
            if (conTbody) {
                if (!summary.consumption_breakdown || summary.consumption_breakdown.length === 0) {
                    conTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:28px; color:var(--text-muted);">No consumption transactions recorded yet.</td></tr>';
                } else {
                    conTbody.innerHTML = summary.consumption_breakdown.slice(0, 10).map(i => `
                        <tr>
                            <td><strong>${i.name}</strong></td>
                            <td><span style="font-size:0.75rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${i.category}</span></td>
                            <td>${i.total_consumed} ${i.unit}</td>
                            <td>${i.avg_daily.toFixed(1)} ${i.unit}</td>
                            <td>${i.peak_daily} ${i.unit}</td>
                            <td>${i.spike_events > 0 ? `<span style="color:var(--neon-purple);">🦇 ${i.spike_events}</span>` : '0'}</td>
                        </tr>
                    `).join('');
                }
            }

        } catch (e) {
            console.error(e);
        }
    },

    downloadCsv(type) {
        window.soundEngine.playBatChirp();
        window.location.href = `${API_BASE}/reports/export-csv?report_type=${type}`;
        this.showToast(`📥 Exporting ${type.toUpperCase()} Grimoire to CSV...`, "success");
    },

    // -------------------------------------------------------------
    // REAL DATA IMPORT & MANAGEMENT (NO MOCK DATA)
    // -------------------------------------------------------------
    openCsvImportModal() {
        const modal = document.getElementById('modal-csv-import');
        if (modal) modal.classList.add('active');
    },

    closeCsvImportModal() {
        const modal = document.getElementById('modal-csv-import');
        if (modal) modal.classList.remove('active');
    },

    async importInventoryFromText(csvText) {
        if (!csvText || !csvText.trim()) {
            this.showToast("CSV content is empty.", "error");
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/data/import-inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv_content: csvText })
            });
            const data = await res.json();
            if (res.ok) {
                this.showToast(`✅ Real inventory imported: ${data.imported} new items, ${data.updated} updated!`, "success");
                window.soundEngine.playSuccess();
                this.closeCsvImportModal();
                await this.loadInventory();
                await this.loadDashboard();
            } else {
                this.showToast(data.detail || "Error importing inventory CSV", "error");
            }
        } catch (e) {
            console.error(e);
            this.showToast("Failed to upload inventory CSV.", "error");
        }
    },

    async importConsumptionFromText(csvText) {
        if (!csvText || !csvText.trim()) {
            this.showToast("CSV content is empty.", "error");
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/data/import-consumption`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv_content: csvText })
            });
            const data = await res.json();
            if (res.ok) {
                this.showToast(`✅ Real transactions imported: ${data.transactions_logged} logs recorded!`, "success");
                window.soundEngine.playSuccess();
                this.closeCsvImportModal();
                await this.loadInventory();
                await this.loadDashboard();
                await this.loadAlertsCount();
                if (this.state.activeTab === 'predictions') {
                    await this.loadPredictionsView();
                }
            } else {
                this.showToast(data.detail || "Error importing consumption CSV", "error");
            }
        } catch (e) {
            console.error(e);
            this.showToast("Failed to upload consumption CSV.", "error");
        }
    },

    handleInventoryFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.importInventoryFromText(e.target.result);
        };
        reader.readAsText(file);
    },

    handleConsumptionFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.importConsumptionFromText(e.target.result);
        };
        reader.readAsText(file);
    },

    async loadRealStoreDataset() {
        if (confirm("📂 Load authentic real-world retail store dataset (15 real products & 450 actual sales transactions)?")) {
            try {
                const res = await fetch(`${API_BASE}/data/load-real-dataset`, { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    window.soundEngine.playSuccess();
                    this.showToast(`✅ Loaded authentic real retail dataset: ${data.products_count} products, ${data.consumption_logs_count} transactions.`, "success");
                    this.closeCsvImportModal();
                    await this.loadDashboard();
                    await this.loadInventory();
                    await this.loadAlertsCount();
                }
            } catch (e) {
                console.error(e);
                this.showToast("Failed to load real dataset.", "error");
            }
        }
    },

    async clearDatabaseBlankSlate() {
        if (confirm("⚠️ WARNING: This will completely wipe all inventory, consumption logs, and alerts so you can start with a 100% clean blank slate. Continue?")) {
            try {
                const res = await fetch(`${API_BASE}/data/clear-database`, { method: 'POST' });
                if (res.ok) {
                    this.showToast("🧹 All records wiped! You now have a clean blank slate.", "info");
                    this.closeCsvImportModal();
                    await this.loadDashboard();
                    await this.loadInventory();
                    await this.loadAlertsCount();
                }
            } catch (e) {
                console.error(e);
                this.showToast("Failed to wipe database.", "error");
            }
        }
    },

    // -------------------------------------------------------------
    // HACKATHON LIVE DEMO TOOLS
    // -------------------------------------------------------------
    async demoInjectSpike() {
        try {
            // Pick a product to inject spike on
            const targetId = this.state.selectedPredictionId || (this.state.products[0]?.id || 1);
            const res = await fetch(`${API_BASE}/demo/simulate-spike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: targetId,
                    multiplier: 3.5,
                    reason: "🔥 Regional High-Demand Surge Event"
                })
            });

            if (res.ok) {
                const data = await res.json();
                window.soundEngine.playAlert();
                if (window.triggerLightningFlash) window.triggerLightningFlash();
                this.showToast(data.message, "warning");

                // Refresh state
                await this.loadDashboard();
                await this.loadInventory();
                await this.loadAlertsCount();
                if (this.state.activeTab === 'predictions') {
                    await this.renderPredictionDetails(targetId);
                } else if (this.state.activeTab === 'alerts') {
                    await this.loadAlertsView();
                }
            }
        } catch (e) {
            console.error(e);
        }
    },

    async demoResetSeed() {
        await this.loadRealStoreDataset();
    },

    openPitchGuide() {
        document.getElementById('modal-pitch-guide').classList.add('active');
    },

    closePitchGuide() {
        document.getElementById('modal-pitch-guide').classList.remove('active');
    },

        // -------------------------------------------------------------
    // GOOGLE AUTHENTICATION SYSTEM
    // -------------------------------------------------------------
    initAuth() {
        const saved = localStorage.getItem('nightstock_user');
        if (saved) {
            try {
                this.state.currentUser = JSON.parse(saved);
                this.renderUserProfile(this.state.currentUser);
            } catch (e) {
                console.error(e);
            }
        }
    },

    openAuthModal() {
        const m = document.getElementById('modal-auth');
        if (m) m.classList.add('active');
    },

    closeAuthModal() {
        const m = document.getElementById('modal-auth');
        if (m) m.classList.remove('active');
    },

    signInAsGoogleUser(name, email) {
        const user = {
            name: name,
            email: email,
            initials: name.charAt(0).toUpperCase(),
            loginTime: new Date().toLocaleTimeString()
        };
        this.state.currentUser = user;
        localStorage.setItem('nightstock_user', JSON.stringify(user));
        this.renderUserProfile(user);
        this.closeAuthModal();
        if (window.soundEngine) window.soundEngine.playSuccess();
        window.spawnEctoplasmBurst();
        this.showToast(`✅ Welcome, ${name}! Signed in via Google (${email})`, "success");
    },

    signInWithCustomGmail() {
        const input = document.getElementById('custom-gmail-input');
        if (!input || !input.value.trim()) {
            this.showToast("Please enter a valid Gmail address.", "error");
            return;
        }
        const email = input.value.trim();
        let name = email.split('@')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
        this.signInAsGoogleUser(name, email);
    },

    signOutUser() {
        this.state.currentUser = null;
        localStorage.removeItem('nightstock_user');
        const container = document.getElementById('google-auth-container');
        if (container) {
            container.innerHTML = `
                <button class="btn-google-auth" onclick="App.openAuthModal()">
                    <svg class="google-icon-svg" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Sign in with Google</span>
                </button>
            `;
        }
        this.showToast("Signed out of Google account.", "info");
    },

    renderUserProfile(user) {
        const container = document.getElementById('google-auth-container');
        if (!container) return;
        container.innerHTML = `
            <div class="user-profile-badge" onclick="App.signOutUser()" title="Click to Sign Out">
                <div class="user-avatar-circle">${user.initials}</div>
                <div class="user-info-text">
                    <span class="user-display-name">${user.name}</span>
                    <span class="user-email-sub">${user.email} (Sign Out)</span>
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------
    // SUPPLY CHAIN DELIVERY & DEPLETION CALENDAR
    // -------------------------------------------------------------
    async loadCalendarView() {
        try {
            // Load products if not loaded
            if (this.state.products.length === 0) {
                const pRes = await fetch(`${API_BASE}/products`);
                this.state.products = await pRes.json();
            }

            // Populate target product dropdowns
            const selectQuick = document.getElementById('cal-input-product');
            const selectModal = document.getElementById('modal-cal-product');

            if (selectQuick && this.state.products.length > 0) {
                selectQuick.innerHTML = this.state.products.map(p => 
                    `<option value="${p.id}">${p.name} (Stock: ${p.current_stock} ${p.unit})</option>`
                ).join('');
            }

            if (selectModal && this.state.products.length > 0) {
                selectModal.innerHTML = this.state.products.map(p => 
                    `<option value="${p.id}">${p.name} (Stock: ${p.current_stock} ${p.unit})</option>`
                ).join('');
            }

            // Fetch calendar events from API
            const res = await fetch(`${API_BASE}/calendar/events`);
            const data = await res.json();
            this.state.calendarEvents = data;

            // Update default stockout days for selected product
            this.onCalendarProductSelected();

            // Render calendar grid and shipments table
            this.renderCalendarMonth();
            this.renderCalendarShipmentsTable();

        } catch (e) {
            console.error("Failed to load calendar view:", e);
        }
    },

    onCalendarProductSelected() {
        const select = document.getElementById('cal-input-product');
        if (!select) return;
        const prodId = parseInt(select.value);
        const depletions = this.state.calendarEvents.depletions || [];
        const match = depletions.find(d => d.product_id === prodId);

        const stockoutInput = document.getElementById('cal-input-stockout-days');
        if (stockoutInput) {
            if (match && match.days_until_stockout !== null) {
                stockoutInput.value = Math.max(0.1, match.days_until_stockout);
            } else {
                stockoutInput.value = 7.0;
            }
        }
        this.updateCalendarLeadGap();
    },

    updateCalendarLeadGap() {
        const arrivalDays = parseFloat(document.getElementById('cal-input-arrival-days')?.value || 3);
        const stockoutDays = parseFloat(document.getElementById('cal-input-stockout-days')?.value || 5);
        const indicator = document.getElementById('cal-lead-gap-indicator');
        if (!indicator) return;

        if (arrivalDays <= stockoutDays) {
            const buffer = (stockoutDays - arrivalDays).toFixed(1);
            indicator.innerHTML = `
                <div class="gap-indicator-safe">
                    ✅ <strong>Safe Supply Chain:</strong> New stock arrives <strong>${buffer} days</strong> before current inventory runs out. No stockout risk.
                </div>
            `;
        } else {
            const gap = (arrivalDays - stockoutDays).toFixed(1);
            indicator.innerHTML = `
                <div class="gap-indicator-risk">
                    🚨 <strong>Stockout Risk Warning:</strong> Inventory will run out <strong>${gap} days</strong> BEFORE the delivery arrives! Consider expediting shipment.
                </div>
            `;
        }
    },

    onModalCalProductChange() {
        const select = document.getElementById('modal-cal-product');
        if (!select) return;
        const prodId = parseInt(select.value);
        const depletions = this.state.calendarEvents.depletions || [];
        const match = depletions.find(d => d.product_id === prodId);

        const stockoutInput = document.getElementById('modal-cal-stockout-days');
        if (stockoutInput) {
            if (match && match.days_until_stockout !== null) {
                stockoutInput.value = Math.max(0.1, match.days_until_stockout);
            } else {
                stockoutInput.value = 6.0;
            }
        }
        this.updateModalCalLeadGap();
    },

    updateModalCalLeadGap() {
        const arrivalDays = parseFloat(document.getElementById('modal-cal-arrival-days')?.value || 3);
        const stockoutDays = parseFloat(document.getElementById('modal-cal-stockout-days')?.value || 6);
        const indicator = document.getElementById('modal-cal-lead-gap-indicator');
        if (!indicator) return;

        if (arrivalDays <= stockoutDays) {
            const buffer = (stockoutDays - arrivalDays).toFixed(1);
            indicator.innerHTML = `
                <div class="gap-indicator-safe">
                    ✅ <strong>Safe Supply Chain:</strong> New stock arrives <strong>${buffer} days</strong> before stockout.
                </div>
            `;
        } else {
            const gap = (arrivalDays - stockoutDays).toFixed(1);
            indicator.innerHTML = `
                <div class="gap-indicator-risk">
                    🚨 <strong>Stockout Gap:</strong> Shelves will be empty for <strong>${gap} days</strong>!
                </div>
            `;
        }
    },

    renderCalendarMonth() {
        const grid = document.getElementById('calendar-grid-cells');
        const title = document.getElementById('calendar-month-title');
        if (!grid || !title) return;

        const y = this.state.calendarYear;
        const m = this.state.calendarMonth;

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        title.textContent = `${monthNames[m]} ${y}`;

        // Compute start day and total days
        const firstDayIndex = new Date(y, m, 1).getDay(); // 0 is Sun
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const daysInPrevMonth = new Date(y, m, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const shipments = this.state.calendarEvents.shipments || [];
        const depletions = this.state.calendarEvents.depletions || [];

        let cellsHtml = '';

        // Previous month days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            cellsHtml += `
                <div class="cal-cell is-other-month">
                    <span class="cal-num">${d}</span>
                </div>
            `;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = (dateStr === todayStr);

            // Find matching shipments
            const dayShipments = shipments.filter(s => s.expected_delivery_date === dateStr);
            // Find matching projected stockouts
            const dayDepletions = depletions.filter(dep => dep.projected_stockout_date === dateStr);

            let badgesHtml = '';

            dayShipments.forEach(s => {
                badgesHtml += `
                    <span class="cal-pill cal-pill-delivery" title="📦 Delivery: +${s.quantity} ${s.product_name} (${s.status})">
                        📦 +${s.quantity} ${s.product_name}
                    </span>
                `;
            });

            dayDepletions.forEach(dep => {
                badgesHtml += `
                    <span class="cal-pill cal-pill-stockout" title="💀 Stockout: ${dep.product_name} reaches 0 ${dep.unit}!">
                        💀 ${dep.product_name} runs out
                    </span>
                `;
            });

            cellsHtml += `
                <div class="cal-cell ${isToday ? 'is-today' : ''}" onclick="App.openScheduleShipmentModal('${dateStr}')">
                    <span class="cal-num">${d} ${isToday ? '· Today' : ''}</span>
                    <div style="flex: 1; overflow-y: auto;">
                        ${badgesHtml}
                    </div>
                </div>
            `;
        }

        // Next month trailing days to complete 35 or 42 grid
        const totalRendered = firstDayIndex + daysInMonth;
        const remaining = (7 - (totalRendered % 7)) % 7;
        for (let nextD = 1; nextD <= remaining; nextD++) {
            cellsHtml += `
                <div class="cal-cell is-other-month">
                    <span class="cal-num">${nextD}</span>
                </div>
            `;
        }

        grid.innerHTML = cellsHtml;
    },

    changeCalendarMonth(delta) {
        this.state.calendarMonth += delta;
        if (this.state.calendarMonth < 0) {
            this.state.calendarMonth = 11;
            this.state.calendarYear--;
        } else if (this.state.calendarMonth > 11) {
            this.state.calendarMonth = 0;
            this.state.calendarYear++;
        }
        this.renderCalendarMonth();
    },

    renderCalendarShipmentsTable() {
        const tbody = document.getElementById('calendar-shipments-tbody');
        if (!tbody) return;

        const shipments = this.state.calendarEvents.shipments || [];

        if (shipments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">
                        📅 No shipments scheduled. Use the form above to input when stock is coming!
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        shipments.forEach(s => {
            const isReceived = s.status === 'RECEIVED';
            const statusBadge = isReceived 
                ? '<span class="status-badge badge-healthy">✅ Received</span>'
                : '<span class="status-badge badge-low">🚚 In Transit</span>';

            let gapText = 'Buffer: OK';
            if (s.days_until_stockout !== null) {
                if (s.days_until_arrival <= s.days_until_stockout) {
                    gapText = `✅ +${(s.days_until_stockout - s.days_until_arrival).toFixed(1)}d Buffer`;
                } else {
                    gapText = `🚨 ${(s.days_until_arrival - s.days_until_stockout).toFixed(1)}d Stockout Gap`;
                }
            }

            html += `
                <tr>
                    <td>
                        <strong style="color: #ffffff;">${s.product_name}</strong>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${s.supplier || 'Standard Delivery'}</div>
                    </td>
                    <td>
                        <span style="font-weight: 600; color: #fff;">${s.expected_delivery_date}</span>
                    </td>
                    <td>
                        <span style="color: var(--neon-cyan);">In ${s.days_until_arrival} days</span>
                    </td>
                    <td>
                        <strong>${s.quantity} ${s.unit || 'units'}</strong>
                    </td>
                    <td>
                        <span style="font-size: 0.8rem;">${gapText}</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display: flex; gap: 6px;">
                            ${!isReceived ? `
                                <button class="demo-strip-btn" style="border-color: var(--neon-green); color: #86efac;" onclick="App.receiveShipment(${s.id})">
                                    📦 Mark Received
                                </button>
                            ` : ''}
                            <button class="demo-strip-btn" style="border-color: rgba(255,42,85,0.4); color: #f87171;" onclick="App.deleteShipment(${s.id})">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    async submitQuickCalendarShipment() {
        try {
            const prodId = parseInt(document.getElementById('cal-input-product')?.value);
            const arrivalDays = parseInt(document.getElementById('cal-input-arrival-days')?.value || 3);
            const quantity = parseFloat(document.getElementById('cal-input-quantity')?.value || 30);
            const stockoutDays = parseFloat(document.getElementById('cal-input-stockout-days')?.value || 5);

            if (!prodId) {
                this.showToast("Please choose a product.", "error");
                return;
            }

            const res = await fetch(`${API_BASE}/calendar/shipments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: prodId,
                    days_until_arrival: arrivalDays,
                    quantity: quantity,
                    days_until_stockout: stockoutDays,
                    supplier: "Primary Supplier",
                    notes: `Scheduled via Quick Calendar (Arrival in ${arrivalDays}d, stockout in ${stockoutDays}d)`
                })
            });

            if (res.ok) {
                if (window.soundEngine) window.soundEngine.playSuccess();
                window.spawnEctoplasmBurst();
                this.showToast(`📅 Delivery scheduled! Stock coming in ${arrivalDays} days.`, "success");
                await this.loadCalendarView();
            } else {
                const err = await res.json();
                this.showToast(err.detail || "Failed to schedule delivery.", "error");
            }
        } catch (e) {
            console.error(e);
            this.showToast("Failed to schedule delivery.", "error");
        }
    },

    openScheduleShipmentModal(dateStr = null) {
        const m = document.getElementById('modal-schedule-shipment');
        if (!m) return;
        m.classList.add('active');

        if (dateStr) {
            const now = new Date();
            const target = new Date(dateStr);
            const diffDays = Math.max(1, Math.round((target - now) / (1000 * 60 * 60 * 24)));
            const inputDays = document.getElementById('modal-cal-arrival-days');
            if (inputDays) inputDays.value = diffDays;
        }

        this.onModalCalProductChange();
    },

    closeScheduleShipmentModal() {
        const m = document.getElementById('modal-schedule-shipment');
        if (m) m.classList.remove('active');
    },

    async handleScheduleShipmentSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const payload = {
            product_id: parseInt(formData.get('product_id')),
            days_until_arrival: parseInt(formData.get('days_until_arrival')),
            quantity: parseFloat(formData.get('quantity')),
            days_until_stockout: parseFloat(formData.get('days_until_stockout')),
            supplier: formData.get('supplier') || 'Alchemy Logistics',
            notes: formData.get('notes') || ''
        };

        try {
            const res = await fetch(`${API_BASE}/calendar/shipments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (window.soundEngine) window.soundEngine.playSuccess();
                window.spawnEctoplasmBurst();
                this.showToast("📅 Delivery scheduled and added to calendar!", "success");
                this.closeScheduleShipmentModal();
                form.reset();
                await this.loadCalendarView();
            } else {
                const err = await res.json();
                this.showToast(err.detail || "Failed to save shipment.", "error");
            }
        } catch (e) {
            console.error(e);
            this.showToast("Failed to schedule shipment.", "error");
        }
    },

    async receiveShipment(shipmentId) {
        try {
            const res = await fetch(`${API_BASE}/calendar/shipments/${shipmentId}/receive`, {
                method: 'POST'
            });

            if (res.ok) {
                const data = await res.json();
                if (window.soundEngine) window.soundEngine.playSuccess();
                window.spawnEctoplasmBurst();
                this.showToast(`📦 Restock Received! +${data.quantity_added} units added to ${data.product_name}.`, "success");
                await this.loadCalendarView();
                await this.loadInventory();
                await this.loadDashboard();
            } else {
                this.showToast("Failed to receive shipment.", "error");
            }
        } catch (e) {
            console.error(e);
            this.showToast("Error processing shipment receipt.", "error");
        }
    },

    async deleteShipment(shipmentId) {
        if (!confirm("Remove this scheduled shipment from the calendar?")) return;
        try {
            const res = await fetch(`${API_BASE}/calendar/shipments/${shipmentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                this.showToast("Shipment removed from schedule.", "info");
                await this.loadCalendarView();
            }
        } catch (e) {
            console.error(e);
        }
    },

// -------------------------------------------------------------
    // TOAST NOTIFICATIONS
    // -------------------------------------------------------------
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        const icon = type === 'success' ? '✨' : (type === 'warning' ? '🦇' : (type === 'error' ? '💀' : '🔮'));
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
