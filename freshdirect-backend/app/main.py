import logging  # noqa: F401 — keep for uvicorn log config
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.redis_client import get_redis, close_redis
from app.api.v1.router import api_router
from app.api.admin import router as admin_router
from app.api.rider import router as rider_router
from app.middleware import RequestLoggingMiddleware

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await get_redis()  # warm up redis pool
    yield
    await close_redis()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Gmart grocery delivery API — FastAPI + PostgreSQL + Redis",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# Catch-all so unhandled exceptions always return a JSON response. We append
# CORS headers explicitly because BaseHTTPMiddleware (RequestLoggingMiddleware)
# can cause exception responses to bypass CORSMiddleware in some Starlette
# versions, leading to browser "No Access-Control-Allow-Origin" errors.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc!r}")
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in settings.ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(status_code=500, content={"detail": "Internal server error"}, headers=headers)


# ── Middleware ────────────────────────────────────────────────────────────────
# Order matters: last add_middleware call becomes the OUTERMOST wrapper.
# CORSMiddleware must be outermost so it adds headers even when inner
# middleware (RequestLoggingMiddleware uses BaseHTTPMiddleware) re-raises.
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(api_router)
app.include_router(admin_router)
app.include_router(rider_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    try:
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {
        "status": "healthy",
        "redis": "ok" if redis_ok else "error",
        "environment": settings.ENVIRONMENT,
    }
