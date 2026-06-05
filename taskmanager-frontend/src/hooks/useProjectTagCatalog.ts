import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  createProject,
  createTag,
  deleteProject as deleteProjectAPI,
  deleteTag as deleteTagAPI,
  getProjects,
  getTags,
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
    const [projectResult, tagResult] = await Promise.allSettled([getProjects(), getTags()]);
    if (projectResult.status === 'fulfilled') setProjects(projectResult.value);
    if (tagResult.status === 'fulfilled') setTags(tagResult.value);
  };

  const createProjectFromDraft = async () => {
    const title = newProjectTitle.trim();
    if (!title) return null;
    try {
      const saved = await createProject({ title });
      setProjects(prev => [...prev, saved]);
      setNewProjectTitle('');
      return saved;
    } catch {
      setError('Failed to create project.');
      return null;
    }
  };

  const createTagFromDraft = async ({ resetColor = true }: CreateTagOptions = {}) => {
    const title = newTagTitle.trim();
    if (!title) return null;
    try {
      const saved = await createTag({ title, color: newTagColor });
      setTags(prev => [...prev, saved]);
      setNewTagTitle('');
      if (resetColor) setNewTagColor('#6366f1');
      return saved;
    } catch {
      setError('Failed to create tag.');
      return null;
    }
  };

  const updateTagColor = async (tagID: number, color: string) => {
    try {
      await updateTagAPI(tagID, color);
      setTags(prev => prev.map(t => t.tagID === tagID ? { ...t, color } : t));
      return true;
    } catch {
      setError('Failed to update tag color.');
      return false;
    }
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
      updateTagColor,
      deleteProjectFromCatalog,
      deleteTagFromCatalog,
    },
  };
}
