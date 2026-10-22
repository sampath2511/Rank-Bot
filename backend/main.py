"""
Entrypoint for Vercel deployment and ASGI servers.
"""
from app.main import app

__all__ = ["app"]
