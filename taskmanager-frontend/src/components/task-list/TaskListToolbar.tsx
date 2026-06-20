import type { RefObject } from 'react';
import type { Project, Tag } from '../../types/task';
import CatalogManagementModal from '../settings/CatalogManagementModal';
import SettingsPanel from '../settings/SettingsPanel';
import { TaskListDateLabel } from './TaskListPresentation';

type CatalogSection = 'projects' | 'tags';

type TaskListToolbarProps<ThemeValue extends string> = {
  isEuropeanDate: boolean;
  settingsRef: RefObject<HTMLDivElement>;
  statsTriggerRef: RefObject<HTMLButtonElement>;
  settingsTriggerRef: RefObject<HTMLButtonElement>;
  showSettings: boolean;
  is24Hour: boolean;
  theme: ThemeValue;
  themeLabel: Record<ThemeValue, string>;
  themeOptions: ThemeValue[];
  catalogManagerSection: CatalogSection | null;
  projects: Project[];
  tags: Tag[];
  projectUsage: Map<number, number>;
  tagUsage: Map<number, number>;
  onToggleStats: () => void;
  onToggleSettings: () => void;
  onToggleTimeFormat: () => void;
  onToggleDateFormat: () => void;
  onThemeChange: (theme: ThemeValue) => void;
  onManageProjects: () => void;
  onManageTags: () => void;
  onCloseCatalogManager: () => void;
  onCreateProject: (title: string) => Promise<boolean>;
  onCreateTag: (title: string, color: string) => Promise<boolean>;
  onRenameProject: (projectID: number, title: string) => Promise<boolean>;
  onUpdateTag: (tagID: number, title: string, color: string) => Promise<boolean>;
  onDeleteProject: (projectID: number) => Promise<void>;
  onDeleteTag: (tagID: number) => Promise<void>;
};

export default function TaskListToolbar<ThemeValue extends string>({
  isEuropeanDate,
  settingsRef,
  statsTriggerRef,
  settingsTriggerRef,
  showSettings,
  is24Hour,
  theme,
  themeLabel,
  themeOptions,
  catalogManagerSection,
  projects,
  tags,
  projectUsage,
  tagUsage,
  onToggleStats,
  onToggleSettings,
  onToggleTimeFormat,
  onToggleDateFormat,
  onThemeChange,
  onManageProjects,
  onManageTags,
  onCloseCatalogManager,
  onCreateProject,
  onCreateTag,
  onRenameProject,
  onUpdateTag,
  onDeleteProject,
  onDeleteTag,
}: TaskListToolbarProps<ThemeValue>): JSX.Element {
  return (
    <>
      <div ref={settingsRef}>
        <div className="task-card-toolbar">
          <TaskListDateLabel isEuropeanDate={isEuropeanDate} />
          <div className="header-actions">
            <button
              ref={statsTriggerRef}
              className="btn btn--ghost btn--sm"
              onClick={onToggleStats}
            >
              ▤ Stats
            </button>
            <button
              ref={settingsTriggerRef}
              className="btn btn--ghost btn--sm"
              aria-expanded={showSettings}
              aria-controls="task-card-settings-panel"
              onClick={onToggleSettings}
            >
              ⚙ Settings
            </button>
          </div>
        </div>

        {showSettings && (
          <SettingsPanel
            is24Hour={is24Hour}
            isEuropeanDate={isEuropeanDate}
            theme={theme}
            themeLabel={themeLabel}
            themeOptions={themeOptions}
            onToggleTimeFormat={onToggleTimeFormat}
            onToggleDateFormat={onToggleDateFormat}
            onThemeChange={onThemeChange}
            onManageProjects={onManageProjects}
            onManageTags={onManageTags}
          />
        )}
      </div>

      {catalogManagerSection && (
        <CatalogManagementModal
          initialSection={catalogManagerSection}
          projects={projects}
          tags={tags}
          projectUsage={projectUsage}
          tagUsage={tagUsage}
          onClose={onCloseCatalogManager}
          onCreateProject={onCreateProject}
          onCreateTag={onCreateTag}
          onRenameProject={onRenameProject}
          onUpdateTag={onUpdateTag}
          onDeleteProject={onDeleteProject}
          onDeleteTag={onDeleteTag}
        />
      )}
    </>
  );
}
