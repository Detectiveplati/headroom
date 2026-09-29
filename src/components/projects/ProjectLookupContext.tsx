import React, { createContext, useContext, useMemo } from 'react';
import { Project, Task } from '../../types';

export interface TaskProjectInfo {
  projectId: string;
  projectName: string;
  color: string;
  nodeId: string;
  moduleTitle: string;
}

interface ProjectLookupValue {
  projects: Project[];
  getTaskProject: (task: Task) => TaskProjectInfo | null;
  onOpenInMap: (projectId: string, nodeId: string) => void;
}

const ProjectLookupContext = createContext<ProjectLookupValue>({
  projects: [],
  getTaskProject: () => null,
  onOpenInMap: () => {},
});

interface ProjectLookupProviderProps {
  projects: Project[];
  onOpenInMap: (projectId: string, nodeId: string) => void;
  children: React.ReactNode;
}

/** Lets board cards show their project chip and jump to the map without prop drilling. */
export const ProjectLookupProvider: React.FC<ProjectLookupProviderProps> = ({ projects, onOpenInMap, children }) => {
  const value = useMemo<ProjectLookupValue>(() => {
    const byProject = new Map(projects.map((p) => [p.id, { project: p, nodes: new Map(p.nodes.map((n) => [n.id, n])) }]));
    return {
      projects,
      onOpenInMap,
      getTaskProject: (task) => {
        if (!task.linkedProjectId || !task.linkedModuleId) return null;
        const entry = byProject.get(task.linkedProjectId);
        const node = entry?.nodes.get(task.linkedModuleId);
        if (!entry || !node) return null;
        return {
          projectId: entry.project.id,
          projectName: entry.project.name,
          color: entry.project.color,
          nodeId: node.id,
          moduleTitle: node.title,
        };
      },
    };
  }, [projects, onOpenInMap]);

  return <ProjectLookupContext.Provider value={value}>{children}</ProjectLookupContext.Provider>;
};

export function useProjectLookup(): ProjectLookupValue {
  return useContext(ProjectLookupContext);
}
