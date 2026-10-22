import React from 'react';
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  Plus, 
  Video, 
  Image as ImageIcon, 
  Clock, 
  ArrowUp, 
  ArrowDown,
  Layers
} from 'lucide-react';
import { RankingEntry, MediaAsset } from '../types';
import { getMediaUrl } from '../services/api';

interface RankingsListProps {
  entries: RankingEntry[];
  activeEntryIndex: number;
  availableMedia: MediaAsset[];
  onSelectEntry: (index: number) => void;
  onAddEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicateEntry: (entry: RankingEntry) => void;
  onUpdateEntry: (entryId: string, data: Partial<RankingEntry>) => void;
  onReorderEntries: (newEntries: RankingEntry[]) => void;
}

export const RankingsList: React.FC<RankingsListProps> = ({
  entries,
  activeEntryIndex,
  availableMedia,
  onSelectEntry,
  onAddEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onUpdateEntry,
  onReorderEntries,
}) => {
  // Move entry up
  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index === 0) return;
    const reordered = [...entries];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    // Renumber
    reordered.forEach((item, idx) => {
      item.position = idx + 1;
      item.display_number = `${idx + 1}`;
    });
    onReorderEntries(reordered);
    onSelectEntry(index - 1);
  };

  // Move entry down
  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index === entries.length - 1) return;
    const reordered = [...entries];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    // Renumber
    reordered.forEach((item, idx) => {
      item.position = idx + 1;
      item.display_number = `${idx + 1}`;
    });
    onReorderEntries(reordered);
    onSelectEntry(index + 1);
  };

  return (
    <div className="flex flex-col h-full bg-studio-900 border-r border-studio-800">
      {/* Top Header */}
      <div className="p-4 border-b border-studio-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-yellow-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Rankings ({entries.length})
          </h2>
        </div>
        <button
          onClick={onAddEntry}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <Plus size={14} />
          Add Slot
        </button>
      </div>

      {/* Rankings List Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {entries.map((entry, index) => {
          const isActive = index === activeEntryIndex;
          const duration = (entry.trim_end && entry.trim_end > entry.trim_start)
            ? entry.trim_end - entry.trim_start
            : entry.display_duration;

          return (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(index)}
              className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-studio-800/90 border-yellow-400/80 shadow-lg ring-1 ring-yellow-400/20'
                  : 'bg-studio-950/60 border-studio-800 hover:border-studio-700 hover:bg-studio-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Ranking Position Badge */}
                <div 
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-impact-title text-base font-black shrink-0 ${
                    isActive 
                      ? 'bg-yellow-400 text-black shadow-sm' 
                      : 'bg-studio-800 text-slate-300 border border-studio-700'
                  }`}
                >
                  {entry.display_number || (index + 1)}
                </div>

                {/* Media Thumbnail or Empty Slot */}
                <div className="relative w-12 h-14 rounded-lg bg-black/60 border border-studio-700/80 overflow-hidden shrink-0 flex items-center justify-center">
                  {entry.asset ? (
                    entry.asset.media_type === 'video' ? (
                      entry.asset.thumbnail_path ? (
                        <img 
                          src={getMediaUrl(entry.asset.thumbnail_path)} 
                          alt="thumb" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Video size={18} className="text-studio-accent" />
                      )
                    ) : (
                      <img 
                        src={getMediaUrl(entry.asset.file_path)} 
                        alt="thumb" 
                        className="w-full h-full object-cover" 
                      />
                    )
                  ) : (
                    <div className="text-[10px] text-slate-500 font-medium text-center px-1">
                      No Media
                    </div>
                  )}

                  {/* Media Type Indicator */}
                  {entry.asset && (
                    <div className="absolute bottom-1 right-1 p-0.5 rounded bg-black/80 text-[10px] text-white">
                      {entry.asset.media_type === 'video' ? <Video size={10} /> : <ImageIcon size={10} />}
                    </div>
                  )}
                </div>

                {/* Label & Duration Info */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={entry.custom_label}
                    onChange={(e) => onUpdateEntry(entry.id, { custom_label: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={`Rank #${entry.display_number || (index + 1)} Title`}
                    className="w-full bg-transparent text-xs font-semibold text-slate-200 focus:outline-none focus:border-b focus:border-yellow-400 truncate"
                  />

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={11} className="text-slate-500" />
                      {duration.toFixed(1)}s
                    </span>

                    {/* Media Attach Dropdown Selector */}
                    <select
                      value={entry.asset_id || ''}
                      onChange={(e) => onUpdateEntry(entry.id, { asset_id: e.target.value || null })}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-studio-900 border border-studio-700/80 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-studio-accent truncate max-w-[110px]"
                    >
                      <option value="">(No Media)</option>
                      {availableMedia.map((media) => (
                        <option key={media.id} value={media.id}>
                          {media.original_filename}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons: Move Up/Down, Duplicate, Delete */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => handleMoveUp(e, index)}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-20 rounded hover:bg-studio-700 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={index === entries.length - 1}
                      onClick={(e) => handleMoveDown(e, index)}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-20 rounded hover:bg-studio-700 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateEntry(entry);
                      }}
                      className="p-1 text-slate-500 hover:text-studio-accent rounded hover:bg-studio-700 transition-colors"
                      title="Duplicate Entry"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-studio-700 transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Quick Action */}
      <div className="p-3 border-t border-studio-800 bg-studio-950/40">
        <button
          onClick={onAddEntry}
          className="w-full py-2.5 rounded-xl border border-dashed border-studio-700 hover:border-yellow-400/60 hover:bg-yellow-400/5 text-slate-300 hover:text-yellow-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Plus size={15} />
          Add New Ranking Slot
        </button>
      </div>
    </div>
  );
};
