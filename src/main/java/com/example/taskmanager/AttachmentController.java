package com.example.taskmanager;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
public class AttachmentController {

    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;

    public AttachmentController(AttachmentRepository attachmentRepository, TaskRepository taskRepository) {
        this.attachmentRepository = attachmentRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/tasks/{taskId}/attachments")
    public ResponseEntity<List<Attachment>> getAttachments(@PathVariable Long taskId) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId,
                () -> ResponseEntity.ok(attachmentRepository.findByTaskID(taskId)));
    }

    @PostMapping("/tasks/{taskId}/attachments")
    public ResponseEntity<Attachment> createAttachment(
            @PathVariable Long taskId,
            @Valid @RequestBody Attachment attachment) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId, () -> {
            attachment.setAttachmentID(null);
            attachment.setTaskID(taskId);
            attachment.setFileSize(0);
            Attachment saved = attachmentRepository.save(attachment);
            return ResponseEntity
                    .created(URI.create("/tasks/" + taskId + "/attachments/" + saved.getAttachmentID()))
                    .body(saved);
        });
    }

    @DeleteMapping("/attachments/{id}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long id) {
        if (!attachmentRepository.existsById(id)) return ResponseEntity.notFound().build();
        attachmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
