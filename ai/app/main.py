"""StudIX AI service — FastAPI entry point.

Exposes:
- /health           liveness
- /risk/*           student risk prediction
- /recommend/*      content-based recommendations
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .db import close_pool, get_pool
from .risk.routes import router as risk_router
from .recommend.routes import router as recommend_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("studix.ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting StudIX AI service")
    pool = get_pool()
    log.info("DB pool ready (min=%d, max=%d)", pool.min_size, pool.max_size)
    yield
    log.info("Shutting down")
    close_pool()


app = FastAPI(title="StudIX AI", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    try:
        with get_pool().connection() as c:
            with c.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return {"status": "ok", "db": "ok"}
    except Exception as e:  # pragma: no cover
        log.exception("Health check DB failure")
        return {"status": "degraded", "db": str(e)}


app.include_router(risk_router, prefix="/risk", tags=["risk"])
app.include_router(recommend_router, prefix="/recommend", tags=["recommend"])
