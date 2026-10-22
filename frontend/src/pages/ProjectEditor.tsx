import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Undo2, 
  Redo2, 
  Check, 
  Layers, 
  Image as ImageIcon,
  Loader2,
  Tv,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Project, RankingEntry, MediaAsset } from '../types';
import { api } from '../services/api';
import { CanvasPreview } from '../editor/CanvasPreview';
import { RankingsList } from '../editor/RankingsList';
import { MediaLibrary } from '../editor/MediaLibrary';
import { InspectorPanel } from '../editor/InspectorPanel';
import { Timeline } from '../editor/Timeline';
import { ExportModal } from '../editor/ExportModal';

interface ProjectEditorProps {
  projectId: string;
  onBackToDashboard: () => void;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({
  projectId,
  onBackToDashboard,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Left sidebar tab: 'rankings' | 'media'
  const [leftTab, setLeftTab] = useState<'rankings' | 'media'>('rankings');

  // Active ranking entry index
  const [activeEntryIndex, setActiveEntryIndex] = useState(0);

  // Playback & Timeline state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playbackRafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Auto-save & Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(true);

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<{ project: Project; entries: RankingEntry[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initial Load
  const loadProjectData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [projData, rankData, mediaData] = await Promise.all([
        api.getProject(projectId),
        api.getRankings(projectId),
        api.getProjectMedia(projectId),
      ]);
      setProject(projData);
      setEntries(rankData);
      setMedia(mediaData);

      // Initialize history stack
      setHistory([{ project: projData, entries: rankData }]);
      setHistoryIndex(0);
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      setLoadError(err?.message || 'Failed to load project details. It may not exist or has been removed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Push new state to undo/redo history
  const pushHistory = (newProject: Project, newEntries: RankingEntry[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { project: newProject, entries: newEntries }];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      setProject(targetState.project);
      setEntries(targetState.entries);
      setHistoryIndex(historyIndex - 1);
      // Auto-save reverted state
      api.updateProject(projectId, targetState.project);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      setProject(targetState.project);
      setEntries(targetState.entries);
      setHistoryIndex(historyIndex + 1);
      // Auto-save advanced state
      api.updateProject(projectId, targetState.project);
    }
  };

  // Compute total project duration from entries
  const totalDuration = entries.reduce((acc, e) => {
    const dur = (e.trim_end && e.trim_end > e.trim_start)
      ? e.trim_end - e.trim_start
      : e.display_duration;
    return acc + Math.max(0.5, dur);
  }, 0);

  // Helper: compute entry time offset
  const getEntryTimeOffset = (targetIndex: number) => {
    let offset = 0;
    for (let i = 0; i < targetIndex && i < entries.length; i++) {
      const e = entries[i];
      const dur = (e.trim_end && e.trim_end > e.trim_start)
        ? e.trim_end - e.trim_start
        : e.display_duration;
      offset += dur;
    }
    return offset;
  };

  // Helper: find entry index corresponding to a given time
  const findEntryIndexByTime = useCallback((time: number) => {
    let accumulated = 0;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const dur = (e.trim_end && e.trim_end > e.trim_start)
        ? e.trim_end - e.trim_start
        : e.display_duration;
      if (time >= accumulated && time < accumulated + dur) {
        return i;
      }
      accumulated += dur;
    }
    return Math.max(0, entries.length - 1);
  }, [entries]);

  // Main Continuous Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
      lastTimeRef.current = null;
      return;
    }

    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setCurrentTime((prevTime) => {
        let nextTime = prevTime + deltaSec;
        if (nextTime >= totalDuration) {
          nextTime = 0; // Loop playback
        }
        // Update active entry index in sync with time
        const newIdx = findEntryIndexByTime(nextTime);
        if (newIdx !== activeEntryIndex) {
          setActiveEntryIndex(newIdx);
        }
        return nextTime;
      });

      playbackRafRef.current = requestAnimationFrame(step);
    };

    playbackRafRef.current = requestAnimationFrame(step);

    return () => {
      if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
    };
  }, [isPlaying, totalDuration, findEntryIndexByTime, activeEntryIndex]);

  // Seek handler
  const handleSeek = (targetTime: number) => {
    const clamped = Math.max(0, Math.min(targetTime, totalDuration));
    setCurrentTime(clamped);
    const newIdx = findEntryIndexByTime(clamped);
    setActiveEntryIndex(newIdx);
  };

  // Select entry and jump playhead to its start
  const handleSelectEntry = (index: number) => {
    setActiveEntryIndex(index);
    const offset = getEntryTimeOffset(index);
    setCurrentTime(offset);
  };

  // Update Project Config
  const handleUpdateProject = async (data: Partial<Project>) => {
    if (!project) return;
    const updated = { ...project, ...data };
    setProject(updated);
    pushHistory(updated, entries);

    setIsSaving(true);
    try {
      await api.updateProject(projectId, data);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to update project:', err);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Ranking Slot
  const handleAddEntry = async () => {
    try {
      const newEntry = await api.addRankingEntry(projectId, {
        position: entries.length + 1,
        display_number: `${entries.length + 1}`,
        custom_label: `Rank #${entries.length + 1}`,
        display_duration: 3.5,
      });
      const updatedEntries = [...entries, newEntry];
      setEntries(updatedEntries);
      setActiveEntryIndex(updatedEntries.length - 1);
      if (project) pushHistory(project, updatedEntries);
    } catch (err: any) {
      alert(`Could not add ranking entry: ${err.message}`);
    }
  };

  // Update Single Ranking Entry
  const handleUpdateEntry = async (entryId: string, data: Partial<RankingEntry>) => {
    try {
      const updated = await api.updateRankingEntry(entryId, data);
      const updatedEntries = entries.map((e) => (e.id === entryId ? updated : e));
      setEntries(updatedEntries);
      if (project) pushHistory(project, updatedEntries);
    } catch (err: any) {
      console.error('Failed to update ranking entry:', err);
    }
  };

  // Duplicate Ranking Entry
  const handleDuplicateEntry = async (entry: RankingEntry) => {
    try {
      const newEntry = await api.addRankingEntry(projectId, {
        position: entries.length + 1,
        display_number: `${entries.length + 1}`,
        custom_label: `${entry.custom_label} (Copy)`,
        display_duration: entry.display_duration,
        asset_id: entry.asset_id,
        fit_mode: entry.fit_mode,
        is_muted: entry.is_muted,
      });
      const updatedEntries = [...entries, newEntry];
      setEntries(updatedEntries);
      setActiveEntryIndex(updatedEntries.length - 1);
      if (project) pushHistory(project, updatedEntries);
    } catch (err: any) {
      alert(`Could not duplicate entry: ${err.message}`);
    }
  };

  // Delete Ranking Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (entries.length <= 1) {
      alert('A ranking video must have at least one ranking entry.');
      return;
    }
    try {
      await api.deleteRankingEntry(entryId);
      const updatedEntries = entries
        .filter((e) => e.id !== entryId)
        .map((e, idx) => ({
          ...e,
          position: idx + 1,
          display_number: `${idx + 1}`,
        }));
      setEntries(updatedEntries);
      setActiveEntryIndex((prev) => Math.min(prev, updatedEntries.length - 1));
      if (project) pushHistory(project, updatedEntries);
    } catch (err: any) {
      alert(`Failed to delete ranking entry: ${err.message}`);
    }
  };

  // Reorder Entries
  const handleReorderEntries = async (newEntries: RankingEntry[]) => {
    setEntries(newEntries);
    if (project) pushHistory(project, newEntries);

    try {
      const reorderPayload = newEntries.map((e) => ({
        id: e.id,
        position: e.position,
        display_number: e.display_number,
      }));
      await api.reorderRankings(projectId, reorderPayload);
    } catch (err: any) {
      console.error('Failed to save reordered rankings:', err);
    }
  };

  // Media Library callbacks
  const handleUploadSuccess = (newAssets: MediaAsset[]) => {
    setMedia((prev) => [...newAssets, ...prev]);
  };

  const handleDeleteMedia = async (assetId: string) => {
    try {
      await api.deleteMedia(assetId);
      setMedia((prev) => prev.filter((m) => m.id !== assetId));
      // Clear asset_id from entries using it
      setEntries((prev) =>
        prev.map((e) => (e.asset_id === assetId ? { ...e, asset_id: null, asset: null } : e))
      );
    } catch (err: any) {
      alert(`Failed to delete media asset: ${err.message}`);
    }
  };

  const handleAssignToActiveRank = async (assetId: string) => {
    const active = entries[activeEntryIndex];
    if (active) {
      const matchedAsset = media.find((m) => m.id === assetId);
      await handleUpdateEntry(active.id, {
        asset_id: assetId,
        display_duration: matchedAsset?.duration && matchedAsset.duration > 0 ? matchedAsset.duration : active.display_duration,
      });
      setLeftTab('rankings');
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-studio-950 flex flex-col items-center justify-center p-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-xl shadow-red-500/10">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-lg font-bold text-white tracking-tight">Project Could Not Be Loaded</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            {loadError}
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            The project ID ({projectId}) may have been removed, or the database container may have restarted.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={loadProjectData}
            className="flex items-center gap-2 px-4 py-2 bg-studio-800 hover:bg-studio-700 text-slate-200 text-xs font-semibold rounded-xl border border-studio-700 transition-colors"
          >
            <RotateCcw size={14} />
            Try Again
          </button>
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-extrabold rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
          >
            <ArrowLeft size={14} />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-studio-950 flex flex-col items-center justify-center space-y-3">
        <Loader2 size={40} className="text-yellow-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Loading studio workspace...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-studio-950 flex flex-col overflow-hidden text-slate-100">
      {/* ---------------- 1. TOP HEADER BAR ---------------- */}
      <header className="h-14 border-b border-studio-800 bg-studio-900/95 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-studio-800 hover:bg-studio-700 rounded-xl transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>

          <div className="h-4 w-[1px] bg-studio-700" />

          {/* Project Name Editable Input */}
          <input
            type="text"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            onBlur={() => handleUpdateProject({ name: project.name })}
            className="bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b focus:border-yellow-400 max-w-xs truncate"
          />

          {/* Auto-save Status */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            {isSaving ? (
              <span className="flex items-center gap-1 text-yellow-400">
                <Loader2 size={12} className="animate-spin" />
                Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check size={12} />
                Saved
              </span>
            ) : null}
          </div>
        </div>

        {/* Center / Right Top Controls */}
        <div className="flex items-center gap-3">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-studio-950 border border-studio-800 rounded-xl p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-studio-800 transition-colors"
              title="Undo Action"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-studio-800 transition-colors"
              title="Redo Action"
            >
              <Redo2 size={14} />
            </button>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1 bg-studio-950 border border-studio-800 rounded-xl px-2 py-1 text-xs">
            <Tv size={14} className="text-yellow-400" />
            <select
              value={project.aspect_ratio}
              onChange={(e) => handleUpdateProject({ aspect_ratio: e.target.value })}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              <option value="9:16">9:16 Shorts</option>
              <option value="1:1">1:1 Square</option>
              <option value="16:9">16:9 YouTube</option>
            </select>
          </div>

          {/* Primary Action: Export Video */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
          >
            <Sparkles size={15} />
            Export Video
          </button>
        </div>
      </header>

      {/* ---------------- 2. MAIN 3-COLUMN WORKSPACE ---------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Rankings & Media Tabs */}
        <div className="w-80 border-r border-studio-800 bg-studio-900 flex flex-col shrink-0">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-2 border-b border-studio-800 bg-studio-950/60 gap-1">
            <button
              onClick={() => setLeftTab('rankings')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                leftTab === 'rankings' 
                  ? 'bg-studio-800 text-yellow-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={14} />
              Rankings ({entries.length})
            </button>
            <button
              onClick={() => setLeftTab('media')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                leftTab === 'media' 
                  ? 'bg-studio-800 text-yellow-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon size={14} />
              Media ({media.length})
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {leftTab === 'rankings' ? (
              <RankingsList
                entries={entries}
                activeEntryIndex={activeEntryIndex}
                availableMedia={media}
                onSelectEntry={handleSelectEntry}
                onAddEntry={handleAddEntry}
                onDeleteEntry={handleDeleteEntry}
                onDuplicateEntry={handleDuplicateEntry}
                onUpdateEntry={handleUpdateEntry}
                onReorderEntries={handleReorderEntries}
              />
            ) : (
              <MediaLibrary
                projectId={projectId}
                media={media}
                onUploadSuccess={handleUploadSuccess}
                onDeleteMedia={handleDeleteMedia}
                onAssignToActiveRank={handleAssignToActiveRank}
              />
            )}
          </div>
        </div>

        {/* CENTER PANEL: Canvas Preview */}
        <div className="flex-1 bg-studio-950 flex flex-col items-center justify-center overflow-hidden">
          <CanvasPreview
            project={project}
            entries={entries}
            activeEntryIndex={activeEntryIndex}
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSeek={handleSeek}
            onEntrySelect={handleSelectEntry}
          />
        </div>

        {/* RIGHT PANEL: Inspector Panel */}
        <div className="w-80 border-l border-studio-800 bg-studio-900 flex flex-col shrink-0">
          <InspectorPanel
            project={project}
            activeEntry={entries[activeEntryIndex]}
            media={media}
            onUpdateProject={handleUpdateProject}
            onUpdateActiveEntry={(data) => {
              if (entries[activeEntryIndex]) {
                handleUpdateEntry(entries[activeEntryIndex].id, data);
              }
            }}
          />
        </div>
      </div>

      {/* ---------------- 3. BOTTOM TIMELINE ---------------- */}
      <Timeline
        project={project}
        entries={entries}
        activeEntryIndex={activeEntryIndex}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onSeek={handleSeek}
        onSelectEntry={handleSelectEntry}
      />

      {/* ---------------- 4. EXPORT MODAL ---------------- */}
      <ExportModal
        isOpen={isExportOpen}
        project={project}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
