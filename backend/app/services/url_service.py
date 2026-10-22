import re
import urllib.parse
import ipaddress
import socket
from typing import Dict, Any, Optional
import requests
from fastapi import HTTPException

ALLOWED_DOMAINS = [
    "youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com",
    "tiktok.com", "www.tiktok.com", "vm.tiktok.com",
    "instagram.com", "www.instagram.com",
    "facebook.com", "www.facebook.com", "fb.watch",
    "twitter.com", "x.com", "vimeo.com"
]

class UrlImportService:
    @staticmethod
    def is_safe_url(url_str: str) -> bool:
        """Validate that URL doesn't point to localhost, private IP ranges, or unsafe schemes."""
        try:
            parsed = urllib.parse.urlparse(url_str)
            if parsed.scheme not in ("http", "https"):
                return False

            hostname = parsed.hostname
            if not hostname:
                return False

            # Check if domain matches allowed social platforms or generic safe media link
            is_allowed_domain = any(hostname == d or hostname.endswith("." + d) for d in ALLOWED_DOMAINS)
            
            # Resolve DNS to check IP for SSRF protection
            ip_str = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_str)

            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local:
                return False

            return True
        except Exception:
            return False

    @classmethod
    def inspect_url(cls, url: str) -> Dict[str, Any]:
        """Inspect and parse metadata from a social media or direct video URL."""
        if not cls.is_safe_url(url):
            raise HTTPException(
                status_code=400,
                detail="Security validation failed: Invalid URL or prohibited internal network destination."
            )

        parsed = urllib.parse.urlparse(url)
        hostname = (parsed.hostname or "").lower()

        # Identify platform
        platform = "Web"
        if "youtube.com" in hostname or "youtu.be" in hostname:
            platform = "YouTube"
        elif "tiktok.com" in hostname:
            platform = "TikTok"
        elif "instagram.com" in hostname:
            platform = "Instagram"
        elif "facebook.com" in hostname or "fb.watch" in hostname:
            platform = "Facebook"
        elif "twitter.com" in hostname or "x.com" in hostname:
            platform = "X / Twitter"

        result = {
            "platform": platform,
            "url": url,
            "can_direct_download": False,
            "title": f"Imported {platform} Clip",
            "thumbnail_url": None,
            "duration": None,
            "message": ""
        }

        # For YouTube, fetch oEmbed metadata safely
        if platform == "YouTube":
            try:
                oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(url)}&format=json"
                resp = requests.get(oembed_url, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    result["title"] = data.get("title", result["title"])
                    result["thumbnail_url"] = data.get("thumbnail_url")
            except Exception:
                pass
            result["message"] = (
                "Metadata retrieved. To import high-definition video without platform rate-limiting or copyright restrictions, "
                "we recommend downloading the clip using your preferred tool and uploading the MP4 directly into RankStudio."
            )

        elif platform in ("TikTok", "Instagram", "Facebook"):
            result["message"] = (
                f"{platform} enforces strict authentication and download protections. "
                "Please download the video to your device first, then upload it into your project."
            )
        else:
            result["message"] = "URL verified. If this is a direct media link, you can download it and upload to the media library."

        return result
