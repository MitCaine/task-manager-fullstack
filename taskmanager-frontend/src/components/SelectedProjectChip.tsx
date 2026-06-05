import type { Project } from '../types/task';
import { ProjectBadge } from './TagProjectChips';

type SelectedProjectChipProps = {
  project: Project | null;
  onRemove: () => void;
};

function SelectedProjectChip({ project, onRemove }: SelectedProjectChipProps): JSX.Element | null {
  if (!project) return null;

  return (
    <div className="form-selected-chip">
      <ProjectBadge title={project.title} />
      <button type="button" className="form-chip-clear" onClick={onRemove} aria-label={`Remove project ${project.title}`}>×</button>
    </div>
  );
}

export default SelectedProjectChip;
