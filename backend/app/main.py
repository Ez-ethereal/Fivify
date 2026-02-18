"""
Eli5y Backend - FastAPI Application
Main entry point for the Eli5y API server.
"""
import logging
import sys
from contextlib import asynccontextmanager

# Configure logging BEFORE importing app modules
# This ensures our loggers get the correct level
log_level = logging.DEBUG
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(levelname)s:    %(name)s - %(message)s"))

# Configure the root logger for our app namespace
app_logger = logging.getLogger("app")
app_logger.setLevel(log_level)
app_logger.addHandler(handler)
app_logger.propagate = False  # Don't duplicate to root logger

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from app.config import settings
from app.api import ocr, parse, chat
from dotenv import load_dotenv
load_dotenv()


@asynccontextmanager
async def lifespan(app):
    app.state.openai = AsyncOpenAI(timeout=120.0)
    yield
    await app.state.openai.close()


# Create FastAPI application
app = FastAPI(
    title="Eli5y API",
    description="Semantic syntax highlighter for mathematical knowledge",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers from API modules
app.include_router(ocr.router, prefix="/api", tags=["OCR"])
app.include_router(parse.router, prefix="/api", tags=["Parse"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "message": "Eli5y API is running",
        "version": "0.1.0",
        "environment": settings.environment
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
