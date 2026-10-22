import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image, ImageDraw, ImageFont

class OverlayGenerator:
    @staticmethod
    def _get_font(size: int, bold: bool = True) -> ImageFont.ImageFont:
        """Find a bold Impact/Arial font on the system or fall back safely."""
        candidate_fonts = [
            "C:/Windows/Fonts/impact.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/seguiemj.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/HelveticaNeue.ttc"
        ]
        for font_path in candidate_fonts:
            if os.path.exists(font_path):
                try:
                    return ImageFont.truetype(font_path, size)
                except Exception:
                    continue
        try:
            return ImageFont.load_default()
        except Exception:
            return None

    @classmethod
    def generate_segment_overlay(
        cls,
        output_path: Any,
        canvas_width: int = 1080,
        canvas_height: int = 1920,
        title_config: Optional[Dict[str, Any]] = None,
        ranking_config: Optional[Dict[str, Any]] = None,
        footer_config: Optional[Dict[str, Any]] = None,
        all_ranking_numbers: Optional[List[str]] = None,
        active_index: int = 0,
        **kwargs
    ) -> Path:
        """
        Generate a transparent PNG overlay containing:
        1. Top Header Banner with multicolored text
        2. Vertical ranking numbers on the left with active highlight
        3. Bottom Footer banner (if enabled)
        """
        # Support alternative kwargs names
        if "width" in kwargs:
            canvas_width = int(kwargs["width"])
        if "height" in kwargs:
            canvas_height = int(kwargs["height"])
        if title_config is None:
            title_config = kwargs.get("title_config", {})
        if ranking_config is None:
            ranking_config = kwargs.get("ranking_config", {})
        if footer_config is None:
            footer_config = kwargs.get("footer_config", {})

        if all_ranking_numbers is None:
            if "all_positions" in kwargs:
                all_ranking_numbers = [
                    str(p.get("display_number", p.get("position", idx + 1)))
                    for idx, p in enumerate(kwargs["all_positions"])
                ]
            else:
                all_ranking_numbers = ["1", "2", "3", "4", "5"]

        if "active_position" in kwargs:
            active_index = max(0, int(kwargs["active_position"]) - 1)

        output_path = Path(output_path)
        # Create 32-bit RGBA image
        img = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # ----------------------------------------------------
        # 1. HEADER BANNER
        # ----------------------------------------------------
        banner_h = int(title_config.get("banner_height", 220))
        banner_bg = title_config.get("banner_bg", "#000000")
        
        # Parse hex color for banner background
        try:
            bg_hex = banner_bg.lstrip("#")
            bg_rgb = tuple(int(bg_hex[i:i+2], 16) for i in (0, 2, 4))
            # Opaque banner background
            draw.rectangle([0, 0, canvas_width, banner_h], fill=(*bg_rgb, 255))
        except Exception:
            draw.rectangle([0, 0, canvas_width, banner_h], fill=(0, 0, 0, 255))

        # Bottom gold/accent separator line for header
        draw.line([0, banner_h, canvas_width, banner_h], fill=(250, 204, 21, 255), width=4)

        # Title font
        font_size = int(title_config.get("font_size", 48))
        # Scale font proportionally to canvas width
        scaled_font_size = int(font_size * (canvas_width / 1080.0))
        title_font = cls._get_font(scaled_font_size, bold=True)

        line1 = str(title_config.get("line1", "RANKING BEST"))
        line2 = str(title_config.get("line2", "MOMENTS EVER"))
        if title_config.get("uppercase", True):
            line1 = line1.upper()
            line2 = line2.upper()

        line1_color = title_config.get("line1_color", "#FACC15")
        line2_color = title_config.get("line2_color", "#FFFFFF")
        outline_color = title_config.get("text_outline_color", "#000000")
        outline_w = int(title_config.get("text_outline_width", 3))

        # Check if custom word colors are provided
        words_config = title_config.get("words")
        
        def hex_to_rgb(hex_str: str, default=(255, 255, 255)):
            try:
                h = hex_str.lstrip("#")
                return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
            except Exception:
                return default

        # Draw Title Lines
        line_gap = int(scaled_font_size * 1.15)
        start_y = int((banner_h - (line_gap * 2)) / 2) + 10

        def draw_text_with_outline(draw_ctx, x, y, text, fill_rgb, outline_rgb, width=3):
            # Draw outline
            for dx in range(-width, width + 1):
                for dy in range(-width, width + 1):
                    if dx != 0 or dy != 0:
                        draw_ctx.text((x + dx, y + dy), text, font=title_font, fill=(*outline_rgb, 255))
            # Draw text
            draw_ctx.text((x, y), text, font=title_font, fill=(*fill_rgb, 255))

        out_rgb = hex_to_rgb(outline_color, (0, 0, 0))

        # Draw Line 1
        bbox1 = draw.textbbox((0, 0), line1, font=title_font)
        w1 = bbox1[2] - bbox1[0]
        x1 = max(20, int((canvas_width - w1) / 2))
        draw_text_with_outline(draw, x1, start_y, line1, hex_to_rgb(line1_color, (250, 204, 21)), out_rgb, outline_w)

        # Draw Line 2
        bbox2 = draw.textbbox((0, 0), line2, font=title_font)
        w2 = bbox2[2] - bbox2[0]
        x2 = max(20, int((canvas_width - w2) / 2))
        draw_text_with_outline(draw, x2, start_y + line_gap, line2, hex_to_rgb(line2_color, (255, 255, 255)), out_rgb, outline_w)

        # ----------------------------------------------------
        # 2. VERTICAL RANKING NUMBERS ALONG LEFT
        # ----------------------------------------------------
        num_font_size = int(ranking_config.get("font_size", 54) * (canvas_width / 1080.0))
        num_font = cls._get_font(num_font_size, bold=True)
        active_font = cls._get_font(int(num_font_size * 1.18), bold=True)

        left_m = int(ranking_config.get("left_margin", 40) * (canvas_width / 1080.0))
        top_m = banner_h + int(ranking_config.get("top_margin", 60) * (canvas_height / 1920.0))
        spacing = int(ranking_config.get("spacing", 85) * (canvas_height / 1920.0))

        active_rgb = hex_to_rgb(ranking_config.get("active_color", "#FACC15"), (250, 204, 21))
        inactive_rgb = hex_to_rgb(ranking_config.get("inactive_color", "#94A3B8"), (148, 163, 184))
        num_out_rgb = hex_to_rgb(ranking_config.get("outline_color", "#000000"), (0, 0, 0))
        num_out_w = int(ranking_config.get("outline_width", 4))

        show_all = ranking_config.get("show_all_numbers", True)
        highlight_active = ranking_config.get("highlight_active", True)

        for idx, num_str in enumerate(all_ranking_numbers):
            if not show_all and idx != active_index:
                continue

            is_active = (idx == active_index)
            cur_y = top_m + (idx * spacing)
            cur_font = active_font if (is_active and highlight_active) else num_font
            cur_fill = active_rgb if (is_active and highlight_active) else inactive_rgb
            cur_alpha = 255 if is_active else 190

            # If active, optionally draw a glowing badge pill behind it
            if is_active and highlight_active:
                pill_bbox = draw.textbbox((left_m, cur_y), num_str, font=cur_font)
                px0, py0, px1, py1 = pill_bbox
                draw.rounded_rectangle(
                    [left_m - 12, py0 - 6, px1 + 16, py1 + 6],
                    radius=12,
                    fill=(0, 0, 0, 180),
                    outline=(*active_rgb, 220),
                    width=2
                )

            # Draw number outline
            for dx in range(-num_out_w, num_out_w + 1):
                for dy in range(-num_out_w, num_out_w + 1):
                    if dx != 0 or dy != 0:
                        draw.text((left_m + dx, cur_y + dy), num_str, font=cur_font, fill=(*num_out_rgb, 240))
            
            # Draw number text
            draw.text((left_m, cur_y), num_str, font=cur_font, fill=(*cur_fill, cur_alpha))

        # ----------------------------------------------------
        # 3. OPTIONAL FOOTER BANNER
        # ----------------------------------------------------
        if footer_config.get("enabled", True):
            footer_h = int(footer_config.get("height", 110) * (canvas_height / 1920.0))
            footer_y = canvas_height - footer_h
            footer_bg = footer_config.get("bg_color", "#000000")
            f_bg_rgb = hex_to_rgb(footer_bg, (0, 0, 0))

            # Footer background
            draw.rectangle([0, footer_y, canvas_width, canvas_height], fill=(*f_bg_rgb, 240))
            # Top accent line
            draw.line([0, footer_y, canvas_width, footer_y], fill=(250, 204, 21, 200), width=3)

            # Footer text
            f_font_size = int(32 * (canvas_width / 1080.0))
            f_font = cls._get_font(f_font_size, bold=True)
            cta_font_size = int(24 * (canvas_width / 1080.0))
            cta_font = cls._get_font(cta_font_size, bold=False)

            channel_text = footer_config.get("channel_name", "@RankStudio")
            cta_text = footer_config.get("cta_text", "SUBSCRIBE FOR MORE")

            # Draw channel text
            draw.text((36, footer_y + 20), channel_text, font=f_font, fill=(255, 255, 255, 255))
            # Draw CTA text
            cta_bbox = draw.textbbox((0, 0), cta_text, font=cta_font)
            cta_w = cta_bbox[2] - cta_bbox[0]
            draw.text((canvas_width - cta_w - 36, footer_y + 26), cta_text, font=cta_font, fill=(250, 204, 21, 255))

        # Save transparent overlay PNG
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, "PNG")
        return output_path
