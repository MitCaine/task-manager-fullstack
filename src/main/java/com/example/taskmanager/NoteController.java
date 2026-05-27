package com.example.taskmanager;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
public class NoteController {

    private final NoteRepository noteRepository;
    private final TaskRepository taskRepository;

    public NoteController(NoteRepository noteRepository, TaskRepository taskRepository) {
        this.noteRepository = noteRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/tasks/{taskId}/notes")
    public ResponseEntity<List<Note>> getNotes(@PathVariable Long taskId) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId,
                () -> ResponseEntity.ok(noteRepository.findByTaskID(taskId)));
    }

    @PostMapping("/tasks/{taskId}/notes")
    public ResponseEntity<Note> createNote(
            @PathVariable Long taskId,
            @Valid @RequestBody Note note) {
        return ParentTaskGuard.withExistingTask(taskRepository, taskId, () -> {
            note.setNoteID(null);
            note.setTaskID(taskId);
            note.setTimestamp(LocalDateTime.now());
            Note saved = noteRepository.save(note);
            return ResponseEntity
                    .created(URI.create("/tasks/" + taskId + "/notes/" + saved.getNoteID()))
                    .body(saved);
        });
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        if (!noteRepository.existsById(id)) return ResponseEntity.notFound().build();
        noteRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
