package com.mitchell.taskmanager;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
public class ReminderController {

    private final ReminderRepository reminderRepository;
    private final TaskRepository taskRepository;

    public ReminderController(ReminderRepository reminderRepository, TaskRepository taskRepository) {
        this.reminderRepository = reminderRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/tasks/{taskId}/reminders")
    public ResponseEntity<List<Reminder>> getReminders(@PathVariable Long taskId) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId,
                () -> ResponseEntity.ok(reminderRepository.findByTaskID(taskId)));
    }

    @PostMapping("/tasks/{taskId}/reminders")
    public ResponseEntity<Reminder> createReminder(
            @PathVariable Long taskId,
            @Valid @RequestBody Reminder reminder) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId, () -> {
            reminder.setReminderID(null);
            reminder.setTaskID(taskId);
            Reminder saved = reminderRepository.save(reminder);
            return ResponseEntity
                    .created(URI.create("/tasks/" + taskId + "/reminders/" + saved.getReminderID()))
                    .body(saved);
        });
    }

    private record DueDateUpdate(@NotNull(message = "Due date must not be null") LocalDateTime dueDate) {}

    @PatchMapping("/reminders/{id}")
    public ResponseEntity<Reminder> patchReminder(@PathVariable Long id, @Valid @RequestBody DueDateUpdate req) {
        return reminderRepository.findById(id).map(r -> {
            r.setDueDate(req.dueDate());
            return ResponseEntity.ok(reminderRepository.save(r));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/reminders/{id}")
    public ResponseEntity<Void> deleteReminder(@PathVariable Long id) {
        if (!reminderRepository.existsById(id)) return ResponseEntity.notFound().build();
        reminderRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
