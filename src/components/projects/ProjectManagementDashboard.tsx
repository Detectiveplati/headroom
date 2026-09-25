import React, { useState, useMemo } from 'react';
import { 
  Project, 
  ProjectModule, 
  ModuleScopeItem, 
  ModuleStatus,
  Task
} from '../../types';
import { ModuleCard } from './ModuleCard';
import { ModuleModal } from './ModuleModal';
import { ProjectImportExportModal } from './ProjectImportExportModal';
import { 
  FolderGit2, 
  Plus, 
  Search, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  BarChart3,
  Trash2,
  FolderPlus,
  ChevronDown
} from 'lucide-react';

interface ProjectManagementDashboardProps {
  projects: Project[];
  tasks: Task[];
  onUpdateProjects: (projects: Project[]) => void;
  onPromoteToKanban: (module: ProjectModule, item: ModuleScopeItem) => void;
  onUpdateScopeItem: (module: ProjectModule, item: ModuleScopeItem, newTitle: string, newDetails?: string) => void;
}

export const ProjectManagementDashboard: React.FC<ProjectManagementDashboardProps> = ({
  projects,
  tasks,
  onUpdateProjects,
  onPromoteToKanban,
  onUpdateScopeItem,
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects.length > 0 ? projects[0].id : '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all');

  // Modals state
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ProjectModule | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Active Project resolution
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Overall metrics for active project
  const projectMetrics = useMemo(() => {
    if (!activeProject) {
      return { totalModules: 0, doneItems: 0, missingItems: 0, percentage: 0, shippedModules: 0 };
    }
    const modules = activeProject.modules || [];
    let done = 0;
    let missing = 0;
    let shipped = 0;

    modules.forEach((m) => {
      done += m.doneItems.length;
      missing += m.missingItems.length;
      if (m.status === 'shipped') shipped++;
    });

    const totalItems = done + missing;
    const percentage = totalItems > 0 ? Math.round((done / totalItems) * 100) : 0;

    return {
      totalModules: modules.length,
      doneItems: done,
      missingItems: missing,
      percentage,
      shippedModules: shipped,
    };
  }, [activeProject]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    if (!activeProject) return [];
    const query = searchQuery.toLowerCase().trim();

    return activeProject.modules.filter((m) => {
      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false;
      }
      // Search query filter
      if (!query) return true;

      const inName = m.name.toLowerCase().includes(query);
      const inSummary = m.summary?.toLowerCase().includes(query) || false;
      const inTech = m.techStack?.some((t) => t.toLowerCase().includes(query)) || false;
      const inDone = m.doneItems.some((d) => d.title.toLowerCase().includes(query));
      const inMissing = m.missingItems.some((ms) => ms.title.toLowerCase().includes(query));

      return inName || inSummary || inTech || inDone || inMissing;
    });
  }, [activeProject, searchQuery, statusFilter]);

  // Update active project helper
  const handleUpdateActiveProject = (updated: Project) => {
    onUpdateProjects(
      projects.map((p) => (p.id === updated.id ? { ...updated, updatedAt: Date.now() } : p))
    );
  };

  // Module update inside active project
  const handleUpdateModule = (updatedModule: ProjectModule) => {
    if (!activeProject) return;
    const updatedModules = activeProject.modules.map((m) =>
      m.id === updatedModule.id ? updatedModule : m
    );
    handleUpdateActiveProject({
      ...activeProject,
      modules: updatedModules,
    });
  };

  // Delete module
  const handleDeleteModule = (moduleId: string) => {
    if (!activeProject) return;
    const updatedModules = activeProject.modules.filter((m) => m.id !== moduleId);
    handleUpdateActiveProject({
      ...activeProject,
      modules: updatedModules,
    });
  };

  // Save Module from Modal (create or edit)
  const handleSaveModuleModal = (data: Partial<ProjectModule>) => {
    if (!activeProject) return;

    if (editingModule) {
      handleUpdateModule({
        ...editingModule,
        ...data,
        updatedAt: Date.now(),
      } as ProjectModule);
    } else {
      const newModule: ProjectModule = {
        id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        projectId: activeProject.id,
        name: data.name || 'Untitled Module',
        summary: data.summary || '',
        status: data.status || 'in-progress',
        version: data.version,
        techStack: data.techStack || [],
        notes: data.notes,
        doneItems: [],
        missingItems: [],
        updatedAt: Date.now(),
      };
      handleUpdateActiveProject({
        ...activeProject,
        modules: [newModule, ...activeProject.modules],
      });
    }
  };

  // Create New Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProj: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      color: '#6366f1',
      modules: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onUpdateProjects([newProj, ...projects]);
    setActiveProjectId(newProj.id);
    setNewProjectName('');
    setNewProjectDesc('');
    setIsNewProjectModalOpen(false);
  };

  // Delete Active Project
  const handleDeleteActiveProject = () => {
    if (!activeProject) return;
    if (window.confirm(`Are you sure you want to delete project "${activeProject.name}" and all its modules?`)) {
      const remaining = projects.filter((p) => p.id !== activeProject.id);
      onUpdateProjects(remaining);
      setActiveProjectId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  // Import parsed modules into active project
  const handleImportModules = (newModules: ProjectModule[]) => {
    if (!activeProject) return;
    handleUpdateActiveProject({
      ...activeProject,
      modules: [...newModules, ...activeProject.modules],
    });
  };

  // Import full project
  const handleImportFullProject = (importedProj: Project) => {
    const formatted: Project = {
      ...importedProj,
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateProjects([formatted, ...projects]);
    setActiveProjectId(formatted.id);
  };

  // Clean empty state when no projects exist
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto px-4 py-20 text-center space-y-5 animate-in fade-in duration-200">
        <div className="h-16 w-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-lg shadow-brand-500/10">
          <FolderPlus className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Clean Project Workspace
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Your project management dashboard is fresh and clean. Create your first project to start tracking your modules, completed features, and missing scope.
          </p>
        </div>
        <button
          onClick={() => setIsNewProjectModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create First Project</span>
        </button>

        {/* New Project Modal */}
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div 
              className="w-full max-w-md bg-offwhite-surface dark:bg-[#12151f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Create New Project
                </h2>
                <button
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. chillios or Headroom v2"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Brief description of the app or project..."
                    className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Project Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-offwhite-surface dark:bg-[#12151f] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <FolderGit2 className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              {/* Project Dropdown */}
              <div className="relative inline-block">
                <select
                  value={activeProject?.id || ''}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="appearance-none text-lg sm:text-xl font-bold text-zinc-900 dark:text-white bg-transparent pr-7 py-0.5 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none cursor-pointer"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm">
                      {proj.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-1 top-2 pointer-events-none" />
              </div>

              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                className="p-1 rounded-lg text-zinc-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition"
                title="Create New Project"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {activeProject?.description ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-md truncate">
                {activeProject.description}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 mt-0.5">Modular scope & feature delivery matrix</p>
            )}
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsImportExportModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-brand-500" />
            <span>Import / Export</span>
          </button>

          <button
            onClick={() => {
              setEditingModule(null);
              setIsModuleModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Module</span>
          </button>

          <button
            onClick={handleDeleteActiveProject}
            className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
            title="Delete Active Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Total Modules */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-[#12151f] border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">
            <span>Modules</span>
            <Layers className="w-4 h-4 text-brand-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {projectMetrics.totalModules}
            </span>
            <span className="text-[11px] text-zinc-400">
              ({projectMetrics.shippedModules} shipped)
            </span>
          </div>
        </div>

        {/* Metric 2: Overall Completion % */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-[#12151f] border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">
            <span>Project Completion</span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                {projectMetrics.percentage}%
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                {projectMetrics.doneItems} / {projectMetrics.doneItems + projectMetrics.missingItems} items
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${projectMetrics.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Implemented Features */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-[#12151f] border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">
            <span>Features Done</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {projectMetrics.doneItems}
            </span>
            <span className="text-[11px] text-zinc-400">verified deliverables</span>
          </div>
        </div>

        {/* Metric 4: What's Missing */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-[#12151f] border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">
            <span>Missing Scope</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {projectMetrics.missingItems}
            </span>
            <span className="text-[11px] text-zinc-400">remaining to ship</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules, done features, or missing scope..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-offwhite-surface dark:bg-[#12151f] border border-zinc-200/80 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-xs"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'in-progress', 'planning', 'review', 'shipped'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition capitalize ${
                statusFilter === status
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'bg-offwhite-surface dark:bg-[#12151f] text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {status === 'all' ? 'All Modules' : status.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      {filteredModules.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-offwhite-surface dark:bg-[#12151f] rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              No modules found
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter to see other modules.'
                : 'Start tracking your project deliverables by creating your first module or importing a markdown spec.'}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingModule(null);
              setIsModuleModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Module</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {filteredModules.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              projectName={activeProject?.name || 'Project'}
              tasks={tasks}
              onUpdateModule={handleUpdateModule}
              onDeleteModule={handleDeleteModule}
              onEditModule={(m) => {
                setEditingModule(m);
                setIsModuleModalOpen(true);
              }}
              onPromoteToKanban={onPromoteToKanban}
              onUpdateScopeItem={onUpdateScopeItem}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ModuleModal
        isOpen={isModuleModalOpen}
        onClose={() => {
          setIsModuleModalOpen(false);
          setEditingModule(null);
        }}
        onSave={handleSaveModuleModal}
        initialModule={editingModule}
      />

      {activeProject && (
        <ProjectImportExportModal
          isOpen={isImportExportModalOpen}
          onClose={() => setIsImportExportModalOpen(false)}
          activeProject={activeProject}
          onImportModules={handleImportModules}
          onImportFullProject={handleImportFullProject}
        />
      )}

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-offwhite-surface dark:bg-[#12151f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Create New Project
              </h2>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <span className="text-lg">×</span>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. chillios or Headroom v2"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Brief description of the app or project..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
