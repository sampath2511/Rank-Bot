import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Sparkles } from 'lucide-react';
import { Project, RankingEntry } from '../types';
import { soundEffects } from '../services/soundEffects';
import { getMediaUrl } from '../services/api';

interface CanvasPreviewProps {
  project: Project;
  entries: RankingEntry[];
  activeEntryIndex: number;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onEntrySelect: (index: number) => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  project,
  entries,
  activeEntryIndex,
  currentTime,
  totalDuration,
  isPlaying,
  onPlayPause,
  onSeek,
  onEntrySelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const prevIndexRef = useRef(activeEntryIndex);

  const activeEntry = entries[activeEntryIndex];
  const titleConfig = project.title_config;
  const rankingConfig = project.ranking_config;
  const footerConfig = project.footer_config;

  // Play transition sound effect when switching ranking entry during playback
  useEffect(() => {
    if (isPlaying && prevIndexRef.current !== activeEntryIndex && !isMuted) {
      const sfx = project.audio_config?.transition_sfx;
      if (sfx && sfx !== 'none') {
        soundEffects.playEffect(sfx, project.audio_config?.sfx_volume ?? 0.7);
      }
    }
    prevIndexRef.current = activeEntryIndex;
  }, [activeEntryIndex, isPlaying, isMuted, project.audio_config]);

  // Sync video element time and playback with global timeline state
  useEffect(() => {
    if (videoRef.current && activeEntry?.asset?.media_type === 'video') {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, activeEntryIndex]);

  // Format seconds to mm:ss.S
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Determine aspect ratio class
  const getAspectRatioClasses = () => {
    switch (project.aspect_ratio) {
      case '16:9':
        return 'aspect-video w-full max-w-3xl';
      case '1:1':
        return 'aspect-square h-full max-h-[580px]';
      case '9:16':
      default:
        return 'aspect-[9/16] h-full max-h-[640px]';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 select-none">
      {/* 9:16 Canvas Box */}
      <div 
        ref={containerRef}
        className={`relative ${getAspectRatioClasses()} bg-black rounded-2xl overflow-hidden shadow-2xl border border-studio-700/60 flex flex-col justify-between`}
      >
        {/* ---------------- 1. HEADER BANNER ---------------- */}
        <div 
          className="relative z-20 w-full flex flex-col items-center justify-center px-4 py-3 border-b-4 border-yellow-400 shrink-0"
          style={{
            backgroundColor: titleConfig.banner_bg || '#000000',
            minHeight: `${Math.max(64, Math.round((titleConfig.banner_height || 220) * 0.38))}px`,
          }}
        >
          {/* Title Line 1 */}
          <div 
            className="font-impact-title text-center font-extrabold uppercase title-stroke tracking-wide leading-none"
            style={{
              fontSize: `${Math.max(16, Math.round((titleConfig.font_size || 48) * 0.44))}px`,
              color: titleConfig.line1_color || '#FACC15',
            }}
          >
            {titleConfig.words && titleConfig.words.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {titleConfig.words.slice(0, Math.ceil(titleConfig.words.length / 2)).map((w, idx) => (
                  <span key={idx} style={{ color: w.color }}>{w.text}</span>
                ))}
              </div>
            ) : (
              titleConfig.line1 || 'RANKING BEST'
            )}
          </div>

          {/* Title Line 2 */}
          <div 
            className="font-impact-title text-center font-extrabold uppercase title-stroke tracking-wide leading-none mt-1"
            style={{
              fontSize: `${Math.max(16, Math.round((titleConfig.font_size || 48) * 0.44))}px`,
              color: titleConfig.line2_color || '#FFFFFF',
            }}
          >
            {titleConfig.words && titleConfig.words.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {titleConfig.words.slice(Math.ceil(titleConfig.words.length / 2)).map((w, idx) => (
                  <span key={idx} style={{ color: w.color }}>{w.text}</span>
                ))}
              </div>
            ) : (
              titleConfig.line2 || 'MOMENTS EVER'
            )}
          </div>
        </div>

        {/* ---------------- 2. MAIN MEDIA AREA ---------------- */}
        <div className="relative flex-1 w-full overflow-hidden bg-studio-950 flex items-center justify-center">
          {activeEntry?.asset ? (
            activeEntry.asset.media_type === 'video' ? (
              <video
                ref={videoRef}
                src={getMediaUrl(activeEntry.asset.file_path)}
                className={`w-full h-full ${
                  activeEntry.fit_mode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
                muted={isMuted || activeEntry.is_muted}
                playsInline
                loop
              />
            ) : (
              <img
                src={getMediaUrl(activeEntry.asset.file_path)}
                alt={activeEntry.custom_label}
                className={`w-full h-full ${
                  activeEntry.fit_mode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />
            )
          ) : (
            // Placeholder when slot has no asset attached
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-studio-800/80 border border-studio-600/50 flex items-center justify-center text-studio-accent animate-pulse">
                <Sparkles size={32} />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {activeEntry?.custom_label || `Ranking #${activeEntry?.display_number || (activeEntryIndex + 1)}`}
              </p>
              <p className="text-xs text-slate-500 max-w-[180px]">
                Drop video or image from the Media Library
              </p>
            </div>
          )}

          {/* ---------------- 3. VERTICAL RANKING NUMBERS (LEFT SIDE) ---------------- */}
          <div 
            className="absolute left-3 top-4 bottom-4 flex flex-col justify-start z-10 pointer-events-none space-y-2.5"
            style={{
              paddingLeft: `${Math.max(4, Math.round((rankingConfig.left_margin || 40) * 0.18))}px`,
            }}
          >
            {entries.map((entry, idx) => {
              const isActive = idx === activeEntryIndex;
              if (!rankingConfig.show_all_numbers && !isActive) return null;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center transition-all duration-200 ${
                    isActive && rankingConfig.highlight_active
                      ? 'scale-110 drop-shadow-[0_0_12px_rgba(250,204,21,0.65)]'
                      : 'opacity-70'
                  }`}
                >
                  <span
                    className="font-impact-title num-stroke font-black tracking-tight"
                    style={{
                      fontSize: `${Math.max(18, Math.round((rankingConfig.font_size || 52) * 0.45 * (isActive ? 1.2 : 1.0)))}px`,
                      color: isActive 
                        ? (rankingConfig.active_color || '#FACC15') 
                        : (rankingConfig.inactive_color || '#94A3B8'),
                    }}
                  >
                    {entry.display_number || (idx + 1)}.
                  </span>
                </div>
              );
            })}
          </div>

          {/* Active Segment Pill Indicator */}
          <div className="absolute right-3 top-3 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Rank #{activeEntry?.display_number || (activeEntryIndex + 1)}
          </div>
        </div>

        {/* ---------------- 4. FOOTER BANNER ---------------- */}
        {footerConfig.enabled && (
          <div 
            className="relative z-20 w-full flex items-center justify-between px-4 py-2.5 border-t-2 border-yellow-400/80 shrink-0"
            style={{
              backgroundColor: footerConfig.bg_color || '#000000',
              minHeight: `${Math.max(36, Math.round((footerConfig.height || 110) * 0.38))}px`,
            }}
          >
            <span className="text-xs font-bold text-white tracking-wider">
              {footerConfig.channel_name || '@RankStudio'}
            </span>
            <span className="text-[11px] font-bold text-yellow-400 tracking-wider uppercase">
              {footerConfig.cta_text || 'SUBSCRIBE'}
            </span>
          </div>
        )}
      </div>

      {/* ---------------- PREVIEW CONTROLS BAR ---------------- */}
      <div className="w-full max-w-md mt-3 px-4 py-2.5 bg-studio-900/90 backdrop-blur-md border border-studio-800 rounded-2xl flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className="w-9 h-9 rounded-xl bg-studio-accent hover:bg-studio-accent-hover text-white flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-indigo-900/40"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          {/* Replay */}
          <button
            onClick={() => onSeek(0)}
            className="p-2 text-slate-400 hover:text-white hover:bg-studio-800 rounded-lg transition-colors"
            title="Restart Video"
          >
            <RotateCcw size={16} />
          </button>

          {/* Audio Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-slate-400 hover:text-white hover:bg-studio-800 rounded-lg transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Time Stamp Display */}
        <div className="text-xs font-mono font-medium text-slate-300">
          <span className="text-white font-semibold">{formatTime(currentTime)}</span>
          <span className="text-slate-500 mx-1">/</span>
          <span className="text-slate-400">{formatTime(totalDuration)}</span>
        </div>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          className="p-2 text-slate-400 hover:text-white hover:bg-studio-800 rounded-lg transition-colors"
          title="Fullscreen Canvas"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
};
