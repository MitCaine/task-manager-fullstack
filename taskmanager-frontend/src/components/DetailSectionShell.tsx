import type { ReactNode } from 'react';

type DetailSectionShellProps = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badgeContent?: ReactNode;
  badgeClassName?: string;
  children: ReactNode;
};

function DetailSectionShell({
  title,
  isOpen,
  onToggle,
  badgeContent,
  badgeClassName = 'item__badge item__badge--subtasks',
  children,
}: DetailSectionShellProps) {
  return (
    <div className="detail__section">
      <button className="detail__section-header detail__section-toggle" onClick={onToggle}>
        <span className="detail__section-title">{title}</span>
        <div className="detail__section-header-right">
          {badgeContent !== undefined && badgeContent !== null && (
            <span className={badgeClassName}>{badgeContent}</span>
          )}
          <span className="detail__chevron">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>
      {isOpen && children}
    </div>
  );
}

export default DetailSectionShell;
