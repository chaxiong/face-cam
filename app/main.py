from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import uvicorn
import os

from database import init_db, save_user, get_all_users
from face_logic import get_face_encodings, identify_face

app = FastAPI()

# Initialize DB on startup
@app.on_event("startup")
def startup_event():
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize database: {e}")

# Models
class TrainRequest(BaseModel):
    name: str
    image: str

class TestRequest(BaseModel):
    image: str

# Serve static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("app/static/index.html", "r") as f:
        return f.read()

@app.post("/train")
async def train(request: TrainRequest):
    encodings = get_face_encodings(request.image)
    if not encodings:
        raise HTTPException(status_code=400, detail="No face detected in the image.")
    
    # Take the first face detected
    success = save_user(request.name, encodings[0])
    if success:
        return {"message": f"Successfully trained for {request.name}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save to database.")

@app.post("/test")
async def test(request: TestRequest):
    encodings = get_face_encodings(request.image)
    if not encodings:
        return {"name": "No face detected"}
    
    known_users = get_all_users()
    name = identify_face(encodings[0], known_users)
    return {"name": name}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
