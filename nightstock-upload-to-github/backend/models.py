"""
Pydantic Models for NIGHTSTOCK API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ProductBase(BaseModel):
    sku: str
    name: str
    category: str
    unit: str = "Vials"
    current_stock: float = Field(default=0.0, ge=0)
    min_stock_level: float = Field(default=10.0, ge=0)
    max_stock_capacity: float = Field(default=100.0, ge=1)
    unit_price: float = Field(default=0.0, ge=0)
    lead_time_days: int = Field(default=3, ge=1)
    supplier: str = "Cryptkeeper Logistics"
    spookiness_level: int = Field(default=3, ge=1, le=5)
    notes: Optional[str] = ""


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    current_stock: Optional[float] = None
    min_stock_level: Optional[float] = None
    max_stock_capacity: Optional[float] = None
    unit_price: Optional[float] = None
    lead_time_days: Optional[int] = None
    supplier: Optional[str] = None
    spookiness_level: Optional[int] = None
    notes: Optional[str] = None


class ProductOut(ProductBase):
    id: int
    created_at: str
    updated_at: str
    stock_status: Optional[str] = "HEALTHY"  # HEALTHY, LOW_STOCK, OUT_OF_STOCK, SPIKE
    inventory_value: Optional[float] = 0.0


class StockAdjustRequest(BaseModel):
    adjustment: float
    reason: str = "Manual Ritual Adjustment"
    logged_by: str = "Alchemist"


class ConsumptionCreate(BaseModel):
    product_id: int
    quantity: float = Field(gt=0)
    date: Optional[str] = None  # defaults to today
    reason: str = "Midnight Cauldron Brewing"
    logged_by: str = "High Necromancer"


class ConsumptionOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    date: str
    quantity: float
    logged_by: str
    reason: str
    is_anomaly: int
    created_at: str


class ForecastDay(BaseModel):
    date: str
    day_name: str
    predicted_quantity: float
    lower_bound: float
    upper_bound: float


class DemandPredictionOut(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    category: str
    current_stock: float
    min_stock_level: float
    unit: str
    avg_daily_consumption: float
    predicted_7d_total: float
    days_until_stockout: Optional[float]
    recommended_reorder_qty: float
    safety_stock_recommended: float
    anomaly_spike_detected: bool
    spike_count_last_14d: int
    forecast_model_used: str  # 'Scikit-Learn Ridge Regression' or 'Statistical EWMA + Day-of-Week'
    model_confidence_r2: Optional[float]
    daily_forecast: List[ForecastDay]
    explanation: str  # "Necromancer's Diagnostic"


class AlertOut(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: Optional[str]
    type: str  # 'OUT_OF_STOCK', 'LOW_STOCK', 'SPIKE_DETECTED', 'REORDER_RECOMMENDED'
    severity: str  # 'critical', 'warning', 'info'
    message: str
    details: Optional[Dict[str, Any]]
    acknowledged: int
    created_at: str


class DashboardStats(BaseModel):
    total_products: int
    total_inventory_value: float
    low_stock_count: int
    out_of_stock_count: int
    today_consumption: float
    predicted_7d_consumption: float
    inventory_health_score: float  # 0 to 100 percentage
    category_breakdown: Dict[str, int]
    stock_status_breakdown: Dict[str, int]
    recent_spikes_count: int
    urgent_alerts_count: int


class DemoSpikeRequest(BaseModel):
    product_id: int
    multiplier: float = 3.5
    reason: str = "Blood Moon Ritual Surge"
