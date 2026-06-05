import type { ChangeEvent, KeyboardEvent } from 'react';
import type { Attachment } from '../types/task';

type LinksSectionProps = {
  attachments: Attachment[];
  newAttachmentUrl: string;
  newAttachmentLabel: string;
  onAttachmentUrlChange: (value: string) => void;
  onAttachmentLabelChange: (value: string) => void;
  onAddAttachment: () => void;
  onRemoveAttachment: (attachmentId: number) => void;
};

function LinksSection({
  attachments,
  newAttachmentUrl,
  newAttachmentLabel,
  onAttachmentUrlChange,
  onAttachmentLabelChange,
  onAddAttachment,
  onRemoveAttachment,
}: LinksSectionProps) {
  const handleAddOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onAddAttachment();
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAttachmentUrlChange(event.target.value);
  };

  const handleLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAttachmentLabelChange(event.target.value);
  };

  return (
    <>
      <div className="sec-panel__add sec-panel__add--col">
        <input
          className="input"
          placeholder="URL…"
          aria-label="Attachment URL"
          value={newAttachmentUrl}
          onChange={handleUrlChange}
          onKeyDown={handleAddOnEnter}
          autoFocus
        />
        <input
          className="input"
          placeholder="Label (optional)…"
          aria-label="Attachment label"
          value={newAttachmentLabel}
          onChange={handleLabelChange}
          onKeyDown={handleAddOnEnter}
        />
        <button className="btn btn--sm" onClick={onAddAttachment}>Add Link</button>
      </div>
      {attachments.length === 0
        ? <p className="sec-panel__empty">No links yet.</p>
        : attachments.map(attachment => (
          <div key={attachment.attachmentID} className="sec-row">
            <div className="sec-row__body">
              <a href={attachment.fileORLink} target="_blank" rel="noopener noreferrer" className="attachment-link">
                {attachment.metadata || attachment.fileORLink}
              </a>
            </div>
            <button className="btn btn--danger btn--icon" onClick={() => onRemoveAttachment(attachment.attachmentID)} aria-label="Delete attachment">✕</button>
          </div>
        ))
      }
    </>
  );
}

export default LinksSection;
