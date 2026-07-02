import { createProject, deleteProject, getProjects, updateProject } from '../../api/tasks';
import type { CreateProjectInput, EntityId, Project, UpdateProjectInput } from '../../domain/models';
import type { ProjectRepository } from '../contracts';
import {
  mapCreateProjectInputToDto,
  mapProjectDtoToDomain,
  mapUpdateProjectInputToDto,
} from './mappers/ProjectMapper';
import { toApiId } from './mappers/mapperUtils';

export class ApiProjectRepository implements ProjectRepository {
  async list(): Promise<Project[]> {
    const projects = await getProjects();
    return projects.map(mapProjectDtoToDomain);
  }

  async create(input: CreateProjectInput): Promise<Project> {
    return mapProjectDtoToDomain(await createProject(mapCreateProjectInputToDto(input)));
  }

  async update(id: EntityId, input: UpdateProjectInput): Promise<Project> {
    return mapProjectDtoToDomain(await updateProject(toApiId(id), mapUpdateProjectInputToDto(input)));
  }

  async delete(id: EntityId): Promise<void> {
    await deleteProject(toApiId(id));
  }
}
