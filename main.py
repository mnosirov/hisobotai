import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

# Import the app from the correct location
from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
