"""
ONA Tool — FastAPI Backend
Run: uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import network, metrics, recommendations, optimization

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI(
    title="ONA Tool API",
    description="Organisational Network Analysis — signed networks, frustration index, organisational cost",
    version="1.0.0",
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("\n[!!! 422 ERROR DETECTED !!!]")
    print(f"Errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(network.router,         prefix="/api")
app.include_router(metrics.router,         prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(optimization.router,    prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ONA Tool API v1.0"}
