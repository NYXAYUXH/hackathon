"""
NIGHTSTOCK Dual Database Engine
Seamless Supabase PostgreSQL connector with automatic SQLite offline fallback.
Provides transparent dialect translation and unified dict-like row access.
"""
import os
import re
import sqlite3
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Load environment variables from .env and .env.local
try:
    from dotenv import load_dotenv
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(base_dir, ".env"))
    load_dotenv(os.path.join(base_dir, ".env.local"))
except ImportError:
    pass

try:
    import psycopg2
    import psycopg2.extras
    PSYCOPG2_AVAILABLE = True
    IntegrityError = (sqlite3.IntegrityError, psycopg2.IntegrityError)
except ImportError:
    PSYCOPG2_AVAILABLE = False
    IntegrityError = (sqlite3.IntegrityError,)

DB_PATH = os.environ.get(
    "NIGHTSTOCK_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "nightstock.db")
)

def _get_postgres_dsn() -> Optional[str]:
    """Resolves clean psycopg2-compatible DSN from DIRECT_URL or DATABASE_URL."""
    direct = os.environ.get("DIRECT_URL")
    if direct and direct.strip():
        return direct.strip()
    db_url = os.environ.get("DATABASE_URL")
    if db_url and db_url.strip():
        # Strip ?pgbouncer=true or other URL query parameters for psycopg2 DSN
        return db_url.split("?")[0].strip()
    return None

class PostgresCursorWrapper:
    """
    Wraps a psycopg2 cursor to provide seamless compatibility with sqlite3 cursor patterns:
    - Automatically converts '?' parameter placeholders to '%s'
    - Injects 'RETURNING id' on INSERT statements to populate cursor.lastrowid
    - Adapts boolean comparisons (e.g. acknowledged = 0 -> acknowledged = false)
    - Returns rows accessible by both column name and numeric index
    """
    def __init__(self, raw_cursor):
        self._cur = raw_cursor
        self.lastrowid = None

    def _adapt_sql_and_params(self, sql: str, params=None):
        adapted_sql = sql.replace("?", "%s")

        # Auto-append RETURNING id for INSERT queries if not already present
        is_insert = bool(re.match(r"^\s*INSERT\s+INTO\b", adapted_sql, re.IGNORECASE))
        if is_insert and "RETURNING" not in adapted_sql.upper():
            adapted_sql = adapted_sql.rstrip().rstrip(";") + " RETURNING id;"

        # Convert SQLite booleans in SQL queries
        adapted_sql = re.sub(r"\backnowledged\s*=\s*0\b", "acknowledged = false", adapted_sql, flags=re.IGNORECASE)
        adapted_sql = re.sub(r"\backnowledged\s*=\s*1\b", "acknowledged = true", adapted_sql, flags=re.IGNORECASE)
        adapted_sql = re.sub(r"\bis_anomaly\s*=\s*0\b", "is_anomaly = false", adapted_sql, flags=re.IGNORECASE)
        adapted_sql = re.sub(r"\bis_anomaly\s*=\s*1\b", "is_anomaly = true", adapted_sql, flags=re.IGNORECASE)
        adapted_sql = re.sub(r"\bSUM\s*\(\s*c\.is_anomaly\s*\)", "SUM(CASE WHEN c.is_anomaly THEN 1 ELSE 0 END)", adapted_sql, flags=re.IGNORECASE)
        adapted_sql = re.sub(r"\bSUM\s*\(\s*is_anomaly\s*\)", "SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END)", adapted_sql, flags=re.IGNORECASE)

        # Remove AUTOINCREMENT (Postgres uses SERIAL or identity)
        adapted_sql = re.sub(r"\bAUTOINCREMENT\b", "", adapted_sql, flags=re.IGNORECASE)

        # Adapt params if needed (convert 0/1 to False/True for known boolean targets)
        adapted_params = None
        if params is not None:
            if isinstance(params, (list, tuple)):
                adapted_list = []
                for p in params:
                    adapted_list.append(p)
                adapted_params = tuple(adapted_list)
            else:
                adapted_params = params

        return adapted_sql, adapted_params, is_insert

    def execute(self, sql: str, params=None):
        adapted_sql, adapted_params, is_insert = self._adapt_sql_and_params(sql, params)
        if adapted_params is not None:
            self._cur.execute(adapted_sql, adapted_params)
        else:
            self._cur.execute(adapted_sql)

        if is_insert:
            try:
                row = self._cur.fetchone()
                if row:
                    self.lastrowid = row[0]
            except Exception:
                self.lastrowid = None
        return self

    def executemany(self, sql: str, param_seq):
        adapted_sql, _, _ = self._adapt_sql_and_params(sql, None)
        return self._cur.executemany(adapted_sql, param_seq)

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def fetchmany(self, size=None):
        return self._cur.fetchmany(size) if size else self._cur.fetchmany()

    @property
    def rowcount(self):
        return self._cur.rowcount

    def close(self):
        self._cur.close()

class PostgresConnectionWrapper:
    """Wraps a psycopg2 connection to expose sqlite3-compatible signatures."""
    def __init__(self, raw_conn):
        self._conn = raw_conn

    def cursor(self):
        raw_cur = self._conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        return PostgresCursorWrapper(raw_cur)

    def execute(self, sql: str, params=None):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

def get_db():
    """
    Connects to Supabase PostgreSQL when credentials exist.
    Seamlessly falls back to local SQLite if offline or disconnected.
    """
    dsn = _get_postgres_dsn()
    if PSYCOPG2_AVAILABLE and dsn:
        try:
            raw_conn = psycopg2.connect(dsn, connect_timeout=5)
            return PostgresConnectionWrapper(raw_conn)
        except Exception as e:
            print(f"⚠️ [NIGHTSTOCK] Postgres connection failed ({e}). Falling back to local SQLite.")

    # SQLite Fallback
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def get_db_info() -> Dict[str, Any]:
    """Inspects the active database engine status and provider."""
    dsn = _get_postgres_dsn()
    if PSYCOPG2_AVAILABLE and dsn:
        try:
            raw_conn = psycopg2.connect(dsn, connect_timeout=3)
            cur = raw_conn.cursor()
            cur.execute("SELECT current_database(), version();")
            db_name, ver = cur.fetchone()
            cur.execute("SELECT count(*) FROM products;")
            p_count = cur.fetchone()[0]
            raw_conn.close()
            host = dsn.split("@")[-1].split(":")[0] if "@" in dsn else "remote"
            return {
                "engine": "postgresql",
                "provider": "Supabase",
                "database": db_name,
                "host": host,
                "connected": True,
                "products_count": p_count,
                "version": ver.split()[0] + " " + ver.split()[1]
            }
        except Exception as e:
            return {
                "engine": "sqlite",
                "provider": "Local SQLite (Offline Fallback)",
                "connected": True,
                "error": str(e),
                "file": DB_PATH
            }
    return {
        "engine": "sqlite",
        "provider": "Local SQLite",
        "connected": True,
        "file": DB_PATH
    }

def init_db():
    """Ensures database tables and performance indexes exist on active database."""
    conn = get_db()
    is_postgres = isinstance(conn, PostgresConnectionWrapper)
    cursor = conn.cursor()

    if is_postgres:
        # PostgreSQL Schema
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            unit TEXT NOT NULL DEFAULT 'Vials',
            current_stock REAL NOT NULL DEFAULT 0.0,
            min_stock_level REAL NOT NULL DEFAULT 10.0,
            max_stock_capacity REAL NOT NULL DEFAULT 100.0,
            unit_price REAL NOT NULL DEFAULT 0.0,
            lead_time_days INTEGER NOT NULL DEFAULT 3,
            supplier TEXT NOT NULL DEFAULT 'Coven Unknown',
            spookiness_level INTEGER NOT NULL DEFAULT 3,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS consumption_logs (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            quantity REAL NOT NULL,
            logged_by TEXT NOT NULL DEFAULT 'High Necromancer',
            reason TEXT DEFAULT 'Midnight Demand',
            is_anomaly BOOLEAN NOT NULL DEFAULT false,
            created_at TEXT NOT NULL
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT DEFAULT '{}',
            acknowledged BOOLEAN NOT NULL DEFAULT false,
            created_at TEXT NOT NULL
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS scheduled_shipments (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            expected_delivery_date TEXT NOT NULL,
            days_until_arrival INTEGER NOT NULL DEFAULT 3,
            quantity REAL NOT NULL DEFAULT 10.0,
            days_until_stockout REAL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            supplier TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        """)

    else:
        # SQLite Schema
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            unit TEXT NOT NULL DEFAULT 'Vials',
            current_stock REAL NOT NULL DEFAULT 0.0,
            min_stock_level REAL NOT NULL DEFAULT 10.0,
            max_stock_capacity REAL NOT NULL DEFAULT 100.0,
            unit_price REAL NOT NULL DEFAULT 0.0,
            lead_time_days INTEGER NOT NULL DEFAULT 3,
            supplier TEXT NOT NULL DEFAULT 'Coven Unknown',
            spookiness_level INTEGER NOT NULL DEFAULT 3,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS consumption_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            quantity REAL NOT NULL,
            logged_by TEXT NOT NULL DEFAULT 'High Necromancer',
            reason TEXT DEFAULT 'Midnight Demand',
            is_anomaly INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            type TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT DEFAULT '{}',
            acknowledged INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
        """)

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

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_consumption_product_date ON consumption_logs(product_id, date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(acknowledged, severity);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shipments_date ON scheduled_shipments(expected_delivery_date);")

    conn.commit()
    conn.close()

def row_to_dict(row: Any) -> Dict[str, Any]:
    """Converts a database row (sqlite3.Row or psycopg2 DictRow) to a standard dict."""
    if hasattr(row, "keys"):
        return {k: row[k] for k in row.keys()}
    if isinstance(row, dict):
        return row
    return dict(row)
