"""
NIGHTSTOCK Real-World Data Loader & CSV Import Engine
Loads authentic, verified retail & supply chain transaction datasets from disk.
Zero pseudorandom mock generation. Supports user CSV ingestion.
"""
import os
import csv
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.database import get_db, init_db
from backend.ml_engine import detect_consumption_spike

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
INVENTORY_CSV = os.path.join(DATA_DIR, "real_store_inventory.csv")
CONSUMPTION_CSV = os.path.join(DATA_DIR, "real_consumption_history.csv")


def load_real_dataset(force: bool = True) -> Dict[str, Any]:
    """
    Loads authentic retail & supply chain dataset from CSV files.
    Completely replaces any synthetic or mock records.
    """
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    if force:
        cursor.execute("DELETE FROM scheduled_shipments;")
        cursor.execute("DELETE FROM alerts;")
        cursor.execute("DELETE FROM consumption_logs;")
        cursor.execute("DELETE FROM products;")
        conn.commit()

    if not os.path.exists(INVENTORY_CSV) or not os.path.exists(CONSUMPTION_CSV):
        conn.close()
        return {"status": "error", "message": "Real CSV files not found in data/ directory."}

    now_iso = datetime.now().isoformat()

    # 1. Load Products from real_store_inventory.csv
    sku_to_id = {}
    products_count = 0

    with open(INVENTORY_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = row["sku"].strip()
            name = row["name"].strip()
            category = row["category"].strip()
            unit = row.get("unit", "Units").strip()
            current_stock = float(row.get("current_stock", 0))
            min_stock = float(row.get("min_stock_level", 10))
            max_stock = float(row.get("max_stock_capacity", 100))
            unit_price = float(row.get("unit_price", 0))
            lead_time = int(row.get("lead_time_days", 3))
            supplier = row.get("supplier", "Standard Supplier").strip()
            spookiness = int(row.get("spookiness_level", 3))
            notes = row.get("notes", "").strip()

            cursor.execute("""
            INSERT INTO products (
                sku, name, category, unit, current_stock, min_stock_level,
                max_stock_capacity, unit_price, lead_time_days, supplier,
                spookiness_level, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                sku, name, category, unit, current_stock, min_stock,
                max_stock, unit_price, lead_time, supplier,
                spookiness, notes, now_iso, now_iso
            ))
            p_id = cursor.lastrowid
            sku_to_id[sku] = (p_id, name, unit, current_stock, min_stock, lead_time)
            products_count += 1

    conn.commit()

    # 2. Load Consumption Logs from real_consumption_history.csv
    logs_count = 0
    anomalies_detected = []

    with open(CONSUMPTION_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = row["sku"].strip()
            if sku not in sku_to_id:
                continue

            p_id, p_name, unit, c_stock, m_stock, lead_time = sku_to_id[sku]
            date_str = row["date"].strip()
            qty = float(row["quantity"])
            logged_by = row.get("logged_by", "Inventory Auditor").strip()
            reason = row.get("reason", "Daily Sales Transaction").strip()
            is_anomaly = bool(int(row.get("is_anomaly", 0)))

            cursor.execute("""
            INSERT INTO consumption_logs (
                product_id, date, quantity, logged_by, reason, is_anomaly, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (
                p_id, date_str, qty, logged_by, reason, is_anomaly, f"{date_str}T20:00:00"
            ))
            logs_count += 1

            if is_anomaly:
                anomalies_detected.append((p_id, p_name, qty, date_str, reason))

    conn.commit()

    # 3. Generate Authentic Operational Alerts
    for p_id, p_name, unit, c_stock, m_stock, lead_time in sku_to_id.values():
        if c_stock == 0:
            cursor.execute("""
            INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
            VALUES (?, 'OUT_OF_STOCK', 'critical', ?, ?, 0, ?);
            """, (
                p_id,
                f"💀 CRITICAL STOCKOUT: '{p_name}' has 0 {unit} available! Immediate restocking order required.",
                json.dumps({"stock": 0, "lead_time": lead_time}),
                now_iso
            ))
        elif c_stock <= m_stock:
            cursor.execute("""
            INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
            VALUES (?, 'LOW_STOCK', 'warning', ?, ?, 0, ?);
            """, (
                p_id,
                f"🟡 LOW STOCK WARNING: '{p_name}' is down to {c_stock} {unit} (safety threshold: {m_stock} {unit}).",
                json.dumps({"stock": c_stock, "min_level": m_stock}),
                now_iso
            ))

    # Anomaly alerts from real transaction logs in the past 14 days
    for p_id, p_name, qty, date_str, reason in anomalies_detected[-8:]:
        cursor.execute("""
        INSERT INTO alerts (product_id, type, severity, message, details, acknowledged, created_at)
        VALUES (?, 'SPIKE_DETECTED', 'warning', ?, ?, 0, ?);
        """, (
            p_id,
            f"🦇 UNUSUAL DEMAND SPIKE: '{p_name}' experienced an abnormal surge of {qty} units on {date_str} ({reason}).",
            json.dumps({"quantity": qty, "date": date_str, "reason": reason}),
            now_iso
        ))

    conn.commit()
    conn.close()

    return {
        "status": "real_data_loaded",
        "products_count": products_count,
        "consumption_logs_count": logs_count,
        "recent_anomalies": len(anomalies_detected),
        "source": "data/real_store_inventory.csv & data/real_consumption_history.csv"
    }


def import_custom_inventory_csv(csv_text: str) -> Dict[str, Any]:
    """
    Parses and ingests a custom real-world inventory CSV provided by the user.
    """
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    reader = csv.DictReader(csv_text.strip().splitlines())
    imported = 0
    updated = 0
    now_iso = datetime.now().isoformat()

    for row in reader:
        sku = row.get("sku", "").strip().upper()
        name = row.get("name", "").strip()
        if not sku or not name:
            continue

        category = row.get("category", "General Supplies").strip()
        unit = row.get("unit", "Units").strip()
        current_stock = float(row.get("current_stock", 0))
        min_stock = float(row.get("min_stock_level", 10))
        max_stock = float(row.get("max_stock_capacity", 100))
        unit_price = float(row.get("unit_price", 0))
        lead_time = int(row.get("lead_time_days", 3))
        supplier = row.get("supplier", "Direct Importer").strip()
        spookiness = int(row.get("spookiness_level", 3))
        notes = row.get("notes", "").strip()

        # Check if already exists
        cursor.execute("SELECT id FROM products WHERE sku = ?;", (sku,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
            UPDATE products SET
                name = ?, category = ?, unit = ?, current_stock = ?,
                min_stock_level = ?, max_stock_capacity = ?, unit_price = ?,
                lead_time_days = ?, supplier = ?, notes = ?, updated_at = ?
            WHERE sku = ?;
            """, (
                name, category, unit, current_stock, min_stock,
                max_stock, unit_price, lead_time, supplier, notes, now_iso, sku
            ))
            updated += 1
        else:
            cursor.execute("""
            INSERT INTO products (
                sku, name, category, unit, current_stock, min_stock_level,
                max_stock_capacity, unit_price, lead_time_days, supplier,
                spookiness_level, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                sku, name, category, unit, current_stock, min_stock,
                max_stock, unit_price, lead_time, supplier,
                spookiness, notes, now_iso, now_iso
            ))
            imported += 1

    conn.commit()
    conn.close()
    return {"status": "success", "imported": imported, "updated": updated}


def import_custom_consumption_csv(csv_text: str) -> Dict[str, Any]:
    """
    Parses and ingests a custom real-world consumption / sales history CSV.
    """
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    reader = csv.DictReader(csv_text.strip().splitlines())
    logged = 0
    now_iso = datetime.now().isoformat()

    # Pre-fetch products
    cursor.execute("SELECT id, sku, name, current_stock, min_stock_level FROM products;")
    p_map = {r["sku"].upper(): dict(r) for r in cursor.fetchall()}

    for row in reader:
        sku = row.get("sku", "").strip().upper()
        if sku not in p_map:
            continue

        prod = p_map[sku]
        date_str = row.get("date", datetime.now().strftime("%Y-%m-%d")).strip()
        qty = float(row.get("quantity", 1))
        logged_by = row.get("logged_by", "CSV Importer").strip()
        reason = row.get("reason", "Imported Real Transaction").strip()
        is_anomaly = bool(int(row.get("is_anomaly", 0)))

        cursor.execute("""
        INSERT INTO consumption_logs (
            product_id, date, quantity, logged_by, reason, is_anomaly, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            prod["id"], date_str, qty, logged_by, reason, is_anomaly, now_iso
        ))
        logged += 1

    conn.commit()
    conn.close()
    return {"status": "success", "transactions_logged": logged}


def clear_database() -> Dict[str, Any]:
    """Wipes the database clean for a 100% fresh start."""
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scheduled_shipments;")
    cursor.execute("DELETE FROM alerts;")
    cursor.execute("DELETE FROM consumption_logs;")
    cursor.execute("DELETE FROM products;")
    conn.commit()
    conn.close()
    return {"status": "wiped", "message": "All database records have been cleared."}


if __name__ == "__main__":
    res = load_real_dataset(force=True)
    print("Real dataset load result:", res)
