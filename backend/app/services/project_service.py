import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.ranking import RankingEntry
from app.models.media import MediaAsset
from app.schemas.project import ProjectCreate, ProjectUpdate

class ProjectService:
    @staticmethod
    def get_all_projects(db: Session, user_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        query = db.query(Project)
        if user_id:
            query = query.filter((Project.user_id == user_id) | (Project.user_id.is_(None)))
        else:
            query = query.filter(Project.user_id.is_(None))
        projects = query.order_by(Project.updated_at.desc()).offset(skip).limit(limit).all()
        result = []
        for p in projects:
            entries_count = len(p.ranking_entries)
            total_dur = sum(
                (e.trim_end - e.trim_start) if (e.trim_end and e.trim_end > e.trim_start) else e.display_duration
                for e in p.ranking_entries
            )
            result.append({
                "id": p.id,
                "name": p.name,
                "aspect_ratio": p.aspect_ratio,
                "resolution_width": p.resolution_width,
                "resolution_height": p.resolution_height,
                "fps": p.fps,
                "title_config": p.title_config or {},
                "ranking_config": p.ranking_config or {},
                "footer_config": p.footer_config or {},
                "audio_config": p.audio_config or {},
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "ranking_entries_count": entries_count,
                "total_duration": round(total_dur, 2)
            })
        return result

    @staticmethod
    def get_project_by_id(db: Session, project_id: str) -> Optional[Project]:
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def create_project(db: Session, create_data: ProjectCreate, user_id: Optional[str] = None) -> Project:
        project = Project(
            name=create_data.name or "Top 5 Ultimate Ranking",
            aspect_ratio=create_data.aspect_ratio or "9:16",
            resolution_width=1080,
            resolution_height=1920,
            fps=30,
            user_id=user_id
        )

        # Customization depending on template type
        if create_data.template_type == "countdown":
            project.title_config = {
                "line1": "COUNTDOWN",
                "line2": "TOP 5 REVEAL",
                "line1_color": "#EF4444",
                "line2_color": "#FFFFFF",
                "words": [
                    {"text": "COUNTDOWN", "color": "#EF4444"},
                    {"text": "TOP", "color": "#FACC15"},
                    {"text": "5", "color": "#38BDF8"},
                    {"text": "REVEAL", "color": "#FFFFFF"}
                ],
                "font_size": 48,
                "banner_height": 220,
                "banner_bg": "#000000",
                "text_outline_color": "#000000",
                "text_outline_width": 3,
                "uppercase": True
            }

        db.add(project)
        db.commit()
        db.refresh(project)

        # Seed initial 5 ranking entries
        default_entries = [
            {"pos": 1, "num": "1", "label": "Champion Entry", "dur": 3.5},
            {"pos": 2, "num": "2", "label": "Runner Up", "dur": 3.5},
            {"pos": 3, "num": "3", "label": "Third Spot", "dur": 3.5},
            {"pos": 4, "num": "4", "label": "Fourth Contender", "dur": 3.5},
            {"pos": 5, "num": "5", "label": "Honorable Mention", "dur": 3.5},
        ]
        for item in default_entries:
            entry = RankingEntry(
                project_id=project.id,
                position=item["pos"],
                display_number=item["num"],
                custom_label=item["label"],
                display_duration=item["dur"],
                fit_mode="contain"
            )
            db.add(entry)

        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def update_project(db: Session, project: Project, update_data: ProjectUpdate) -> Project:
        if update_data.name is not None:
            project.name = update_data.name
        if update_data.aspect_ratio is not None:
            project.aspect_ratio = update_data.aspect_ratio
            if update_data.aspect_ratio == "9:16":
                project.resolution_width = 1080
                project.resolution_height = 1920
            elif update_data.aspect_ratio == "16:9":
                project.resolution_width = 1920
                project.resolution_height = 1080
            elif update_data.aspect_ratio == "1:1":
                project.resolution_width = 1080
                project.resolution_height = 1080
        if update_data.resolution_width is not None:
            project.resolution_width = update_data.resolution_width
        if update_data.resolution_height is not None:
            project.resolution_height = update_data.resolution_height
        if update_data.fps is not None:
            project.fps = update_data.fps
        if update_data.title_config is not None:
            project.title_config = update_data.title_config
        if update_data.ranking_config is not None:
            project.ranking_config = update_data.ranking_config
        if update_data.footer_config is not None:
            project.footer_config = update_data.footer_config
        if update_data.audio_config is not None:
            project.audio_config = update_data.audio_config

        db.commit()
        db.refresh(project)
        return project

    @classmethod
    def delete_project(cls, db: Session, project_or_id: Any) -> bool:
        if isinstance(project_or_id, str):
            project = db.query(Project).filter(Project.id == project_or_id).first()
            if not project:
                return False
        else:
            project = project_or_id
        db.delete(project)
        db.commit()
        return True

# Aliases for flexible calling
ProjectService.get_project = ProjectService.get_project_by_id
ProjectService.get_projects = ProjectService.get_all_projects
