package com.mitchell.taskmanager;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
public class SubtaskController {

    private final SubtaskRepository subtaskRepository;
    private final TaskRepository taskRepository;

    public SubtaskController(SubtaskRepository subtaskRepository, TaskRepository taskRepository) {
        this.subtaskRepository = subtaskRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/tasks/{taskId}/subtasks")
    public ResponseEntity<List<Subtask>> getSubtasks(@PathVariable Long taskId) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId,
                () -> ResponseEntity.ok(subtaskRepository.findByParentTaskID(taskId)));
    }

    @PostMapping("/tasks/{taskId}/subtasks")
    public ResponseEntity<Subtask> createSubtask(
            @PathVariable Long taskId,
            @Valid @RequestBody Subtask subtask) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId, () -> {
            subtask.setSubTaskID(null);
            subtask.setParentTaskID(taskId);
            Subtask saved = subtaskRepository.save(subtask);
            return ResponseEntity
                    .created(URI.create("/tasks/" + taskId + "/subtasks/" + saved.getSubTaskID()))
                    .body(saved);
        });
    }

    private record StatusUpdateRequest(Long statusID) {}

    @PatchMapping("/subtasks/{id}/status")
    public ResponseEntity<Subtask> patchSubtaskStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequest req) {
        return subtaskRepository.findById(id)
                .map(subtask -> {
                    subtask.setStatusID(req.statusID());
                    return ResponseEntity.ok(subtaskRepository.save(subtask));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/subtasks/{id}")
    public ResponseEntity<Subtask> updateSubtask(@PathVariable Long id, @Valid @RequestBody Subtask updated) {
        return subtaskRepository.findById(id)
                .map(subtask -> {
                    subtask.setTitle(updated.getTitle());
                    if (updated.getDateTimeScheduled() != null) {
                        subtask.setDateTimeScheduled(updated.getDateTimeScheduled());
                    }
                    return ResponseEntity.ok(subtaskRepository.save(subtask));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/subtasks/{id}")
    public ResponseEntity<Void> deleteSubtask(@PathVariable Long id) {
        if (!subtaskRepository.existsById(id)) return ResponseEntity.notFound().build();
        subtaskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
