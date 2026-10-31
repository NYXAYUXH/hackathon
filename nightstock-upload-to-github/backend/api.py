"""
NIGHTSTOCK REST API Router
FastAPI routes for Inventory Management, Demand Prediction, Alerts, and CSV Reports.
"""
import io
import csv
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query, Response

from backend.database import get_db, row_to_dict, get_db_info, IntegrityError
from backend.models import (
    ProductCreate, ProductUpdate, ProductOut,
    StockAdjustRequest, ConsumptionCreate, ConsumptionOut,
    DemandPredictionOut, AlertOut, DashboardStats, DemoSpikeRequest
)
from backend.ml_engine import forecast_demand_7d, detect_consumption_spike
from backend.data_loader import (
    load_real_dataset,
    import_custom_inventory_csv,
    import_custom_consumption_csv,
    clear_database
)

router = APIRouter(prefix="/api")


# -------------------------------------------------------------
# DASHBOARD STATS
# -------------------------------------------------------------
@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()

    # Total products and inventory value
    cursor.execute("""
        SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(current_stock * unit_price), 0.0) as total_val,
            SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_count,
            SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock_level THEN 1 ELSE 0 END) as low_count,
            SUM(CASE WHEN current_stock > min_stock_level THEN 1 ELSE 0 END) as healthy_count
        FROM products;
    """)
    p_stats = cursor.fetchone()
    total_products = p_stats["total_count"] or 0
    total_val = round(float(p_stats["total_val"] or 0.0), 2)
    out_count = p_stats["out_count"] or 0
    low_count = p_stats["low_count"] or 0
    healthy_count = p_stats["healthy_count"] or 0

    # Category breakdown
    cursor.execute("SELECT category, COUNT(*) as cnt FROM products GROUP BY category;")
    cat_breakdown = {row["category"]: row["cnt"] for row in cursor.fetchall()}

    # Today's consumption (or latest available date)
    cursor.execute("SELECT MAX(date) as max_date FROM consumption_logs;")
    max_date_row = cursor.fetchone()
    latest_date = max_date_row["max_date"] if max_date_row else datetime.now().strftime("%Y-%m-%d")

    cursor.execute("SELECT COALESCE(SUM(quantity), 0.0) as today_sum FROM consumption_logs WHERE date = ?;", (latest_date,))
    today_consumption = round(float(cursor.fetchone()["today_sum"]), 1)

    # Urgent alerts count
    cursor.execute("SELECT COUNT(*) as alert_cnt FROM alerts WHERE acknowledged = 0 AND severity = 'critical';")
    urgent_alerts = cursor.fetchone()["alert_cnt"] or 0

    # Recent spikes in last 7 days
    try:
        latest_dt = datetime.strptime(latest_date, "%Y-%m-%d")
    except Exception:
        latest_dt = datetime.now()
    seven_days_ago = (latest_dt - timedelta(days=7)).strftime("%Y-%m-%d")

    cursor.execute("SELECT COUNT(*) as spike_cnt FROM consumption_logs WHERE is_anomaly = 1 AND date >= ?;", (seven_days_ago,))
    recent_spikes = cursor.fetchone()["spike_cnt"] or 0

    # Inventory Health Score calculation (0 to 100)
    # Healthy products give 100%, Low Stock gives 50%, Out of Stock gives 0%
    if total_products > 0:
        health_score = round(((healthy_count * 1.0 + low_count * 0.5) / total_products) * 100, 1)
    else:
        health_score = 100.0

    # Predicted 7-day consumption across all products
    # Quick aggregate approximation from 7d history average
    twenty_eight_days_ago = (latest_dt - timedelta(days=28)).strftime("%Y-%m-%d")
    cursor.execute("""
        SELECT COALESCE(SUM(quantity), 0.0) / 4.0 as approx_7d
        FROM consumption_logs
        WHERE date >= ?;
    """, (twenty_eight_days_ago,))
    pred_7d_row = cursor.fetchone()
    pred_7d_sum = round(float(pred_7d_row["approx_7d"] or 0.0), 1)

    conn.close()

    return DashboardStats(
        total_products=total_products,
        total_inventory_value=total_val,
        low_stock_count=low_count,
        out_of_stock_count=out_count,
        today_consumption=today_consumption,
        predicted_7d_consumption=pred_7d_sum,
        inventory_health_score=health_score,
        category_breakdown=cat_breakdown,
        stock_status_breakdown={
            "Healthy": healthy_count,
            "Low Stock": low_count,
            "Out of Stock": out_count
        },
        recent_spikes_count=recent_spikes,
        urgent_alerts_count=urgent_alerts
    )


# -------------------------------------------------------------
# PRODUCTS CRUD
# -------------------------------------------------------------
@router.get("/products", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM products WHERE 1=1"
    params = []

    if category and category != "ALL":
        query += " AND category = ?"
        params.append(category)

    if search:
        search_pattern = f"%{search.strip()}%"
        query += " AND (name LIKE ? OR sku LIKE ? OR supplier LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern])

    query += " ORDER BY name ASC;"
    cursor.execute(query, params)
    rows = cursor.fetchall()

    results = []
    for r in rows:
        d = row_to_dict(r)
        # Determine status
        c_stock = d["current_stock"]
        m_stock = d["min_stock_level"]
        if c_stock == 0:
            s_status = "OUT_OF_STOCK"
        elif c_stock <= m_stock:
            s_status = "LOW_STOCK"
        else:
            s_status = "HEALTHY"

        d["stock_status"] = s_status
        d["inventory_value"] = round(c_stock * d["unit_price"], 2)

        # Status filter if requested
        if status and status != "ALL":
            if status.upper() != s_status:
                continue

        results.append(ProductOut(**d))

    conn.close()
    return results


@router.get("/products/{product_id}")
def get_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products WHERE id = ?;", (product_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product of the Damned not found.")

    p_dict = row_to_dict(row)
    c_stock = p_dict["current_stock"]
    m_stock = p_dict["min_stock_level"]
    p_dict["stock_status"] = "OUT_OF_STOCK" if c_stock == 0 else ("LOW_STOCK" if c_stock <= m_stock else "HEALTHY")
    p_dict["inventory_value"] = round(c_stock * p_dict["unit_price"], 2)

    # Recent 30 logs
    cursor.execute("""
        SELECT * FROM consumption_logs 
        WHERE product_id = ? 
        ORDER BY date DESC 
        LIMIT 30;
    """, (product_id,))
    logs = [row_to_dict(r) for r in cursor.fetchall()]

    conn.close()

    # Generate prediction preview
    pred = forecast_demand_7d(p_dict, list(reversed(logs)))

    return {
        "product": p_dict,
        "recent_logs": logs,
        "prediction": pred
    }


@router.post("/products", response_model=ProductOut)
def create_product(product: ProductCreate):
    conn = get_db()
    cursor = conn.cursor()

    now = datetime.now().isoformat()
    try:
        cursor.execute("""
        INSERT INTO products (
            sku, name, category, unit, current_stock, min_stock_level,
            max_stock_capacity, unit_price, lead_time_days, supplier,
            spookiness_level, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            product.sku.upper().strip(),
            product.name.strip(),
            product.category,
            product.unit,
            product.current_stock,
            product.min_stock_level,
            product.max_stock_capacity,
            product.unit_price,
            product.lead_time_days,
            product.supplier,
            product.spookiness_level,
            product.notes,
            now,
            now
        ))
        p_id = cursor.lastrowid
        conn.commit()

        # Check if new product is already low stock or out of stock and create alert
        if product.current_stock == 0:
            cursor.execute("""
            INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
            VALUES (?, 'OUT_OF_STOCK', 'critical', ?, ?, 0, ?);
            """, (p_id, f"💀 '{product.name}' created with 0 stock in crypt!", json.dumps({"stock": 0}), now))
        elif product.current_stock <= product.min_stock_level:
            cursor.execute("""
            INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
            VALUES (?, 'LOW_STOCK', 'warning', ?, ?, 0, ?);
            """, (p_id, f"🟡 '{product.name}' created below min threshold {product.min_stock_level}!", json.dumps({"stock": product.current_stock}), now))
        conn.commit()

        cursor.execute("SELECT * FROM products WHERE id = ?;", (p_id,))
        new_row = row_to_dict(cursor.fetchone())
        conn.close()

        new_row["stock_status"] = "OUT_OF_STOCK" if product.current_stock == 0 else ("LOW_STOCK" if product.current_stock <= product.min_stock_level else "HEALTHY")
        new_row["inventory_value"] = round(product.current_stock * product.unit_price, 2)
        return ProductOut(**new_row)

    except IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail=f"A product with SKU '{product.sku}' already haunts this crypt!")


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, update: ProductUpdate):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products WHERE id = ?;", (product_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    current = row_to_dict(row)
    now = datetime.now().isoformat()

    updated_fields = update.model_dump(exclude_unset=True)
    if "sku" in updated_fields:
        updated_fields["sku"] = updated_fields["sku"].upper().strip()

    merged = {**current, **updated_fields, "updated_at": now}

    cursor.execute("""
    UPDATE products SET
        sku = ?, name = ?, category = ?, unit = ?, current_stock = ?,
        min_stock_level = ?, max_stock_capacity = ?, unit_price = ?,
        lead_time_days = ?, supplier = ?, spookiness_level = ?,
        notes = ?, updated_at = ?
    WHERE id = ?;
    """, (
        merged["sku"], merged["name"], merged["category"], merged["unit"],
        merged["current_stock"], merged["min_stock_level"], merged["max_stock_capacity"],
        merged["unit_price"], merged["lead_time_days"], merged["supplier"],
        merged["spookiness_level"], merged["notes"], merged["updated_at"],
        product_id
    ))
    conn.commit()

    # Re-evaluate stock status alerts
    c_stock = merged["current_stock"]
    m_stock = merged["min_stock_level"]
    if c_stock == 0:
        cursor.execute("INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at) VALUES (?, 'OUT_OF_STOCK', 'critical', ?, ?, 0, ?);",
                       (product_id, f"💀 '{merged['name']}' reached 0 stock!", json.dumps({"stock": 0}), now))
    elif c_stock <= m_stock:
        cursor.execute("INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at) VALUES (?, 'LOW_STOCK', 'warning', ?, ?, 0, ?);",
                       (product_id, f"🟡 '{merged['name']}' stock is at {c_stock} (min {m_stock})!", json.dumps({"stock": c_stock}), now))
    conn.commit()
    conn.close()

    merged["stock_status"] = "OUT_OF_STOCK" if c_stock == 0 else ("LOW_STOCK" if c_stock <= m_stock else "HEALTHY")
    merged["inventory_value"] = round(c_stock * merged["unit_price"], 2)
    return ProductOut(**merged)


@router.delete("/products/{product_id}")
def delete_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM products WHERE id = ?;", (product_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    name = row["name"]
    cursor.execute("DELETE FROM products WHERE id = ?;", (product_id,))
    conn.commit()
    conn.close()
    return {"status": "banished", "message": f"Product '{name}' was banished to the netherworld."}


@router.post("/products/{product_id}/adjust-stock")
def adjust_product_stock(product_id: int, req: StockAdjustRequest):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products WHERE id = ?;", (product_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    prod = row_to_dict(row)
    new_stock = max(0.0, prod["current_stock"] + req.adjustment)
    now = datetime.now().isoformat()

    cursor.execute("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?;", (new_stock, now, product_id))

    # If negative adjustment, also log as consumption
    if req.adjustment < 0:
        consumed_qty = abs(req.adjustment)
        cursor.execute("""
        INSERT INTO consumption_logs (product_id, date, quantity, logged_by, reason, is_anomaly, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?);
        """, (
            product_id,
            datetime.now().strftime("%Y-%m-%d"),
            consumed_qty,
            req.logged_by,
            req.reason,
            now
        ))

    conn.commit()
    conn.close()
    return {
        "status": "success",
        "product_id": product_id,
        "old_stock": prod["current_stock"],
        "new_stock": new_stock,
        "unit": prod["unit"],
        "adjustment": req.adjustment
    }


# -------------------------------------------------------------
# CONSUMPTION LOGGING & SPIKE DETECTION
# -------------------------------------------------------------
@router.post("/consumption", response_model=ConsumptionOut)
def record_consumption(entry: ConsumptionCreate):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products WHERE id = ?;", (entry.product_id,))
    p_row = cursor.fetchone()
    if not p_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    prod = row_to_dict(p_row)
    now = datetime.now()
    log_date = entry.date or now.strftime("%Y-%m-%d")
    now_iso = now.isoformat()

    # Fetch recent consumption history to detect spike
    cursor.execute("""
        SELECT quantity FROM consumption_logs 
        WHERE product_id = ? 
        ORDER BY date ASC;
    """, (entry.product_id,))
    history_quantities = [float(r["quantity"]) for r in cursor.fetchall()]

    # Detect spike using our ML/statistical anomaly engine
    is_anomaly, z_score, spike_reason = detect_consumption_spike(entry.quantity, history_quantities)

    # Insert consumption record
    cursor.execute("""
    INSERT INTO consumption_logs (product_id, date, quantity, logged_by, reason, is_anomaly, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (
        entry.product_id,
        log_date,
        entry.quantity,
        entry.logged_by,
        entry.reason,
        1 if is_anomaly else 0,
        now_iso
    ))
    c_id = cursor.lastrowid

    # Decrement product stock
    new_stock = max(0.0, prod["current_stock"] - entry.quantity)
    cursor.execute("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?;", (new_stock, now_iso, entry.product_id))

    # Trigger alerts if necessary
    if is_anomaly:
        cursor.execute("""
        INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
        VALUES (?, 'SPIKE_DETECTED', 'warning', ?, ?, 0, ?);
        """, (
            entry.product_id,
            f"🦇 UNUSUAL SPIKE DETECTED: {entry.quantity} {prod['unit']} of '{prod['name']}' consumed ({spike_reason})!",
            json.dumps({"quantity": entry.quantity, "z_score": z_score, "date": log_date, "reason": entry.reason}),
            now_iso
        ))

    if new_stock == 0:
        cursor.execute("""
        INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
        VALUES (?, 'OUT_OF_STOCK', 'critical', ?, ?, 0, ?);
        """, (
            entry.product_id,
            f"💀 OUT OF STOCK: Consumption of {entry.quantity} {prod['unit']} depleted all remaining stock of '{prod['name']}'!",
            json.dumps({"stock": 0, "consumed": entry.quantity}),
            now_iso
        ))
    elif new_stock <= prod["min_stock_level"] and prod["current_stock"] > prod["min_stock_level"]:
        cursor.execute("""
        INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
        VALUES (?, 'LOW_STOCK', 'warning', ?, ?, 0, ?);
        """, (
            entry.product_id,
            f"🟡 LOW STOCK ALERT: '{prod['name']}' is now down to {new_stock} {prod['unit']} (below min {prod['min_stock_level']}).",
            json.dumps({"stock": new_stock, "min_level": prod["min_stock_level"]}),
            now_iso
        ))

    conn.commit()
    conn.close()

    return ConsumptionOut(
        id=c_id,
        product_id=entry.product_id,
        product_name=prod["name"],
        product_sku=prod["sku"],
        date=log_date,
        quantity=entry.quantity,
        logged_by=entry.logged_by,
        reason=entry.reason,
        is_anomaly=1 if is_anomaly else 0,
        created_at=now_iso
    )


@router.get("/consumption/logs", response_model=List[ConsumptionOut])
def get_consumption_logs(product_id: Optional[int] = Query(None), limit: int = 50):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT c.*, p.name as product_name, p.sku as product_sku 
        FROM consumption_logs c
        JOIN products p ON c.product_id = p.id
    """
    params = []
    if product_id:
        query += " WHERE c.product_id = ?"
        params.append(product_id)

    query += " ORDER BY c.date DESC, c.id DESC LIMIT ?;"
    params.append(limit)

    cursor.execute(query, params)
    rows = [ConsumptionOut(**row_to_dict(r)) for r in cursor.fetchall()]
    conn.close()
    return rows


# -------------------------------------------------------------
# DEMAND PREDICTION ENGINE
# -------------------------------------------------------------
@router.get("/predictions/all", response_model=List[DemandPredictionOut])
def get_all_predictions():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products ORDER BY name ASC;")
    products = [row_to_dict(r) for r in cursor.fetchall()]

    predictions = []
    for p in products:
        cursor.execute("SELECT date, quantity, is_anomaly FROM consumption_logs WHERE product_id = ? ORDER BY date ASC;", (p["id"],))
        history = [row_to_dict(r) for r in cursor.fetchall()]
        pred = forecast_demand_7d(p, history)
        predictions.append(DemandPredictionOut(**pred))

    conn.close()
    return predictions


@router.get("/predictions/{product_id}", response_model=DemandPredictionOut)
def get_single_prediction(product_id: int):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products WHERE id = ?;", (product_id,))
    p_row = cursor.fetchone()
    if not p_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    product = row_to_dict(p_row)
    cursor.execute("SELECT date, quantity, is_anomaly FROM consumption_logs WHERE product_id = ? ORDER BY date ASC;", (product_id,))
    history = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    pred = forecast_demand_7d(product, history)
    return DemandPredictionOut(**pred)


# -------------------------------------------------------------
# SMART ALERTS
# -------------------------------------------------------------
@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(acknowledged: Optional[int] = Query(0)):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT a.*, p.name as product_name
        FROM alerts a
        LEFT JOIN products p ON a.product_id = p.id
    """
    params = []
    if acknowledged is not None:
        query += " WHERE a.acknowledged = ?"
        params.append(acknowledged)

    query += " ORDER BY CASE WHEN a.severity = 'critical' THEN 0 WHEN a.severity = 'warning' THEN 1 ELSE 2 END, a.created_at DESC;"
    cursor.execute(query, params)

    alerts = []
    for r in cursor.fetchall():
        d = row_to_dict(r)
        if isinstance(d.get("details"), str):
            try:
                d["details"] = json.loads(d["details"])
            except Exception:
                d["details"] = {}
        alerts.append(AlertOut(**d))

    conn.close()
    return alerts


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?;", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "silenced", "alert_id": alert_id}


@router.post("/alerts/acknowledge-all")
def acknowledge_all_alerts():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0;")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return {"status": "silenced", "count": count}


# -------------------------------------------------------------
# REPORTS & CSV EXPORT
# -------------------------------------------------------------
@router.get("/reports/summary")
def get_reports_summary():
    conn = get_db()
    cursor = conn.cursor()

    # Total inventory valuation
    cursor.execute("""
        SELECT 
            category,
            COUNT(*) as item_count,
            SUM(current_stock) as total_units,
            SUM(current_stock * unit_price) as category_value
        FROM products
        GROUP BY category;
    """)
    cat_summary = [row_to_dict(r) for r in cursor.fetchall()]

    # 30-day consumption summary
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    cursor.execute("""
        SELECT 
            p.name, p.category, p.unit,
            SUM(c.quantity) as total_consumed,
            AVG(c.quantity) as avg_daily,
            MAX(c.quantity) as peak_daily,
            SUM(CASE WHEN c.is_anomaly THEN 1 ELSE 0 END) as spike_events
        FROM consumption_logs c
        JOIN products p ON c.product_id = p.id
        WHERE c.date >= ?
        GROUP BY c.product_id, p.name, p.category, p.unit
        ORDER BY total_consumed DESC;
    """, (thirty_days_ago,))
    consumption_summary = [row_to_dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "category_valuation": cat_summary,
        "consumption_breakdown": consumption_summary,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/reports/export-csv")
def export_csv(report_type: str = Query("products", pattern="^(products|consumption|predictions)$")):
    """Generates downloadable CSV for products, consumption history, or predictions."""
    conn = get_db()
    cursor = conn.cursor()
    output = io.StringIO()

    if report_type == "products":
        cursor.execute("SELECT * FROM products ORDER BY category, name;")
        rows = cursor.fetchall()
        writer = csv.writer(output)
        writer.writerow(["ID", "SKU", "Name", "Category", "Unit", "Current Stock", "Min Stock Level", "Max Capacity", "Unit Price ($)", "Lead Time (Days)", "Supplier", "Spookiness", "Status", "Total Value ($)"])
        for r in rows:
            d = row_to_dict(r)
            c = d["current_stock"]
            m = d["min_stock_level"]
            status = "OUT OF STOCK" if c == 0 else ("LOW STOCK" if c <= m else "HEALTHY")
            val = round(c * d["unit_price"], 2)
            writer.writerow([d["id"], d["sku"], d["name"], d["category"], d["unit"], c, m, d["max_stock_capacity"], d["unit_price"], d["lead_time_days"], d["supplier"], d["spookiness_level"], status, val])
        filename = f"nightstock_inventory_{datetime.now().strftime('%Y%m%d')}.csv"

    elif report_type == "consumption":
        cursor.execute("""
            SELECT c.id, c.date, p.sku, p.name, p.category, c.quantity, p.unit, c.logged_by, c.reason, c.is_anomaly
            FROM consumption_logs c
            JOIN products p ON c.product_id = p.id
            ORDER BY c.date DESC;
        """)
        rows = cursor.fetchall()
        writer = csv.writer(output)
        writer.writerow(["Log ID", "Date", "SKU", "Product Name", "Category", "Quantity Consumed", "Unit", "Logged By", "Reason", "Is Anomaly Spike"])
        for r in rows:
            d = row_to_dict(r)
            writer.writerow([d["id"], d["date"], d["sku"], d["name"], d["category"], d["quantity"], d["unit"], d["logged_by"], d["reason"], "YES" if d["is_anomaly"] else "NO"])
        filename = f"nightstock_consumption_logs_{datetime.now().strftime('%Y%m%d')}.csv"

    else:  # predictions
        cursor.execute("SELECT * FROM products ORDER BY name ASC;")
        products = [row_to_dict(r) for r in cursor.fetchall()]
        writer = csv.writer(output)
        writer.writerow(["SKU", "Product Name", "Category", "Current Stock", "Unit", "Avg Daily Demand", "Predicted 7D Total", "Days to Stockout", "Recommended Reorder Qty", "Safety Stock", "Spikes (Last 14D)", "Forecast Model"])
        for p in products:
            cursor.execute("SELECT date, quantity, is_anomaly FROM consumption_logs WHERE product_id = ? ORDER BY date ASC;", (p["id"],))
            history = [row_to_dict(r) for r in cursor.fetchall()]
            pred = forecast_demand_7d(p, history)
            writer.writerow([
                pred["product_sku"], pred["product_name"], pred["category"], pred["current_stock"], pred["unit"],
                pred["avg_daily_consumption"], pred["predicted_7d_total"],
                pred["days_until_stockout"] if pred["days_until_stockout"] else "N/A",
                pred["recommended_reorder_qty"], pred["safety_stock_recommended"],
                pred["spike_count_last_14d"], pred["forecast_model_used"]
            ])
        filename = f"nightstock_demand_forecast_{datetime.now().strftime('%Y%m%d')}.csv"

    conn.close()
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# -------------------------------------------------------------
# REAL-WORLD DATA MANAGEMENT & CSV INGESTION
# -------------------------------------------------------------
class CsvImportRequest(BaseModel):
    csv_content: str


@router.post("/data/load-real-dataset")
def load_real_dataset_endpoint():
    """Loads authentic, verified real-world retail inventory & transaction dataset from disk."""
    res = load_real_dataset(force=True)
    return res


@router.post("/data/import-inventory")
def import_inventory_endpoint(req: CsvImportRequest):
    """Imports user-provided real inventory records from CSV content."""
    res = import_custom_inventory_csv(req.csv_content)
    return res


@router.post("/data/import-consumption")
def import_consumption_endpoint(req: CsvImportRequest):
    """Imports user-provided real sales/consumption transaction records from CSV content."""
    res = import_custom_consumption_csv(req.csv_content)
    return res


@router.post("/data/clear-database")
def clear_database_endpoint():
    """Clears all products, consumption logs, and alerts for a 100% clean blank slate."""
    res = clear_database()
    return res


@router.post("/demo/seed")
def reload_clean_real_data():
    """Alias to load real-world dataset."""
    return load_real_dataset(force=True)


@router.post("/demo/simulate-spike")
def demo_simulate_spike(req: DemoSpikeRequest):
    """
    Records an operational demand spike on a real item based on actual run rate.
    Engine calculates rolling Z-score to determine statistical anomaly.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM products WHERE id = ?;", (req.product_id,))
    p_row = cursor.fetchone()
    if not p_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    prod = row_to_dict(p_row)
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    now_iso = now.isoformat()

    # Calculate historical average from real logs
    cursor.execute("SELECT AVG(quantity) as avg_qty FROM consumption_logs WHERE product_id = ?;", (req.product_id,))
    avg_q = float(cursor.fetchone()["avg_qty"] or 5.0)
    spike_qty = round(avg_q * req.multiplier, 1)

    # Log consumption with anomaly flag
    cursor.execute("""
    INSERT INTO consumption_logs (product_id, date, quantity, logged_by, reason, is_anomaly, created_at)
    VALUES (?, ?, ?, 'Operations Supervisor', ?, 1, ?);
    """, (req.product_id, today_str, spike_qty, req.reason, now_iso))

    # Reduce stock
    new_stock = max(0.0, prod["current_stock"] - spike_qty)
    cursor.execute("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?;", (new_stock, now_iso, req.product_id))

    # Trigger alert
    alert_msg = f"🦇 OPERATIONAL SPIKE RECORDED: '{prod['name']}' surged by {spike_qty} {prod['unit']} ({req.multiplier}x normal rate)! {req.reason}"
    cursor.execute("""
    INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
    VALUES (?, 'SPIKE_DETECTED', 'warning', ?, ?, 0, ?);
    """, (req.product_id, alert_msg, json.dumps({"spike_qty": spike_qty, "multiplier": req.multiplier, "reason": req.reason}), now_iso))
    alert_id = cursor.lastrowid

    if new_stock == 0:
        cursor.execute("""
        INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
        VALUES (?, 'OUT_OF_STOCK', 'critical', ?, ?, 0, ?);
        """, (req.product_id, f"💀 STOCKOUT: '{prod['name']}' depleted to 0 {prod['unit']} following demand spike!", json.dumps({"new_stock": 0}), now_iso))

    conn.commit()
    conn.close()

    return {
        "status": "spike_injected",
        "product_name": prod["name"],
        "spike_quantity": spike_qty,
        "multiplier": req.multiplier,
        "previous_stock": prod["current_stock"],
        "new_stock": new_stock,
        "alert_id": alert_id,
        "message": f"Demand surge of {spike_qty} {prod['unit']} recorded. Real statistical anomaly detected."
    }


# -------------------------------------------------------------
# SUPPLY CHAIN CALENDAR & STOCKOUT PREDICTION ROUTES
# -------------------------------------------------------------
class ShipmentCreate(BaseModel):
    product_id: int
    days_until_arrival: int = 3
    expected_delivery_date: Optional[str] = None
    quantity: float = 10.0
    days_until_stockout: Optional[float] = None
    supplier: Optional[str] = "Standard Logistics"
    notes: Optional[str] = "Restock delivery order"


@router.get("/calendar/events")
def get_calendar_events():
    """
    Returns incoming stock delivery schedules and projected stockout dates
    for full supply-chain lead time analysis.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Ensure table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scheduled_shipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        expected_delivery_date TEXT NOT NULL,
        days_until_arrival INTEGER NOT NULL DEFAULT 3,
        quantity REAL NOT NULL DEFAULT 10.0,
        days_until_stockout REAL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        supplier TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)

    # Fetch all shipments with product info
    cursor.execute("""
        SELECT s.*, p.name as product_name, p.sku, p.unit, p.current_stock
        FROM scheduled_shipments s
        JOIN products p ON s.product_id = p.id
        ORDER BY s.expected_delivery_date ASC;
    """)
    shipments = [row_to_dict(r) for r in cursor.fetchall()]

    # Fetch all products to calculate predicted depletion dates
    cursor.execute("SELECT id, name, sku, unit, current_stock, min_stock_level FROM products;")
    products = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    depletion_events = []
    now = datetime.now()

    for p in products:
        try:
            pred = forecast_demand_7d(p["id"])
            days_left = pred["days_until_stockout"]
            if days_left is not None:
                stockout_dt = now + timedelta(days=float(days_left))
                depletion_events.append({
                    "product_id": p["id"],
                    "product_name": p["name"],
                    "sku": p["sku"],
                    "unit": p["unit"],
                    "current_stock": p["current_stock"],
                    "days_until_stockout": days_left,
                    "projected_stockout_date": stockout_dt.strftime("%Y-%m-%d"),
                    "urgency": "critical" if days_left <= 3 else "warning" if days_left <= 7 else "moderate"
                })
        except Exception:
            pass

    return {
        "shipments": shipments,
        "depletions": depletion_events,
        "today": now.strftime("%Y-%m-%d")
    }


@router.post("/calendar/shipments")
def create_shipment(req: ShipmentCreate):
    """
    Schedules an expected stock delivery arrival.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, unit, current_stock FROM products WHERE id = ?;", (req.product_id,))
    prod = cursor.fetchone()
    if not prod:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    now = datetime.now()
    if not req.expected_delivery_date:
        arrival_dt = now + timedelta(days=max(0, req.days_until_arrival))
        delivery_date = arrival_dt.strftime("%Y-%m-%d")
    else:
        delivery_date = req.expected_delivery_date
        try:
            arrival_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
            req.days_until_arrival = max(0, (arrival_dt.date() - now.date()).days)
        except Exception:
            pass

    # If days_until_stockout not provided, calculate from ML
    if req.days_until_stockout is None:
        try:
            pred = forecast_demand_7d(req.product_id)
            req.days_until_stockout = pred["days_until_stockout"]
        except Exception:
            req.days_until_stockout = None

    now_iso = now.isoformat()
    cursor.execute("""
    INSERT INTO scheduled_shipments 
        (product_id, expected_delivery_date, days_until_arrival, quantity, days_until_stockout, status, supplier, notes, created_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?);
    """, (
        req.product_id, delivery_date, req.days_until_arrival, req.quantity,
        req.days_until_stockout, req.supplier or "Standard Logistics", req.notes or "", now_iso
    ))
    shipment_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": shipment_id,
        "product_id": req.product_id,
        "product_name": prod["name"],
        "expected_delivery_date": delivery_date,
        "days_until_arrival": req.days_until_arrival,
        "quantity": req.quantity,
        "days_until_stockout": req.days_until_stockout,
        "status": "PENDING"
    }


@router.post("/calendar/shipments/{shipment_id}/receive")
def receive_shipment(shipment_id: int):
    """
    Marks a scheduled shipment as received and increases inventory stock.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM scheduled_shipments WHERE id = ?;", (shipment_id,))
    s_row = cursor.fetchone()
    if not s_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Shipment not found.")

    shipment = row_to_dict(s_row)
    if shipment["status"] == "RECEIVED":
        conn.close()
        return {"message": "Shipment already marked as received.", "status": "RECEIVED"}

    cursor.execute("SELECT * FROM products WHERE id = ?;", (shipment["product_id"],))
    p_row = cursor.fetchone()
    if not p_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found.")

    prod = row_to_dict(p_row)
    now_iso = datetime.now().isoformat()
    new_stock = prod["current_stock"] + float(shipment["quantity"])

    # Update product stock
    cursor.execute("UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?;", (new_stock, now_iso, prod["id"]))

    # Update shipment status
    cursor.execute("UPDATE scheduled_shipments SET status = 'RECEIVED' WHERE id = ?;", (shipment_id,))

    # Create alert
    cursor.execute("""
    INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
    VALUES (?, 'RESTOCK_RECOMMENDED', 'info', ?, ?, 0, ?);
    """, (
        prod["id"],
        f"📦 SHIPMENT RECEIVED: +{shipment['quantity']} {prod['unit']} of '{prod['name']}' added to inventory.",
        json.dumps({"shipment_id": shipment_id, "quantity": shipment["quantity"]}),
        now_iso
    ))

    conn.commit()
    conn.close()

    return {
        "status": "RECEIVED",
        "product_id": prod["id"],
        "product_name": prod["name"],
        "quantity_added": shipment["quantity"],
        "new_stock": new_stock
    }


@router.delete("/calendar/shipments/{shipment_id}")
def delete_shipment(shipment_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scheduled_shipments WHERE id = ?;", (shipment_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()

    if not deleted:
        raise HTTPException(status_code=404, detail="Shipment not found.")
    return {"message": "Shipment deleted successfully."}


@router.get("/database/status")
def get_database_status():
    """Returns real-time database connection status, provider, and metrics."""
    return get_db_info()


@router.get("/health")
def api_health():
    """System health check endpoint."""
    db_info = get_db_info()
    return {
        "status": "healthy",
        "service": "NIGHTSTOCK Core Engine",
        "database": db_info
    }
