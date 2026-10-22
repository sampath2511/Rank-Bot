import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { ProjectEditor } from './pages/ProjectEditor';

export const App: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Sync with browser URL search params for deep linking and refresh preservation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projParam = params.get('project');
    if (projParam) {
      setActiveProjectId(projParam);
    }
  }, []);

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('project', id);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackToDashboard = () => {
    setActiveProjectId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('project');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="w-full h-full min-h-screen bg-studio-950 font-sans antialiased text-slate-100">
      {activeProjectId ? (
        <ProjectEditor
          projectId={activeProjectId}
          onBackToDashboard={handleBackToDashboard}
        />
      ) : (
        <Dashboard onOpenProject={handleOpenProject} />
      )}
    </div>
  );
};

export default App;
