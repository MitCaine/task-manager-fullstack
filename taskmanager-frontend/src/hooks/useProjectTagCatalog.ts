import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  createProject,
  createTag,
  deleteProject as deleteProjectAPI,
  deleteTag as deleteTagAPI,
  getProjects,
  getTags,
  updateProject as updateProjectAPI,
  updateTag as updateTagAPI,
} from '../api/tasks';
import type { Project, Tag } from '../types/task';

type UseProjectTagCatalogOptions = {
  setError: (message: string) => void;
};

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type CreateTagOptions = {
  resetColor?: boolean;
};

type UseProjectTagCatalogResult = {
  catalog: {
    projects: Project[];
    tags: Tag[];
  };
  drafts: {
    newProjectTitle: string;
    newTagTitle: string;
    newTagColor: string;
  };
  draftSetters: {
    setNewProjectTitle: StateSetter<string>;
    setNewTagTitle: StateSetter<string>;
    setNewTagColor: StateSetter<string>;
  };
  actions: {
    loadProjectTagCatalog: () => Promise<void>;
    createProjectFromDraft: () => Promise<Project | null>;
    createTagFromDraft: (options?: CreateTagOptions) => Promise<Tag | null>;
    createProjectInCatalog: (title: string) => Promise<Project | null>;
    createTagInCatalog: (title: string, color: string) => Promise<Tag | null>;
    updateProjectTitle: (projectID: number, title: string) => Promise<boolean>;
    updateTagDetails: (tagID: number, update: Pick<Tag, 'title' | 'color'>) => Promise<boolean>;
    updateTagColor: (tagID: number, color: string) => Promise<boolean>;
    deleteProjectFromCatalog: (projectID: number) => Promise<boolean>;
    deleteTagFromCatalog: (tagID: number) => Promise<boolean>;
  };
};

export default function useProjectTagCatalog({ setError }: UseProjectTagCatalogOptions): UseProjectTagCatalogResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newTagTitle, setNewTagTitle] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  const loadProjectTagCatalog = async () => {
    const [projectResult, tagResult] = await Promise.allSettled([
      getProjects(),
      getTags(),
    ]);

    if (projectResult.status === 'fulfilled') setProjects(projectResult.value);
    if (tagResult.status === 'fulfilled') setTags(tagResult.value);

    if (projectResult.status === 'rejected' || tagResult.status === 'rejected') {
      setError('Failed to load projects or tags.');
    }
  };

  const createProjectInCatalog = async (rawTitle: string) => {
    const title = rawTitle.trim();
    if (!title) return null;
    try {
      const saved = await createProject({ title });
      setProjects(prev => [...prev, saved]);
      return saved;
    } catch {
      setError('Failed to create project.');
      return null;
    }
  };

  const createProjectFromDraft = async () => {
    const saved = await createProjectInCatalog(newProjectTitle);
    if (saved) setNewProjectTitle('');
    return saved;
  };

  const createTagInCatalog = async (rawTitle: string, color: string) => {
    const title = rawTitle.trim();
    if (!title) return null;
    try {
      const saved = await createTag({ title, color });
      setTags(prev => [...prev, saved]);
      return saved;
    } catch {
      setError('Failed to create tag.');
      return null;
    }
  };

  const createTagFromDraft = async ({ resetColor = true }: CreateTagOptions = {}) => {
    const saved = await createTagInCatalog(newTagTitle, newTagColor);
    if (saved) {
      setNewTagTitle('');
      if (resetColor) setNewTagColor('#6366f1');
    }
    return saved;
  };

  const updateProjectTitle = async (projectID: number, rawTitle: string) => {
    const title = rawTitle.trim();
    const project = projects.find(item => item.projectID === projectID);
    if (!title || !project) return false;
    try {
      const { projectID: _projectID, ...projectFields } = project;
      const saved = await updateProjectAPI(projectID, { ...projectFields, title });
      setProjects(prev => prev.map(item => item.projectID === projectID ? saved : item));
      return true;
    } catch {
      setError('Failed to update project.');
      return false;
    }
  };

  const updateTagDetails = async (tagID: number, update: Pick<Tag, 'title' | 'color'>) => {
    try {
      const saved = await updateTagAPI(tagID, update);
      setTags(prev => prev.map(tag => tag.tagID === tagID ? saved : tag));
      return true;
    } catch {
      setError('Failed to update tag.');
      return false;
    }
  };

  const updateTagColor = async (tagID: number, color: string) => {
    const tag = tags.find(item => item.tagID === tagID);
    if (!tag) return false;
    return updateTagDetails(tagID, { title: tag.title, color });
  };

  const deleteTagFromCatalog = async (tagID: number) => {
    try {
      await deleteTagAPI(tagID);
      setTags(prev => prev.filter(t => t.tagID !== tagID));
      return true;
    } catch {
      setError('Failed to delete tag.');
      return false;
    }
  };

  const deleteProjectFromCatalog = async (projectID: number) => {
    try {
      await deleteProjectAPI(projectID);
      setProjects(prev => prev.filter(p => p.projectID !== projectID));
      return true;
    } catch {
      setError('Failed to delete project.');
      return false;
    }
  };

  return {
    catalog: {
      projects,
      tags,
    },
    drafts: {
      newProjectTitle,
      newTagTitle,
      newTagColor,
    },
    draftSetters: {
      setNewProjectTitle,
      setNewTagTitle,
      setNewTagColor,
    },
    actions: {
      loadProjectTagCatalog,
      createProjectFromDraft,
      createTagFromDraft,
      createProjectInCatalog,
      createTagInCatalog,
      updateProjectTitle,
      updateTagDetails,
      updateTagColor,
      deleteProjectFromCatalog,
      deleteTagFromCatalog,
    },
  };
}
