export interface WordStyle {
  text: string;
  color: string;
}

export interface TitleConfig {
  line1: string;
  line2: string;
  line1_color: string;
  line2_color: string;
  words?: WordStyle[];
  font_size: number;
  banner_height: number;
  banner_bg: string;
  text_outline_color: string;
  text_outline_width: number;
  uppercase: boolean;
}

export interface RankingConfig {
  font_size: number;
  active_color: string;
  inactive_color: string;
  outline_color: string;
  outline_width: number;
  left_margin: number;
  top_margin: number;
  spacing: number;
  show_all_numbers: boolean;
  highlight_active: boolean;
  badge_style: string;
}

export interface FooterConfig {
  enabled: boolean;
  channel_name: string;
  cta_text: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  height: number;
}

export interface AudioConfig {
  bgm_asset_id?: string | null;
  bgm_volume: number;
  original_volume: number;
  bgm_fade_in: number;
  bgm_fade_out: number;
  transition_sfx: string;
  sfx_volume?: number;
}

export interface MediaAsset {
  id: string;
  project_id?: string | null;
  media_type: 'video' | 'image' | 'audio';
  original_filename: string;
  storage_filename: string;
  file_path: string;
  thumbnail_path?: string | null;
  duration: number;
  width?: number | null;
  height?: number | null;
  file_size: number;
  mime_type: string;
  source_url?: string | null;
  created_at: string;
}

export interface RankingEntry {
  id: string;
  project_id: string;
  asset_id?: string | null;
  position: number;
  display_number: string;
  custom_label: string;
  trim_start: number;
  trim_end?: number | null;
  display_duration: number;
  fit_mode: 'cover' | 'contain' | 'blurred_bg';
  is_muted: boolean;
  transition_type: 'cut' | 'fade' | 'zoom' | 'slide';
  transition_duration: number;
  effective_duration: number;
  asset?: MediaAsset | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  aspect_ratio: string;
  resolution_width: number;
  resolution_height: number;
  fps: number;
  title_config: TitleConfig;
  ranking_config: RankingConfig;
  footer_config: FooterConfig;
  audio_config: AudioConfig;
  ranking_entries_count: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
}

export interface RenderJob {
  id: string;
  project_id: string;
  status: 'queued' | 'preparing' | 'rendering' | 'mixing' | 'validating' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  output_path?: string | null;
  output_url?: string | null;
  output_filename?: string | null;
  download_url?: string | null;
  file_size?: number | null;
  duration?: number | null;
  total_duration?: number | null;
  render_time_seconds?: number | null;
  resolution?: string;
  fps?: number;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}


export interface UrlImportResult {
  platform: string;
  url: string;
  can_direct_download: boolean;
  title: string;
  thumbnail_url?: string | null;
  message: string;
}
