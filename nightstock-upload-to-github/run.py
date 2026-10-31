"""
NIGHTSTOCK Launcher Script 🎃
One-click run script for beginner college hackathon teams.
Automatically initializes environment, database, and launches browser!
"""
import sys
import os
import subprocess
import time
import webbrowser

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(PROJECT_ROOT)

BANNER = r"""
  _   _ _____ _____ _    _ _______ _____ _______   _____ _  __
 | \ | |_   _/ ____| |  | |__   __/ ____|__   __|/ ____| |/ /
 |  \| | | || |  __| |__| |  | | | (___    | |  | |    | ' / 
 | . ` | | || | |_ |  __  |  | |  \___ \   | |  | |    |  <  
 | |\  |_| || |__| | |  | |  | |  ____) |  | |  | |____| . \ 
 |_| \_|_____\_____|_|  |_|  |_| |_____/   |_|   \_____|_|\_\
                                                              
        🎃 NIGHTSTOCK — The Inventory of the Damned 🎃
        College Hackathon Edition • Smart Inventory & AI Demand
"""

def main():
    print(BANNER)
    print("🦇 Preparing The Crypt...")

    venv_python = os.path.join(PROJECT_ROOT, "venv", "bin", "python")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    # Ensure database is initialized
    print("🔮 Verifying clean SQLite database...")
    try:
        from backend.database import init_db, get_db
        init_db()
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM products;")
        count = cursor.fetchone()[0]
        conn.close()
        print(f"✨ Clean database ready for manual testing ({count} products registered). Zero mock data.")
    except Exception as e:
        print(f"⚠️ Notice on database init: {e}")

    port = 8000
    url = f"http://127.0.0.1:{port}"
    print(f"\n🚀 Summoning NIGHTSTOCK at: {url}")
    print("📖 Interactive API Docs at:  http://127.0.0.1:8000/docs")
    print("Press Ctrl+C to banish server.\n")

    # Open browser after a brief delay
    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(url)
        except Exception:
            pass

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # Launch Uvicorn
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)


if __name__ == "__main__":
    main()
