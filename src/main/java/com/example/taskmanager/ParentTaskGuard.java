package com.example.taskmanager;

import org.springframework.http.ResponseEntity;

import java.util.function.Supplier;

final class ParentTaskGuard {

    private ParentTaskGuard() {
    }

    static <T> ResponseEntity<T> withExistingTask(
            TaskRepository taskRepository,
            Long taskId,
            Supplier<ResponseEntity<T>> response) {
        if (!taskRepository.existsById(taskId)) return ResponseEntity.notFound().build();
        return response.get();
    }
}
