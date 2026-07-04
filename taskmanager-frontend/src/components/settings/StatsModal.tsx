import type { RefObject } from 'react';

export type StatsData = {
  total: number;
  done: number;
  active: number;
  overdue: number;
  doneThisWeek: number;
  high: number;
  medium: number;
  low: number;
  noPriority: number;
  completionRate: number;
};

export type StatsModalProps = {
  statsData: StatsData;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement>;
};

export default function StatsModal({ statsData, onClose, closeButtonRef }: StatsModalProps): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stats-modal" role="dialog" aria-modal="true" aria-labelledby="stats-title" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="stats-title">Stats</h2>
          <button ref={closeButtonRef} className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close stats">×</button>
        </div>
        <div className="stats">
          <div className="stats__row">
            <div className="stats__card"><span className="stats__num">{statsData.total}</span><span className="stats__label">Total</span></div>
            <div className="stats__card"><span className="stats__num stats__num--done">{statsData.done}</span><span className="stats__label">Done</span></div>
            <div className="stats__card"><span className="stats__num">{statsData.active}</span><span className="stats__label">Active</span></div>
            <div className="stats__card"><span className="stats__num stats__num--overdue">{statsData.overdue}</span><span className="stats__label">Overdue</span></div>
          </div>
          <div className="stats__row">
            <div className="stats__card stats__card--wide"><span className="stats__num stats__num--done">{statsData.completionRate}%</span><span className="stats__label">Completion rate</span></div>
            <div className="stats__card stats__card--wide"><span className="stats__num">{statsData.doneThisWeek}</span><span className="stats__label">Done this week</span></div>
          </div>
          <div className="stats__section">
            <span className="stats__section-title">By Priority</span>
            {[['High', statsData.high, '#f87171'], ['Medium', statsData.medium, '#fbbf24'], ['Low', statsData.low, '#4ade80'], ['None', statsData.noPriority, 'var(--text-faint)']] .map(([label, count, color]) => (
              <div key={String(label)} className="stats__bar-row">
                <span className="stats__bar-label">{label}</span>
                <div className="stats__bar-track">
                  <div className="stats__bar-fill" style={{ width: statsData.total > 0 ? `${Math.round((Number(count) / statsData.total) * 100)}%` : '0%', background: String(color) }} />
                </div>
                <span className="stats__bar-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
