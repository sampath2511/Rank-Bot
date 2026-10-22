import React, { useState } from 'react';
import { 
  Type, 
  Hash, 
  Sliders, 
  Music, 
  LayoutTemplate, 
  Eye, 
  Scissors, 
  Volume2, 
  Palette,
  Play,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { Project, RankingEntry, MediaAsset } from '../types';
import { ColorPicker } from '../components/ColorPicker';
import { soundEffects } from '../services/soundEffects';

interface InspectorPanelProps {
  project: Project;
  activeEntry?: RankingEntry;
  media: MediaAsset[];
  onUpdateProject: (data: Partial<Project>) => void;
  onUpdateActiveEntry: (data: Partial<RankingEntry>) => void;
}

type TabType = 'header' | 'numbers' | 'clip' | 'audio' | 'footer';

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  project,
  activeEntry,
  media,
  onUpdateProject,
  onUpdateActiveEntry,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('header');

  const titleConfig = project.title_config;
  const rankingConfig = project.ranking_config;
  const footerConfig = project.footer_config;
  const audioConfig = project.audio_config;

  const audioAssets = media.filter((m) => m.media_type === 'audio' || m.media_type === 'video');

  // Handle word color change
  const handleWordColorChange = (index: number, newColor: string) => {
    const existingWords = titleConfig.words || [
      { text: 'RANKING', color: '#FACC15' },
      { text: 'BEST', color: '#FACC15' },
      { text: 'MOMENTS', color: '#FFFFFF' },
      { text: 'EVER', color: '#38BDF8' }
    ];
    const updated = [...existingWords];
    if (updated[index]) {
      updated[index] = { ...updated[index], color: newColor };
      onUpdateProject({
        title_config: {
          ...titleConfig,
          words: updated,
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-studio-900 border-l border-studio-800">
      {/* Inspector Tabs */}
      <div className="flex items-center border-b border-studio-800 px-2 py-1 bg-studio-950/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab('header')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'header' 
              ? 'text-yellow-400 bg-studio-800' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Type size={14} />
          Header
        </button>

        <button
          onClick={() => setActiveTab('numbers')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'numbers' 
              ? 'text-yellow-400 bg-studio-800' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Hash size={14} />
          Numbers
        </button>

        <button
          onClick={() => setActiveTab('clip')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'clip' 
              ? 'text-yellow-400 bg-studio-800' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors size={14} />
          Clip
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'audio' 
              ? 'text-yellow-400 bg-studio-800' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Music size={14} />
          Audio
        </button>

        <button
          onClick={() => setActiveTab('footer')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === 'footer' 
              ? 'text-yellow-400 bg-studio-800' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutTemplate size={14} />
          Footer
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ==================== 1. HEADER & TITLE TAB ==================== */}
        {activeTab === 'header' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                Title Typography
              </h3>
              <p className="text-[11px] text-slate-400">
                Customize header banner lines, font size, and per-word colors.
              </p>
            </div>

            {/* Line 1 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Line 1 Text</label>
              <input
                type="text"
                value={titleConfig.line1 || ''}
                onChange={(e) => onUpdateProject({
                  title_config: { ...titleConfig, line1: e.target.value }
                })}
                placeholder="RANKING BEST"
                className="w-full px-3 py-2 bg-studio-950 border border-studio-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-yellow-400 uppercase"
              />
              <ColorPicker
                label="Line 1 Color"
                value={titleConfig.line1_color || '#FACC15'}
                onChange={(c) => onUpdateProject({
                  title_config: { ...titleConfig, line1_color: c }
                })}
              />
            </div>

            {/* Line 2 */}
            <div className="space-y-1.5 pt-2 border-t border-studio-800">
              <label className="text-xs font-medium text-slate-400">Line 2 Text</label>
              <input
                type="text"
                value={titleConfig.line2 || ''}
                onChange={(e) => onUpdateProject({
                  title_config: { ...titleConfig, line2: e.target.value }
                })}
                placeholder="MOMENTS EVER"
                className="w-full px-3 py-2 bg-studio-950 border border-studio-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-yellow-400 uppercase"
              />
              <ColorPicker
                label="Line 2 Color"
                value={titleConfig.line2_color || '#FFFFFF'}
                onChange={(c) => onUpdateProject({
                  title_config: { ...titleConfig, line2_color: c }
                })}
              />
            </div>

            {/* Font Size Slider */}
            <div className="space-y-2 pt-2 border-t border-studio-800">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Font Size</span>
                <span className="font-mono text-white font-semibold">{titleConfig.font_size || 48}px</span>
              </div>
              <input
                type="range"
                min="32"
                max="72"
                value={titleConfig.font_size || 48}
                onChange={(e) => onUpdateProject({
                  title_config: { ...titleConfig, font_size: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Banner Height Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Banner Height</span>
                <span className="font-mono text-white font-semibold">{titleConfig.banner_height || 220}px</span>
              </div>
              <input
                type="range"
                min="140"
                max="320"
                value={titleConfig.banner_height || 220}
                onChange={(e) => onUpdateProject({
                  title_config: { ...titleConfig, banner_height: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Banner Background Color */}
            <ColorPicker
              label="Banner Background"
              value={titleConfig.banner_bg || '#000000'}
              onChange={(c) => onUpdateProject({
                title_config: { ...titleConfig, banner_bg: c }
              })}
            />
          </div>
        )}

        {/* ==================== 2. RANKING NUMBERS TAB ==================== */}
        {activeTab === 'numbers' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                Vertical Ranking Numbers
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure colors, size, and vertical placement along the left edge.
              </p>
            </div>

            {/* Active Color */}
            <ColorPicker
              label="Active Rank Highlight Color"
              value={rankingConfig.active_color || '#FACC15'}
              onChange={(c) => onUpdateProject({
                ranking_config: { ...rankingConfig, active_color: c }
              })}
            />

            {/* Inactive Color */}
            <ColorPicker
              label="Inactive Numbers Color"
              value={rankingConfig.inactive_color || '#94A3B8'}
              onChange={(c) => onUpdateProject({
                ranking_config: { ...rankingConfig, inactive_color: c }
              })}
            />

            {/* Font Size */}
            <div className="space-y-2 pt-2 border-t border-studio-800">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Number Size</span>
                <span className="font-mono text-white font-semibold">{rankingConfig.font_size || 52}px</span>
              </div>
              <input
                type="range"
                min="36"
                max="80"
                value={rankingConfig.font_size || 52}
                onChange={(e) => onUpdateProject({
                  ranking_config: { ...rankingConfig, font_size: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Left Margin */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Left Position (Margin)</span>
                <span className="font-mono text-white font-semibold">{rankingConfig.left_margin || 40}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={rankingConfig.left_margin || 40}
                onChange={(e) => onUpdateProject({
                  ranking_config: { ...rankingConfig, left_margin: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Vertical Spacing */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Vertical Spacing</span>
                <span className="font-mono text-white font-semibold">{rankingConfig.spacing || 75}px</span>
              </div>
              <input
                type="range"
                min="40"
                max="120"
                value={rankingConfig.spacing || 75}
                onChange={(e) => onUpdateProject({
                  ranking_config: { ...rankingConfig, spacing: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Show All Numbers Toggle */}
            <div className="flex items-center justify-between p-3 bg-studio-950 rounded-xl border border-studio-800">
              <div>
                <p className="text-xs font-semibold text-slate-200">Show All Numbers</p>
                <p className="text-[10px] text-slate-500">Display full stack vs active only</p>
              </div>
              <input
                type="checkbox"
                checked={rankingConfig.show_all_numbers !== false}
                onChange={(e) => onUpdateProject({
                  ranking_config: { ...rankingConfig, show_all_numbers: e.target.checked }
                })}
                className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400"
              />
            </div>
          </div>
        )}

        {/* ==================== 3. CLIP & TIMING TAB ==================== */}
        {activeTab === 'clip' && (
          <div className="space-y-5">
            {activeEntry ? (
              <>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Editing Slot #{activeEntry.display_number || activeEntry.position}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Control display duration, trimming, and scaling fit mode.
                  </p>
                </div>

                {/* Slot Custom Label */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Custom Label</label>
                  <input
                    type="text"
                    value={activeEntry.custom_label || ''}
                    onChange={(e) => onUpdateActiveEntry({ custom_label: e.target.value })}
                    placeholder="e.g. Champion Entry"
                    className="w-full px-3 py-2 bg-studio-950 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-studio-accent"
                  />
                </div>

                {/* Display Duration Slider */}
                <div className="space-y-2 pt-2 border-t border-studio-800">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Display Duration</span>
                    <span className="font-mono text-yellow-400 font-bold">{activeEntry.display_duration.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="15.0"
                    step="0.5"
                    value={activeEntry.display_duration || 3.5}
                    onChange={(e) => onUpdateActiveEntry({ display_duration: Number(e.target.value) })}
                    className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Video Trimming (if video) */}
                {activeEntry.asset?.media_type === 'video' && (
                  <div className="space-y-3 pt-2 border-t border-studio-800">
                    <label className="text-xs font-semibold text-slate-300">Video Clip Trimming</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400">Trim In (Start)</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={activeEntry.trim_start || 0}
                          onChange={(e) => onUpdateActiveEntry({ trim_start: Number(e.target.value) })}
                          className="w-full mt-1 px-2.5 py-1.5 bg-studio-950 border border-studio-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Trim Out (End)</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={activeEntry.trim_end || ''}
                          placeholder={activeEntry.asset.duration ? activeEntry.asset.duration.toFixed(1) : 'Auto'}
                          onChange={(e) => onUpdateActiveEntry({ trim_end: e.target.value ? Number(e.target.value) : null })}
                          className="w-full mt-1 px-2.5 py-1.5 bg-studio-950 border border-studio-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Fit Mode */}
                <div className="space-y-2 pt-2 border-t border-studio-800">
                  <label className="text-xs font-medium text-slate-400">Media Fit Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateActiveEntry({ fit_mode: 'contain' })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        activeEntry.fit_mode === 'contain'
                          ? 'bg-studio-accent text-white border-studio-accent'
                          : 'bg-studio-950 text-slate-400 border-studio-800 hover:border-studio-700'
                      }`}
                    >
                      Contain (Pillarbox)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateActiveEntry({ fit_mode: 'cover' })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        activeEntry.fit_mode === 'cover'
                          ? 'bg-studio-accent text-white border-studio-accent'
                          : 'bg-studio-950 text-slate-400 border-studio-800 hover:border-studio-700'
                      }`}
                    >
                      Cover (Fill Canvas)
                    </button>
                  </div>
                </div>

                {/* Mute Audio Toggle */}
                <div className="flex items-center justify-between p-3 bg-studio-950 rounded-xl border border-studio-800">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Mute Clip Audio</p>
                      <p className="text-[10px] text-slate-500">Silence this clip's original sound</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeEntry.is_muted}
                    onChange={(e) => onUpdateActiveEntry({ is_muted: e.target.checked })}
                    className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400"
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">
                Select a ranking entry on the left to configure its duration, trim, and media settings.
              </div>
            )}
          </div>
        )}

        {/* ==================== 4. AUDIO & BGM TAB ==================== */}
        {activeTab === 'audio' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                Audio & Sound Effects
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure rank transition sound effects and background music mixing.
              </p>
            </div>

            {/* Transition Sound Effects */}
            <div className="p-3 bg-studio-950 rounded-xl border border-studio-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-400" />
                  <label className="text-xs font-bold text-slate-200">Rank Transition SFX</label>
                </div>
                {audioConfig.transition_sfx && audioConfig.transition_sfx !== 'none' && (
                  <button
                    type="button"
                    onClick={() => soundEffects.playEffect(audioConfig.transition_sfx, audioConfig.sfx_volume || 0.7)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-lg hover:bg-yellow-400/20 transition-all"
                    title="Audition sound effect"
                  >
                    <Play size={10} className="fill-current" />
                    Preview
                  </button>
                )}
              </div>

              <select
                value={audioConfig.transition_sfx || 'none'}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateProject({
                    audio_config: { ...audioConfig, transition_sfx: val }
                  });
                  if (val !== 'none') {
                    soundEffects.playEffect(val, audioConfig.sfx_volume || 0.7);
                  }
                }}
                className="w-full px-3 py-2 bg-studio-900 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="none">None (No Transition Sound)</option>
                <option value="ding">🔔 Ding / Chime (Classic Viral Ranking)</option>
                <option value="bell">🛎️ Bell Chime (Dual Harmonic)</option>
                <option value="whoosh">💨 Swoosh / Whoosh (Action Reveal)</option>
                <option value="pop">🫧 Bubble Pop (Playful & Snappy)</option>
                <option value="beep">⏱️ Countdown Beep (High Tension)</option>
                <option value="horn">🎺 Fanfare Horn (Triumphant Win)</option>
                <option value="camera">📸 Camera Shutter Click</option>
              </select>

              {audioConfig.transition_sfx && audioConfig.transition_sfx !== 'none' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>SFX Volume</span>
                    <span className="font-mono text-yellow-400 font-semibold">
                      {Math.round((audioConfig.sfx_volume ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={audioConfig.sfx_volume ?? 0.7}
                    onChange={(e) => onUpdateProject({
                      audio_config: { ...audioConfig, sfx_volume: Number(e.target.value) }
                    })}
                    className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer accent-yellow-400"
                  />
                </div>
              )}
            </div>

            {/* Background Music Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Background Music Track</label>
              <select
                value={audioConfig.bgm_asset_id || ''}
                onChange={(e) => onUpdateProject({
                  audio_config: { ...audioConfig, bgm_asset_id: e.target.value || null }
                })}
                className="w-full px-3 py-2 bg-studio-950 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">(None - No Background Music)</option>
                {audioAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.original_filename} ({asset.duration.toFixed(1)}s)
                  </option>
                ))}
              </select>
            </div>

            {/* BGM Volume Slider */}
            <div className="space-y-2 pt-2 border-t border-studio-800">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Music Volume</span>
                <span className="font-mono text-white font-semibold">
                  {Math.round((audioConfig.bgm_volume || 0.4) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={audioConfig.bgm_volume || 0.4}
                onChange={(e) => onUpdateProject({
                  audio_config: { ...audioConfig, bgm_volume: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer accent-yellow-400"
              />
            </div>

            {/* BGM Fade In Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Music Fade-In</span>
                <span className="font-mono text-white font-semibold">
                  {(audioConfig.bgm_fade_in ?? 1.0).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="3.0"
                step="0.2"
                value={audioConfig.bgm_fade_in ?? 1.0}
                onChange={(e) => onUpdateProject({
                  audio_config: { ...audioConfig, bgm_fade_in: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer accent-yellow-400"
              />
            </div>

            {/* Original Clips Volume Slider */}
            <div className="space-y-2 pt-2 border-t border-studio-800">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Original Clip Sound Volume</span>
                <span className="font-mono text-white font-semibold">
                  {Math.round((audioConfig.original_volume || 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={audioConfig.original_volume || 1.0}
                onChange={(e) => onUpdateProject({
                  audio_config: { ...audioConfig, original_volume: Number(e.target.value) }
                })}
                className="w-full h-1.5 bg-studio-800 rounded-lg cursor-pointer accent-yellow-400"
              />
            </div>
          </div>
        )}

        {/* ==================== 5. FOOTER TAB ==================== */}
        {activeTab === 'footer' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                Bottom Footer Banner
              </h3>
              <p className="text-[11px] text-slate-400">
                Show channel watermark and call-to-action text.
              </p>
            </div>

            {/* Enable Footer Toggle */}
            <div className="flex items-center justify-between p-3 bg-studio-950 rounded-xl border border-studio-800">
              <div>
                <p className="text-xs font-semibold text-slate-200">Show Footer Banner</p>
                <p className="text-[10px] text-slate-500">Toggle bottom watermark overlay</p>
              </div>
              <input
                type="checkbox"
                checked={footerConfig.enabled !== false}
                onChange={(e) => onUpdateProject({
                  footer_config: { ...footerConfig, enabled: e.target.checked }
                })}
                className="w-4 h-4 rounded text-yellow-400 focus:ring-yellow-400"
              />
            </div>

            {footerConfig.enabled && (
              <>
                {/* Channel Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Channel Name / Handle</label>
                  <input
                    type="text"
                    value={footerConfig.channel_name || ''}
                    onChange={(e) => onUpdateProject({
                      footer_config: { ...footerConfig, channel_name: e.target.value }
                    })}
                    placeholder="@RankStudio"
                    className="w-full px-3 py-2 bg-studio-950 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                {/* Call To Action Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Call to Action (CTA)</label>
                  <input
                    type="text"
                    value={footerConfig.cta_text || ''}
                    onChange={(e) => onUpdateProject({
                      footer_config: { ...footerConfig, cta_text: e.target.value }
                    })}
                    placeholder="SUBSCRIBE FOR MORE"
                    className="w-full px-3 py-2 bg-studio-950 border border-studio-700 rounded-xl text-xs text-yellow-400 font-bold focus:outline-none focus:border-yellow-400 uppercase"
                  />
                </div>

                {/* Footer Background Color */}
                <ColorPicker
                  label="Footer Background Color"
                  value={footerConfig.bg_color || '#000000'}
                  onChange={(c) => onUpdateProject({
                    footer_config: { ...footerConfig, bg_color: c }
                  })}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
