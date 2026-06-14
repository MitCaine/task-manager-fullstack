export type SettingsPanelProps<ThemeValue extends string> = {
  is24Hour: boolean;
  isEuropeanDate: boolean;
  theme: ThemeValue;
  themeLabel: Record<ThemeValue, string>;
  themeOptions: ThemeValue[];
  onToggleTimeFormat: () => void;
  onToggleDateFormat: () => void;
  onThemeChange: (theme: ThemeValue) => void;
  onManageProjects: () => void;
  onManageTags: () => void;
};

export default function SettingsPanel<ThemeValue extends string>({
  is24Hour,
  isEuropeanDate,
  theme,
  themeLabel,
  themeOptions,
  onToggleTimeFormat,
  onToggleDateFormat,
  onThemeChange,
  onManageProjects,
  onManageTags,
}: SettingsPanelProps<ThemeValue>): JSX.Element {
  return (
    <div id="task-card-settings-panel" className="settings-panel task-card-settings" role="region" aria-label="Settings">
      <button className="btn btn--ghost btn--sm" onClick={onToggleTimeFormat}>
        {is24Hour ? '12-hour' : '24-hour'}
      </button>
      <button className="btn btn--ghost btn--sm" onClick={onToggleDateFormat}>
        {isEuropeanDate ? 'MM/DD/YYYY' : 'DD/MM/YYYY'}
      </button>
      <button className="btn btn--ghost btn--sm" onClick={onManageProjects}>Manage Projects</button>
      <button className="btn btn--ghost btn--sm" onClick={onManageTags}>Manage Tags</button>
      <div className="settings-theme">
        <span className="settings-label">Theme</span>
        <select className="select select--sm" value={theme} onChange={e => onThemeChange(e.target.value as ThemeValue)}>
          {themeOptions.map(t => (
            <option key={t} value={t}>{themeLabel[t]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
