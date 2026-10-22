import { Project, RankingEntry, MediaAsset, RenderJob, UrlImportResult } from '../types';

const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
export const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  if (BASE_URL.startsWith('http://') || BASE_URL.startsWith('https://')) {
    try {
      const parsed = new URL(BASE_URL);
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${parsed.origin}${cleanPath}`;
    } catch {
      // fallback
    }
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('rankstudio_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('rankstudio_token', token);
  } else {
    localStorage.removeItem('rankstudio_token');
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `Status ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    return apiRequest<Project[]>('/projects');
  },

  async getProject(id: string): Promise<Project> {
    return apiRequest<Project>(`/projects/${id}`);
  },

  async createProject(data: { name?: string; aspect_ratio?: string; template_type?: string }): Promise<Project> {
    return apiRequest<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return apiRequest<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<void> {
    return apiRequest<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async duplicateProject(id: string): Promise<Project> {
    return apiRequest<Project>(`/projects/${id}/duplicate`, {
      method: 'POST',
    });
  },

  // Rankings
  async getRankings(projectId: string): Promise<RankingEntry[]> {
    return apiRequest<RankingEntry[]>(`/projects/${projectId}/rankings`);
  },

  async addRankingEntry(projectId: string, data: Partial<RankingEntry>): Promise<RankingEntry> {
    return apiRequest<RankingEntry>(`/projects/${projectId}/rankings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRankingEntry(entryId: string, data: Partial<RankingEntry>): Promise<RankingEntry> {
    return apiRequest<RankingEntry>(`/rankings/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRankingEntry(entryId: string): Promise<void> {
    return apiRequest<void>(`/rankings/${entryId}`, {
      method: 'DELETE',
    });
  },

  async reorderRankings(projectId: string, order: { id: string; position: number; display_number?: string }[]): Promise<RankingEntry[]> {
    return apiRequest<RankingEntry[]>(`/projects/${projectId}/rankings/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
  },

  // Media
  async getProjectMedia(projectId: string): Promise<MediaAsset[]> {
    return apiRequest<MediaAsset[]>(`/projects/${projectId}/media`);
  },

  async uploadMedia(projectId: string, files: File[]): Promise<MediaAsset[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}/projects/${projectId}/media`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return response.json();
  },

  async importSocialUrl(url: string): Promise<UrlImportResult> {
    return apiRequest<UrlImportResult>('/media/import-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async deleteMedia(assetId: string): Promise<void> {
    return apiRequest<void>(`/media/${assetId}`, {
      method: 'DELETE',
    });
  },

  // Auth
  async register(email: string, password: string): Promise<{ access_token: string; user: { id: string; email: string } }> {
    const res = await apiRequest<{ access_token: string; user: { id: string; email: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },

  async login(email: string, password: string): Promise<{ access_token: string; user: { id: string; email: string } }> {
    const res = await apiRequest<{ access_token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },

  async getMe(): Promise<{ id: string; email: string; created_at: string } | null> {
    try {
      if (!getAuthToken()) return null;
      return await apiRequest<{ id: string; email: string; created_at: string }>('/auth/me');
    } catch {
      setAuthToken(null);
      return null;
    }
  },

  logout(): void {
    setAuthToken(null);
  },

  // Rendering
  async triggerRender(projectId: string, options: { resolution?: string; fps?: number; quality_preset?: string }): Promise<RenderJob> {
    return apiRequest<RenderJob>(`/projects/${projectId}/render`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async getRenderStatus(jobId: string): Promise<RenderJob> {
    return apiRequest<RenderJob>(`/renders/${jobId}`);
  },

  getDownloadUrl(jobId: string): string {
    return `${BASE_URL}/renders/${jobId}/download`;
  },

  // Health
  async getHealth(): Promise<{ status: string; ffmpeg: { available: boolean } }> {
    return apiRequest('/health');
  },

  getMediaUrl,
  getAuthToken,
  setAuthToken
};
