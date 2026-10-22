import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Plus, 
  Video, 
  Clock, 
  Layers, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  FolderPlus,
  Loader2
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

interface DashboardProps {
  onOpenProject: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('Top 5 Viral Ranking');
  const [newAspectRatio, setNewAspectRatio] = useState('9:16');
  const [newTemplate, setNewTemplate] = useState('standard_ranking');
  const [isCreating, setIsCreating] = useState(false);

  // Delete Confirm State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const created = await api.createProject({
        name: newProjectName.trim(),
        aspect_ratio: newAspectRatio,
        template_type: newTemplate,
      });
      setIsCreateOpen(false);
      onOpenProject(created.id);
    } catch (err: any) {
      alert(`Could not create project: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const duplicated = await api.duplicateProject(id);
      setProjects([duplicated, ...projects]);
    } catch (err: any) {
      alert(`Duplicate failed: ${err.message}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deleteProject(deleteTargetId);
      setProjects(projects.filter((p) => p.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-studio-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-studio-800 bg-studio-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black shadow-lg shadow-yellow-500/20">
            <Trophy size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              RankStudio
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 uppercase tracking-widest">
                v1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Social Media Ranking Video Editor</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
        >
          <Plus size={16} />
          Create New Project
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-studio-900 via-studio-850 to-studio-900 border border-studio-700/60 p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-accent/20 border border-studio-accent/30 text-studio-accent text-xs font-semibold">
              <Sparkles size={14} />
              Viral Short-Form Content Creation
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Create Engaging Ranking Videos in Minutes
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Build high-retention ranking videos for YouTube Shorts, Instagram Reels, and TikTok. Add multicolored title banners, stacked left-side ranking numbers, background audio, and export ready-to-publish MP4 files.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-6 py-3.5 bg-studio-accent hover:bg-studio-accent-hover text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-900/40 flex items-center gap-2 transition-all active:scale-95 shrink-0"
          >
            <FolderPlus size={18} />
            Start New Project
          </button>
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Video size={18} className="text-yellow-400" />
              Your Projects
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={36} className="text-yellow-400 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            /* Empty State */
            <div className="py-16 px-4 rounded-3xl border border-dashed border-studio-700/80 bg-studio-900/30 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-studio-800 border border-studio-700 flex items-center justify-center text-yellow-400">
                <Trophy size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">No Projects Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click the button below to start your first ranking video project with pre-built slots and styling.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-extrabold rounded-xl shadow-md transition-all"
              >
                Create First Ranking Project
              </button>
            </div>
          ) : (
            /* Project Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="group relative rounded-2xl bg-studio-900 border border-studio-800/90 hover:border-yellow-400/60 p-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/50 cursor-pointer flex flex-col justify-between space-y-4"
                >
                  {/* Card Header & Aspect Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-studio-800 text-yellow-400 border border-studio-700 text-[10px] font-mono font-bold">
                      {project.aspect_ratio} ({project.resolution_width}×{project.resolution_height})
                    </span>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDuplicate(e, project.id)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-studio-800 transition-colors"
                        title="Duplicate Project"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(project.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-studio-800 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Header Preview Banner Box */}
                  <div className="relative aspect-video w-full rounded-xl bg-black border border-studio-700/80 overflow-hidden flex flex-col items-center justify-center p-3 text-center shadow-inner">
                    <div 
                      className="font-impact-title font-extrabold uppercase title-stroke leading-none truncate max-w-full"
                      style={{ 
                        fontSize: '18px', 
                        color: project.title_config?.line1_color || '#FACC15' 
                      }}
                    >
                      {project.title_config?.line1 || 'RANKING BEST'}
                    </div>
                    <div 
                      className="font-impact-title font-extrabold uppercase title-stroke leading-none mt-1 truncate max-w-full"
                      style={{ 
                        fontSize: '18px', 
                        color: project.title_config?.line2_color || '#FFFFFF' 
                      }}
                    >
                      {project.title_config?.line2 || 'MOMENTS EVER'}
                    </div>
                  </div>

                  {/* Card Title & Info */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors truncate">
                      {project.name}
                    </h4>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Layers size={12} className="text-slate-500" />
                        {project.ranking_entries_count || 5} Slots
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-500" />
                        {project.total_duration ? `${project.total_duration}s` : '17.5s'}
                      </span>
                    </div>
                  </div>

                  {/* Open Studio Action Button */}
                  <div className="pt-2 border-t border-studio-800 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-white">
                    <span>Open in Editor Studio</span>
                    <ExternalLink size={14} className="text-yellow-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Project Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Ranking Project">
        <form onSubmit={handleCreateProject} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Project Name</label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Top 10 Knockouts"
              className="w-full px-3 py-2.5 bg-studio-950 border border-studio-700 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Canvas Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: '9:16', label: 'Vertical 9:16', desc: 'Shorts, Reels, TikTok' },
                { id: '1:1', label: 'Square 1:1', desc: 'Instagram Feed' },
                { id: '16:9', label: 'Landscape 16:9', desc: 'YouTube Standard' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNewAspectRatio(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newAspectRatio === item.id
                      ? 'bg-studio-accent text-white border-studio-accent shadow-md shadow-indigo-900/30'
                      : 'bg-studio-950 text-slate-300 border-studio-800 hover:border-studio-700'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Template Starter</label>
            <select
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-studio-950 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="standard_ranking">Standard Ranking (Gold & White Header, 5 slots)</option>
              <option value="countdown">Dramatic Countdown (Red & Gold Title, 5 slots)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-studio-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-xs font-extrabold rounded-xl shadow-lg transition-all"
            >
              {isCreating ? 'Creating Project...' : 'Create & Open Studio'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete Ranking Project"
        message="Are you sure you want to delete this project? This will permanently remove its ranking entries and exported videos."
        confirmLabel="Delete Project"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
