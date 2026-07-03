import { createProject, deleteProject, getProjects, updateProject } from '../../api/tasks';
import type { Project } from '../../types/task';
import { describeProjectRepositoryContract } from '../contracts/projectRepositoryContract';
import { ApiProjectRepository } from './ApiProjectRepository';

jest.mock('../../api/tasks');

const mockGetProjects = getProjects as jest.MockedFunction<typeof getProjects>;
const mockCreateProject = createProject as jest.MockedFunction<typeof createProject>;
const mockUpdateProject = updateProject as jest.MockedFunction<typeof updateProject>;
const mockDeleteProject = deleteProject as jest.MockedFunction<typeof deleteProject>;

let nextProjectId = 100;
const projectStore = new Map<number, Project>();
const deletedProjectIds = new Set<number>();

function installProjectApiMocks() {
  mockGetProjects.mockImplementation(async () => Array.from(projectStore.values()));
  mockCreateProject.mockImplementation(async input => {
    const project: Project = { ...input, projectID: nextProjectId++ };
    projectStore.set(project.projectID, project);
    return project;
  });
  mockUpdateProject.mockImplementation(async (id, input) => {
    const current = projectStore.get(id);
    if (!current) throw new Error(`Project ${id} not found`);
    const project: Project = { ...current, ...input, projectID: id };
    projectStore.set(id, project);
    return project;
  });
  mockDeleteProject.mockImplementation(async id => {
    deletedProjectIds.add(id);
    projectStore.delete(id);
  });
}

beforeEach(() => {
  nextProjectId = 100;
  projectStore.clear();
  deletedProjectIds.clear();
  jest.clearAllMocks();
  installProjectApiMocks();
});

describeProjectRepositoryContract({
  createRepository: () => new ApiProjectRepository(),
  seedProject: project => {
    projectStore.set(Number(project.id), {
      projectID: Number(project.id),
      title: project.title,
      description: project.description,
      dueDate: project.dueDate,
    });
  },
  expectDeleted: id => {
    expect(deletedProjectIds.has(Number(id))).toBe(true);
  },
});
