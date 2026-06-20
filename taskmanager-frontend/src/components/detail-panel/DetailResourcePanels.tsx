import type { Attachment, Note, Reminder, Subtask } from '../../types/task';
import type { DateTimeRowProps } from '../shared/DateTimeRow';
import DetailSectionShell from '../shared/DetailSectionShell';
import { DetailLinksPanel, DetailNotesPanel, DetailSubtasksPanel } from './DetailAuxiliaryPanels';
import RemindersSection from './RemindersSection';

type DetailSubtasksPanelGroupProps = {
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

type DetailNotesPanelGroupProps = {
  notes: Note[];
  newNoteContent: string;
  onNoteContentChange: (value: string) => void;
  onAddNote: () => void;
  onRemoveNote: (noteId: number) => void;
};

type DetailRemindersPanelGroupProps = {
  reminders: Reminder[];
  dateTimeRowProps: DateTimeRowProps;
  newReminderMessage: string;
  onReminderMessageChange: (value: string) => void;
  onAddReminder: () => void;
  onRemoveReminder: (reminderId: number) => void;
};

type DetailLinksPanelGroupProps = {
  attachments: Attachment[];
  newAttachmentUrl: string;
  newAttachmentLabel: string;
  onAttachmentUrlChange: (value: string) => void;
  onAttachmentLabelChange: (value: string) => void;
  onAddAttachment: () => void;
  onRemoveAttachment: (attachmentId: number) => void;
};

type DetailResourcePanelsProps = {
  openSections: Set<string>;
  onToggleSection: (name: string) => void;
  subtasksPanel: DetailSubtasksPanelGroupProps;
  notesPanel: DetailNotesPanelGroupProps;
  remindersPanel: DetailRemindersPanelGroupProps;
  linksPanel: DetailLinksPanelGroupProps;
  formatDateTime: (dateTime: string) => string;
};

export default function DetailResourcePanels({
  openSections,
  onToggleSection,
  subtasksPanel,
  notesPanel,
  remindersPanel,
  linksPanel,
  formatDateTime,
}: DetailResourcePanelsProps): JSX.Element {
  return (
    <>
      <DetailSubtasksPanel
        isOpen={openSections.has('subtasks')}
        onToggle={() => onToggleSection('subtasks')}
        subtasks={subtasksPanel.subtasks}
        doneCount={subtasksPanel.doneCount}
        newSubtaskTitle={subtasksPanel.newSubtaskTitle}
        editingSubtaskId={subtasksPanel.editingSubtaskId}
        editingSubtaskTitle={subtasksPanel.editingSubtaskTitle}
        onNewSubtaskTitleChange={subtasksPanel.onNewSubtaskTitleChange}
        onAddSubtask={subtasksPanel.onAddSubtask}
        onToggleSubtask={subtasksPanel.onToggleSubtask}
        onRemoveSubtask={subtasksPanel.onRemoveSubtask}
        onStartEditSubtask={subtasksPanel.onStartEditSubtask}
        onEditingSubtaskTitleChange={subtasksPanel.onEditingSubtaskTitleChange}
        onSaveSubtaskTitle={subtasksPanel.onSaveSubtaskTitle}
        onCancelEditSubtask={subtasksPanel.onCancelEditSubtask}
      />

      <DetailNotesPanel
        isOpen={openSections.has('notes')}
        onToggle={() => onToggleSection('notes')}
        notes={notesPanel.notes}
        newNoteContent={notesPanel.newNoteContent}
        onNoteContentChange={notesPanel.onNoteContentChange}
        onAddNote={notesPanel.onAddNote}
        onRemoveNote={notesPanel.onRemoveNote}
        formatDateTime={formatDateTime}
      />

      <DetailSectionShell
        title="Reminders"
        isOpen={openSections.has('reminders')}
        onToggle={() => onToggleSection('reminders')}
        badgeContent={remindersPanel.reminders.length > 0 ? remindersPanel.reminders.length : null}
      >
        <RemindersSection
          reminders={remindersPanel.reminders}
          dateTimeRowProps={remindersPanel.dateTimeRowProps}
          newReminderMessage={remindersPanel.newReminderMessage}
          onReminderMessageChange={remindersPanel.onReminderMessageChange}
          onAddReminder={remindersPanel.onAddReminder}
          onRemoveReminder={remindersPanel.onRemoveReminder}
          formatDateTime={formatDateTime}
        />
      </DetailSectionShell>

      <DetailLinksPanel
        isOpen={openSections.has('attachments')}
        onToggle={() => onToggleSection('attachments')}
        attachments={linksPanel.attachments}
        newAttachmentUrl={linksPanel.newAttachmentUrl}
        newAttachmentLabel={linksPanel.newAttachmentLabel}
        onAttachmentUrlChange={linksPanel.onAttachmentUrlChange}
        onAttachmentLabelChange={linksPanel.onAttachmentLabelChange}
        onAddAttachment={linksPanel.onAddAttachment}
        onRemoveAttachment={linksPanel.onRemoveAttachment}
      />
    </>
  );
}
