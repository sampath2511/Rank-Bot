import React, { useRef } from 'react';
import { Play, Pause, Film, Music, Clock } from 'lucide-react';
import { RankingEntry, Project } from '../types';

interface TimelineProps {
  project: Project;
  entries: RankingEntry[];
  activeEntryIndex: number;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSelectEntry: (index: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  entries,
  activeEntryIndex,
  currentTime,
  totalDuration,
  isPlaying,
  onPlayPause,
  onSeek,
  onSelectEntry,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current || totalDuration <= 0) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const targetTime = (clickX / rect.width) * totalDuration;
    onSeek(targetTime);
  };

  // Playhead position percentage
  const playheadPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Generate ruler markers
  const markers = [];
  const step = Math.max(1, Math.ceil(totalDuration / 10));
  for (let t = 0; t <= Math.ceil(totalDuration); t += step) {
    const leftPct = totalDuration > 0 ? (t / totalDuration) * 100 : 0;
    markers.push({ time: t, left: leftPct });
  }

  return (
    <div className="h-44 bg-studio-950 border-t border-studio-800 flex flex-col select-none">
      {/* Timeline Controls & Info Header */}
      <div className="px-4 py-2 border-b border-studio-800/80 bg-studio-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            className="w-7 h-7 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-yellow-400 font-bold">{currentTime.toFixed(1)}s</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{totalDuration.toFixed(1)}s</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Film size={12} className="text-yellow-400" />
            <span>{entries.length} Ranking Clips</span>
          </div>
          {project.audio_config?.bgm_asset_id && (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Music size={12} />
              <span>BGM Active ({Math.round(project.audio_config.bgm_volume * 100)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Tracks Area */}
      <div 
        ref={rulerRef}
        onClick={handleTimelineClick}
        className="relative flex-1 p-3 cursor-pointer overflow-hidden flex flex-col justify-between"
      >
        {/* Time Ruler */}
        <div className="relative w-full h-4 border-b border-studio-800/60 mb-1">
          {markers.map((m) => (
            <div 
              key={m.time} 
              className="absolute top-0 flex flex-col items-center -translate-x-1/2 pointer-events-none"
              style={{ left: `${m.left}%` }}
            >
              <span className="text-[9px] font-mono text-slate-500">{m.time}s</span>
              <div className="w-[1px] h-1.5 bg-studio-700 mt-0.5" />
            </div>
          ))}
        </div>

        {/* Video Segments Track */}
        <div className="relative w-full h-16 bg-studio-900/80 rounded-xl border border-studio-800 overflow-hidden flex">
          {entries.map((entry, idx) => {
            const entryDur = (entry.trim_end && entry.trim_end > entry.trim_start)
              ? entry.trim_end - entry.trim_start
              : entry.display_duration;
            const widthPct = totalDuration > 0 ? (entryDur / totalDuration) * 100 : (100 / entries.length);
            const isActive = idx === activeEntryIndex;

            return (
              <div
                key={entry.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEntry(idx);
                }}
                style={{ width: `${widthPct}%` }}
                className={`relative h-full border-r border-studio-800/80 p-1.5 transition-all flex flex-col justify-between group ${
                  isActive 
                    ? 'bg-yellow-400/20 border-yellow-400 shadow-inner' 
                    : 'bg-studio-850 hover:bg-studio-800'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className={`px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-yellow-400 text-black' : 'bg-studio-800 text-slate-300'
                  }`}>
                    #{entry.display_number || (idx + 1)}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {entryDur.toFixed(1)}s
                  </span>
                </div>

                <p className="text-[10px] text-slate-300 font-medium truncate">
                  {entry.custom_label || `Slot #${entry.display_number || (idx + 1)}`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Audio Track (BGM) */}
        <div className="relative w-full h-6 mt-1.5 bg-studio-900/60 rounded-lg border border-studio-800/80 overflow-hidden flex items-center px-3">
          {project.audio_config?.bgm_asset_id ? (
            <div className="w-full flex items-center justify-between text-[10px] text-emerald-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Music size={11} />
                Background Music Track
              </span>
              <span>{totalDuration.toFixed(1)}s</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-600 italic">
              No background music selected (Configure in Audio Inspector)
            </span>
          )}
        </div>

        {/* Interactive Playhead Needle */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-30 pointer-events-none drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"
          style={{ left: `${playheadPercent}%` }}
        >
          {/* Top Pin Header */}
          <div className="w-3.5 h-3.5 bg-yellow-400 rotate-45 -translate-x-[5px] -translate-y-1 shadow-md" />
        </div>
      </div>
    </div>
  );
};
