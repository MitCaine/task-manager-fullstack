import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Project, Tag } from '../types/task';
import type { Project as DomainProject, Tag as DomainTag } from '../domain/models';
import { useRepositories } from '../repositories';

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

function toUiProject(project: DomainProject): Project {
  const uiProject: Project = {
    projectID: Number(project.id),
    title: project.title,
  };

  if (project.description !== undefined) uiProject.description = project.description;
  if (project.dueDate !== undefined) uiProject.dueDate = project.dueDate;

  return uiProject;
}

function toUiTag(tag: DomainTag): Tag {
  return {
    tagID: Number(tag.id),
    title: tag.title,
    color: tag.color ?? null,
  };
}

export default function useProjectTagCatalog({ setError }: UseProjectTagCatalogOptions): UseProjectTagCatalogResult {
  const repositories = useRepositories();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newTagTitle, setNewTagTitle] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  const loadProjectTagCatalog = async () => {
    const [projectResult, tagResult] = await Promise.allSettled([
      repositories.projects.list(),
      repositories.tags.list(),
    ]);

    if (projectResult.status === 'fulfilled') setProjects(projectResult.value.map(toUiProject));
    if (tagResult.status === 'fulfilled') setTags(tagResult.value.map(toUiTag));

    if (projectResult.status === 'rejected' || tagResult.status === 'rejected') {
      setError('Failed to load projects or tags.');
    }
  };

  const createProjectInCatalog = async (rawTitle: string) => {
    const title = rawTitle.trim();
    if (!title) return null;
    try {
      const saved = toUiProject(await repositories.projects.create({ title }));
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
      const saved = toUiTag(await repositories.tags.create({ title, color }));
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
      const saved = toUiProject(await repositories.projects.update(String(projectID), {
        title,
        description: project.description,
        dueDate: project.dueDate,
      }));
      setProjects(prev => prev.map(item => item.projectID === projectID ? saved : item));
      return true;
    } catch {
      setError('Failed to update project.');
      return false;
    }
  };

  const updateTagDetails = async (tagID: number, update: Pick<Tag, 'title' | 'color'>) => {
    try {
      const saved = toUiTag(await repositories.tags.update(String(tagID), update));
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
      await repositories.tags.delete(String(tagID));
      setTags(prev => prev.filter(t => t.tagID !== tagID));
      return true;
    } catch {
      setError('Failed to delete tag.');
      return false;
    }
  };

  const deleteProjectFromCatalog = async (projectID: number) => {
    try {
      await repositories.projects.delete(String(projectID));
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
