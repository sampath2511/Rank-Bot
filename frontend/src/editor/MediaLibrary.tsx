import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  Video, 
  Image as ImageIcon, 
  Music, 
  Trash2, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { MediaAsset } from '../types';
import { api } from '../services/api';

interface MediaLibraryProps {
  projectId: string;
  media: MediaAsset[];
  onUploadSuccess: (newAssets: MediaAsset[]) => void;
  onDeleteMedia: (assetId: string) => void;
  onAssignToActiveRank: (assetId: string) => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  projectId,
  media,
  onUploadSuccess,
  onDeleteMedia,
  onAssignToActiveRank,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [urlStatus, setUrlStatus] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      const uploaded = await api.uploadMedia(projectId, fileArray);
      onUploadSuccess(uploaded);
    } catch (err: any) {
      alert(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsImportingUrl(true);
    setUrlStatus(null);
    try {
      const res = await api.importSocialUrl(urlInput.trim());
      setUrlStatus({
        type: 'info',
        message: `${res.platform}: ${res.message}`
      });
    } catch (err: any) {
      setUrlStatus({
        type: 'error',
        message: err.message || 'Failed to inspect social URL.'
      });
    } finally {
      setIsImportingUrl(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-studio-900 border-r border-studio-800">
      {/* Top Header */}
      <div className="p-4 border-b border-studio-800 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
          Media Assets ({media.length})
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-studio-accent hover:bg-studio-accent-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Drag and Drop Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-studio-accent bg-studio-accent/10 scale-[0.99]'
              : 'border-studio-700/80 hover:border-studio-500 bg-studio-950/40 hover:bg-studio-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,image/*,audio/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-studio-800/80 border border-studio-700 flex items-center justify-center text-studio-accent">
            <Upload size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-200">
            Click to upload or drag & drop files
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            MP4, MOV, WebM, PNG, JPG, WebP, MP3, WAV
          </p>
        </div>

        {/* Social Media URL Import Input */}
        <div className="p-3 bg-studio-950/60 border border-studio-800 rounded-xl space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <LinkIcon size={14} className="text-studio-accent" />
            Import from Social Media
          </div>
          <form onSubmit={handleUrlImport} className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube, TikTok, or video URL..."
              className="flex-1 px-3 py-1.5 bg-studio-900 border border-studio-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-studio-accent"
            />
            <button
              type="submit"
              disabled={isImportingUrl || !urlInput.trim()}
              className="px-3 py-1.5 bg-studio-800 hover:bg-studio-700 disabled:opacity-40 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1"
            >
              {isImportingUrl ? <Loader2 size={13} className="animate-spin" /> : 'Inspect'}
            </button>
          </form>

          {/* URL Status Feedback */}
          {urlStatus && (
            <div className={`p-2 rounded-lg text-xs flex items-start gap-2 ${
              urlStatus.type === 'error' 
                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200'
            }`}>
              {urlStatus.type === 'error' ? <AlertCircle size={14} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
              <span>{urlStatus.message}</span>
            </div>
          )}
        </div>

        {/* Uploaded Media Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Library Files ({media.length})
          </h3>

          {media.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No files uploaded yet. Upload clips above to include them in your ranking video.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {media.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative bg-studio-950 border border-studio-800 rounded-xl overflow-hidden hover:border-studio-600 transition-all flex flex-col justify-between"
                >
                  {/* Thumbnail / Preview */}
                  <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                    {asset.media_type === 'video' ? (
                      asset.thumbnail_path ? (
                        <img src={api.getMediaUrl(asset.thumbnail_path)} alt={asset.original_filename} className="w-full h-full object-cover" />
                      ) : (
                        <Video size={24} className="text-studio-accent" />
                      )
                    ) : asset.media_type === 'image' ? (
                      <img src={api.getMediaUrl(asset.file_path)} alt={asset.original_filename} className="w-full h-full object-cover" />
                    ) : (
                      <Music size={24} className="text-emerald-400" />
                    )}

                    {/* Media Type & Duration Tag */}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-200 flex items-center gap-1">
                      {asset.media_type === 'video' ? <Video size={10} /> : asset.media_type === 'image' ? <ImageIcon size={10} /> : <Music size={10} />}
                      {asset.duration > 0 ? `${asset.duration.toFixed(1)}s` : ''}
                    </div>
                  </div>

                  {/* Info and Actions */}
                  <div className="p-2 space-y-1.5">
                    <p className="text-[11px] font-medium text-slate-300 truncate" title={asset.original_filename}>
                      {asset.original_filename}
                    </p>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-studio-800/80">
                      <button
                        onClick={() => onAssignToActiveRank(asset.id)}
                        className="px-2 py-1 bg-studio-800 hover:bg-studio-accent hover:text-white text-[10px] font-semibold text-slate-300 rounded transition-colors flex items-center gap-1"
                        title="Assign this media to currently selected rank slot"
                      >
                        <PlusCircle size={11} />
                        Assign
                      </button>

                      <button
                        onClick={() => onDeleteMedia(asset.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-studio-800 transition-colors"
                        title="Delete Asset"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
