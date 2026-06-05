import type { Attachment, Note, Subtask } from '../types/task';
import DetailSectionShell from './DetailSectionShell';
import LinksSection from './LinksSection';
import NotesSection from './NotesSection';
import SubtasksSection from './SubtasksSection';

type DetailSubtasksPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  subtasks: Subtask[];
  doneCount: number;
  newSubtaskTitle: string;
  editingSubtaskId: number | null;
  editingSubtaskTitle: string;
  onNewSubtaskTitleChange: (value: string) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onRemoveSubtask: (subtaskId: number) => void;
  onStartEditSubtask: (subtask: Subtask) => void;
  onEditingSubtaskTitleChange: (value: string) => void;
  onSaveSubtaskTitle: (subtask: Subtask) => void;
  onCancelEditSubtask: () => void;
};

export function DetailSubtasksPanel({
  isOpen,
  onToggle,
  subtasks,
  doneCount,
  newSubtaskTitle,
  editingSubtaskId,
  editingSubtaskTitle,
  onNewSubtaskTitleChange,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onStartEditSubtask,
  onEditingSubtaskTitleChange,
  onSaveSubtaskTitle,
  onCancelEditSubtask,
}: DetailSubtasksPanelProps): JSX.Element {
  return (
    <DetailSectionShell
      title="Subtasks"
      isOpen={isOpen}
      onToggle={onToggle}
      badgeContent={subtasks.length > 0 ? `${doneCount}/${subtasks.length}` : null}
      badgeClassName={`item__badge ${doneCount === subtasks.length ? 'item__badge--subtasks-done' : 'item__badge--subtasks'}`}
    >
      <SubtasksSection
        subtasks={subtasks}
        newSubtaskTitle={newSubtaskTitle}
        editingSubtaskId={editingSubtaskId}
        editingSubtaskTitle={editingSubtaskTitle}
        onNewSubtaskTitleChange={onNewSubtaskTitleChange}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onRemoveSubtask={onRemoveSubtask}
        onStartEditSubtask={onStartEditSubtask}
        onEditingSubtaskTitleChange={onEditingSubtaskTitleChange}
        onSaveSubtaskTitle={onSaveSubtaskTitle}
        onCancelEditSubtask={onCancelEditSubtask}
      />
    </DetailSectionShell>
  );
}

type DetailNotesPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  notes: Note[];
  newNoteContent: string;
  onNoteContentChange: (value: string) => void;
  onAddNote: () => void;
  onRemoveNote: (noteId: number) => void;
  formatDateTime: (dateTime: string) => string;
};

export function DetailNotesPanel({
  isOpen,
  onToggle,
  notes,
  newNoteContent,
  onNoteContentChange,
  onAddNote,
  onRemoveNote,
  formatDateTime,
}: DetailNotesPanelProps): JSX.Element {
  return (
    <DetailSectionShell
      title="Notes"
      isOpen={isOpen}
      onToggle={onToggle}
      badgeContent={notes.length > 0 ? notes.length : null}
    >
      <NotesSection
        notes={notes}
        newNoteContent={newNoteContent}
        onNoteContentChange={onNoteContentChange}
        onAddNote={onAddNote}
        onRemoveNote={onRemoveNote}
        formatDateTime={formatDateTime}
      />
    </DetailSectionShell>
  );
}

type DetailLinksPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  attachments: Attachment[];
  newAttachmentUrl: string;
  newAttachmentLabel: string;
  onAttachmentUrlChange: (value: string) => void;
  onAttachmentLabelChange: (value: string) => void;
  onAddAttachment: () => void;
  onRemoveAttachment: (attachmentId: number) => void;
};

export function DetailLinksPanel({
  isOpen,
  onToggle,
  attachments,
  newAttachmentUrl,
  newAttachmentLabel,
  onAttachmentUrlChange,
  onAttachmentLabelChange,
  onAddAttachment,
  onRemoveAttachment,
}: DetailLinksPanelProps): JSX.Element {
  return (
    <DetailSectionShell
      title="Links"
      isOpen={isOpen}
      onToggle={onToggle}
      badgeContent={attachments.length > 0 ? attachments.length : null}
    >
      <LinksSection
        attachments={attachments}
        newAttachmentUrl={newAttachmentUrl}
        newAttachmentLabel={newAttachmentLabel}
        onAttachmentUrlChange={onAttachmentUrlChange}
        onAttachmentLabelChange={onAttachmentLabelChange}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={onRemoveAttachment}
      />
    </DetailSectionShell>
  );
}
