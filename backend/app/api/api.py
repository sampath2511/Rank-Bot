from fastapi import APIRouter
from app.api.routes import projects, media, rankings, renders, health, auth

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(media.router, prefix="/media", tags=["Media"])
api_router.include_router(rankings.router, tags=["Rankings"])
api_router.include_router(renders.router, tags=["Renders"])

