import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Sparkles, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Play, 
  RefreshCw 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Modal } from '../components/Modal';
import { Project, RenderJob } from '../types';
import { api } from '../services/api';

interface ExportModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  project,
  onClose,
}) => {
  const [resolution, setResolution] = useState(
    project.aspect_ratio === '16:9' ? '1920x1080' : project.aspect_ratio === '1:1' ? '1080x1080' : '1080x1920'
  );
  const [fps, setFps] = useState(30);
  const [qualityPreset, setQualityPreset] = useState('medium');

  const [isRendering, setIsRendering] = useState(false);
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll render job status when rendering
  useEffect(() => {
    let intervalId: any = null;

    if (isRendering && renderJob && renderJob.status !== 'completed' && renderJob.status !== 'failed') {
      intervalId = setInterval(async () => {
        try {
          const updatedJob = await api.getRenderStatus(renderJob.id);
          setRenderJob(updatedJob);

          if (updatedJob.status === 'completed') {
            setIsRendering(false);
            // Fire celebratory confetti!
            try {
              confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 }
              });
            } catch {}
          } else if (updatedJob.status === 'failed') {
            setIsRendering(false);
            setError(updatedJob.error_message || 'Video rendering failed');
          }
        } catch (err: any) {
          console.error('Polling error:', err);
        }
      }, 1200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRendering, renderJob]);

  const handleStartExport = async () => {
    setIsRendering(true);
    setError(null);
    setRenderJob(null);

    try {
      const job = await api.triggerRender(project.id, {
        resolution,
        fps,
        quality_preset: qualityPreset,
      });
      setRenderJob(job);
    } catch (err: any) {
      setIsRendering(false);
      setError(err.message || 'Failed to start video rendering job.');
    }
  };

  const handleReset = () => {
    setIsRendering(false);
    setRenderJob(null);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Finished Video" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Render is Inactive / Settings Mode */}
        {!renderJob && !isRendering && (
          <>
            <div className="p-4 rounded-xl bg-studio-950/80 border border-studio-800 space-y-4">
              {/* Resolution Setting */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Resolution Preset</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full px-3 py-2 bg-studio-900 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400 font-medium"
                >
                  <option value="1080x1920">1080 × 1920 (Full HD Vertical 9:16 - Recommended)</option>
                  <option value="720x1280">720 × 1280 (Fast Draft 9:16)</option>
                  <option value="1080x1080">1080 × 1080 (Square 1:1 Feed)</option>
                  <option value="1920x1080">1920 × 1080 (Landscape 16:9 YouTube)</option>
                </select>
              </div>

              {/* Frame Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Frame Rate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-studio-900 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400 font-medium"
                  >
                    <option value={24}>24 FPS (Cinematic)</option>
                    <option value={30}>30 FPS (Standard Social Media)</option>
                    <option value={60}>60 FPS (Ultra Smooth)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Quality Preset</label>
                  <select
                    value={qualityPreset}
                    onChange={(e) => setQualityPreset(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-900 border border-studio-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400 font-medium"
                  >
                    <option value="fast">Fast (Lower render time)</option>
                    <option value="medium">Balanced (Recommended)</option>
                    <option value="slow">High Quality (Production)</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleStartExport}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-[0.99]"
            >
              <Sparkles size={16} />
              Start Rendering MP4 Video
            </button>
          </>
        )}

        {/* Render is In Progress */}
        {renderJob && renderJob.status !== 'completed' && renderJob.status !== 'failed' && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Loader2 size={48} className="text-yellow-400 animate-spin" />
              <Film size={20} className="absolute text-white" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">
                Rendering Video with FFmpeg...
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                {renderJob.current_step || 'Processing media frames'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md bg-studio-950 rounded-full h-3 overflow-hidden border border-studio-800 p-0.5">
              <div
                className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, renderJob.progress)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-yellow-400">
              {renderJob.progress.toFixed(0)}%
            </span>
          </div>
        )}

        {/* Render Succeeded */}
        {renderJob && renderJob.status === 'completed' && (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs font-semibold">
              <CheckCircle2 size={16} />
              <span>Video exported successfully! Ready for download.</span>
            </div>

            {/* Video Player */}
            {renderJob.output_url && (
              <div className="relative rounded-2xl overflow-hidden border border-studio-700 bg-black aspect-[9/16] max-h-72 mx-auto">
                <video
                  src={renderJob.output_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Video Details */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 bg-studio-950 rounded-xl border border-studio-800 font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">RESOLUTION</span>
                <span className="text-slate-200 font-bold">{renderJob.resolution}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DURATION</span>
                <span className="text-slate-200 font-bold">{renderJob.duration}s</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">FILE SIZE</span>
                <span className="text-slate-200 font-bold">
                  {renderJob.file_size ? `${(renderJob.file_size / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Download Button */}
            <a
              href={api.getDownloadUrl(renderJob.id)}
              download
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Download size={18} />
              Download MP4 Video File
            </a>

            <button
              onClick={handleReset}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Export with Different Settings
            </button>
          </div>
        )}

        {/* Render Failed */}
        {renderJob && renderJob.status === 'failed' && (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Rendering Encountered an Error</h4>
              <p className="text-xs text-red-300 font-mono max-w-md mx-auto p-2 bg-studio-950 rounded border border-studio-800">
                {renderJob.error_message || error || 'Unknown FFmpeg processing error.'}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw size={14} />
              Retry Export
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
