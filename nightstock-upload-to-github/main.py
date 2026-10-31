"""
NIGHTSTOCK — The Inventory of the Damned
Main FastAPI Server & Application Entrypoint
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db, get_db, get_db_info
from backend.data_loader import load_real_dataset
from backend.api import router as api_router

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
WITCH_PANTRY_DIR = os.path.join(BASE_DIR, "witch-potion-pantry")

app = FastAPI(
    title="NIGHTSTOCK 🎃 — The Inventory of the Damned",
    description="Smart Inventory Management & Demand Prediction Engine for College Hackathons.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for development and demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Backend API Router
app.include_router(api_router)

# Mount Static Files (CSS, JS, Assets)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Mount The Witch's Potion Pantry (React 19 App)
if os.path.exists(WITCH_PANTRY_DIR):
    app.mount("/witch-pantry", StaticFiles(directory=WITCH_PANTRY_DIR, html=True), name="witch-pantry")


@app.on_event("startup")
def startup_event():
    """Initializes database schemas (Supabase PostgreSQL / SQLite fallback)."""
    print("🎃 [NIGHTSTOCK] Initializing database...")
    init_db()
    info = get_db_info()
    provider = info.get("provider", "Database")
    engine = info.get("engine", "unknown")
    count = info.get("products_count", 0)
    print(f"✨ [NIGHTSTOCK] Database ready: {provider} ({engine.upper()}) with {count} active products.")


@app.get("/")
def serve_home():
    """Serves the primary Single Page Application dashboard."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "NIGHTSTOCK API is running. Visit /docs for Swagger API documentation."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"🦇 Summoning NIGHTSTOCK at http://127.0.0.1:{port} ...")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
