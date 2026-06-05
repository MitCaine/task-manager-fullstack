import { ProjectBadge } from '../create-task/TagProjectChips';

type DetailStatusBadgesProps = {
  overdue: boolean;
  projectTitle?: string | null;
};

function DetailStatusBadges({ overdue, projectTitle }: DetailStatusBadgesProps) {
  if (!overdue && !projectTitle) return null;

  return (
    <div className="detail__status-row">
      {overdue && <span className="item__badge">Overdue</span>}
      {projectTitle && <ProjectBadge title={projectTitle} />}
    </div>
  );
}

export default DetailStatusBadges;
