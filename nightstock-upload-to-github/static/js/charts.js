/**
 * NIGHTSTOCK Visual Analytics Engine
 * Chart.js configurations with Halloween neon cyberpunk dark aesthetics.
 */

window.charts = {
    forecastInstance: null,
    categoryInstance: null,
    velocityInstance: null,

    initThemeDefaults() {
        if (!window.Chart) return;
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 8, 30, 0.95)';
        Chart.defaults.plugins.tooltip.titleColor = '#ff6a00';
        Chart.defaults.plugins.tooltip.bodyColor = '#f1f5f9';
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(176, 38, 255, 0.4)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
    },

    renderForecastChart(canvasId, prediction, historicalLogs = []) {
        this.initThemeDefaults();
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.forecastInstance) {
            this.forecastInstance.destroy();
        }

        // Extract last 10 historical days
        const recentHistory = (historicalLogs || []).slice(-10);
        const histLabels = recentHistory.map(l => l.date.slice(5)); // 'MM-DD'
        const histData = recentHistory.map(l => l.quantity);

        // Forecast days
        const foreLabels = prediction.daily_forecast.map(f => `${f.day_name} (${f.date.slice(5)})`);
        const foreData = prediction.daily_forecast.map(f => f.predicted_quantity);
        const foreUpper = prediction.daily_forecast.map(f => f.upper_bound);
        const foreLower = prediction.daily_forecast.map(f => f.lower_bound);

        // Combined labels
        const allLabels = [...histLabels, ...foreLabels];

        // Datasets
        const histSeries = [...histData, ...new Array(foreData.length).fill(null)];
        // Connect history and forecast
        const lastHistVal = histData.length > 0 ? histData[histData.length - 1] : foreData[0];
        const foreSeries = [...new Array(histData.length - 1).fill(null), lastHistVal, ...foreData];
        const upperSeries = [...new Array(histData.length - 1).fill(null), lastHistVal, ...foreUpper];
        const lowerSeries = [...new Array(histData.length - 1).fill(null), lastHistVal, ...foreLower];

        this.forecastInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: 'Upper 95% Confidence Bound',
                        data: upperSeries,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(176, 38, 255, 0.12)',
                        fill: '+1',
                        pointRadius: 0,
                        tension: 0.35
                    },
                    {
                        label: 'Lower 95% Confidence Bound',
                        data: lowerSeries,
                        borderColor: 'transparent',
                        backgroundColor: 'transparent',
                        fill: false,
                        pointRadius: 0,
                        tension: 0.35
                    },
                    {
                        label: 'Historical Ritual Consumption',
                        data: histSeries,
                        borderColor: '#ff6a00',
                        backgroundColor: 'rgba(255, 106, 0, 0.2)',
                        borderWidth: 2.5,
                        pointBackgroundColor: '#ff6a00',
                        pointBorderColor: '#0b0714',
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        tension: 0.3
                    },
                    {
                        label: '🔮 7-Day ML Forecast Projection',
                        data: foreSeries,
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        borderWidth: 3,
                        borderDash: [6, 4],
                        pointBackgroundColor: '#00ff88',
                        pointBorderColor: '#0b0714',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        tension: 0.35
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' },
                        title: {
                            display: true,
                            text: `Demand (${prediction.unit})`,
                            color: '#94a3b8'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#cbd5e1',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 16,
                            filter: (item) => !item.text.includes('Bound')
                        }
                    }
                }
            }
        });
    },

    renderCategoryDonut(canvasId, categoryCounts) {
        this.initThemeDefaults();
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.categoryInstance) {
            this.categoryInstance.destroy();
        }

        const labels = Object.keys(categoryCounts || {});
        const data = Object.values(categoryCounts || {});

        const colors = [
            '#ff6a00', // Neon Pumpkin
            '#00ff88', // Toxic Green
            '#b026ff', // Neon Purple
            '#38bdf8', // Spectral Cyan
            '#f43f5e', // Blood Red
            '#fbbf24'  // Cursed Gold
        ];

        const chartLabels = labels.length > 0 ? labels : ['No Reagents Yet'];
        const chartData = data.length > 0 ? data : [1];
        const chartColors = data.length > 0 ? colors.slice(0, labels.length) : ['rgba(255,255,255,0.08)'];

        this.categoryInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderColor: '#0b0714',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1',
                            padding: 14,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    },

    renderStockVelocityChart(canvasId, topProducts) {
        this.initThemeDefaults();
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.velocityInstance) {
            this.velocityInstance.destroy();
        }

        const items = (topProducts || []).slice(0, 7);
        const labels = items.length > 0 
            ? items.map(i => i.product_name.length > 16 ? i.product_name.slice(0, 16) + '…' : i.product_name)
            : ['No Products Yet (Add in Inventory)'];
        const currentStock = items.length > 0 ? items.map(i => i.current_stock) : [0];
        const predicted7d = items.length > 0 ? items.map(i => i.predicted_7d_total) : [0];

        this.velocityInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Current Crypt Stock',
                        data: currentStock,
                        backgroundColor: 'rgba(176, 38, 255, 0.75)',
                        borderColor: '#b026ff',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: '🔮 Projected 7D Consumption',
                        data: predicted7d,
                        backgroundColor: 'rgba(255, 106, 0, 0.75)',
                        borderColor: '#ff6a00',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#cbd5e1', usePointStyle: true }
                    }
                }
            }
        });
    }
};
