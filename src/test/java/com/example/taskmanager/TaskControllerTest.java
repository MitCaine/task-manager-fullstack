package com.example.taskmanager;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TaskRepository taskRepository;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Task makeTask(Long id, String title, Long userID, LocalDateTime scheduled) {
        Task t = new Task();
        t.setTaskID(id);
        t.setTitle(title);
        t.setDescription("desc");
        t.setUserID(userID);
        t.setDateTimeScheduled(scheduled);
        return t;
    }

    // -------------------------------------------------------------------------
    // GET /tasks
    // -------------------------------------------------------------------------

    @Test
    void getAllTasks_returnsList() throws Exception {
        Task t1 = makeTask(1L, "Buy milk", 1L, LocalDateTime.of(2026, 4, 1, 9, 0));
        Task t2 = makeTask(2L, "Walk dog", 1L, LocalDateTime.of(2026, 4, 2, 10, 0));
        when(taskRepository.findAllByOrderByDateTimeScheduledAsc()).thenReturn(List.of(t1, t2));

        mockMvc.perform(get("/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Buy milk"))
                .andExpect(jsonPath("$[1].title").value("Walk dog"));
    }

    @Test
    void getAllTasks_emptyList_returnsEmptyArray() throws Exception {
        when(taskRepository.findAllByOrderByDateTimeScheduledAsc()).thenReturn(List.of());

        mockMvc.perform(get("/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getAllTasks_filterByUserID_returnsMatchingTasks() throws Exception {
        Task t = makeTask(1L, "User task", 5L, null);
        when(taskRepository.findByUserIDOrderByDateTimeScheduledAsc(5L)).thenReturn(List.of(t));

        mockMvc.perform(get("/tasks").param("userID", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].userID").value(5));
    }

    @Test
    void getAllTasks_filterByUserID_noMatches_returnsEmptyArray() throws Exception {
        when(taskRepository.findByUserIDOrderByDateTimeScheduledAsc(999L)).thenReturn(List.of());

        mockMvc.perform(get("/tasks").param("userID", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // -------------------------------------------------------------------------
    // GET /tasks/{id}
    // -------------------------------------------------------------------------

    @Test
    void getTaskById_found_returnsTask() throws Exception {
        Task t = makeTask(1L, "Read book", 1L, null);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(t));

        mockMvc.perform(get("/tasks/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskID").value(1))
                .andExpect(jsonPath("$.title").value("Read book"));
    }

    @Test
    void getTaskById_notFound_returns404() throws Exception {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/tasks/99"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // POST /tasks
    // -------------------------------------------------------------------------

    @Test
    void createTask_validPayload_returns201WithLocation() throws Exception {
        Task saved = makeTask(10L, "New task", 1L, null);
        when(taskRepository.save(any(Task.class))).thenReturn(saved);

        String body = """
                {"title":"New task","description":"","userID":1}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/tasks/10"))
                .andExpect(jsonPath("$.taskID").value(10))
                .andExpect(jsonPath("$.title").value("New task"));
    }

    @Test
    void createTask_taskIdInBodyIsIgnored() throws Exception {
        // taskID sent in request body must be nulled out before save
        Task saved = makeTask(42L, "Task with forced ID", null, null);
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task arg = invocation.getArgument(0);
            // Controller must call setTaskID(null) before save
            assert arg.getTaskID() == null : "taskID should be null before save";
            return saved;
        });

        String body = """
                {"taskID":999,"title":"Task with forced ID"}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void createTask_blankTitle_returns400WithValidationError() throws Exception {
        String body = """
                {"title":"   ","description":"some desc"}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void createTask_nullTitle_returns400WithValidationError() throws Exception {
        String body = """
                {"description":"some desc"}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void createTask_descriptionExceeds1000Chars_returns400() throws Exception {
        String longDesc = "x".repeat(1001);
        String body = "{\"title\":\"Valid\",\"description\":\"" + longDesc + "\"}";

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.description").exists());
    }

    @Test
    void createTask_descriptionExactly1000Chars_isAccepted() throws Exception {
        String maxDesc = "x".repeat(1000);
        Task saved = makeTask(1L, "Valid", null, null);
        when(taskRepository.save(any(Task.class))).thenReturn(saved);

        String body = "{\"title\":\"Valid\",\"description\":\"" + maxDesc + "\"}";

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void createTask_withScheduledDateTime_persistsDateTime() throws Exception {
        Task saved = makeTask(1L, "Scheduled", null, LocalDateTime.of(2026, 6, 15, 14, 30));
        when(taskRepository.save(any(Task.class))).thenReturn(saved);

        String body = """
                {"title":"Scheduled","dateTimeScheduled":"2026-06-15T14:30:00"}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dateTimeScheduled").exists());
    }

    // -------------------------------------------------------------------------
    // PUT /tasks/{id}
    // -------------------------------------------------------------------------

    @Test
    void updateTask_found_returnsUpdatedTask() throws Exception {
        Task existing = makeTask(1L, "Old title", 1L, null);
        Task updated = makeTask(1L, "New title", 1L, null);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenReturn(updated);

        String body = """
                {"title":"New title","description":"","userID":1}
                """;

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"));
    }

    @Test
    void updateTask_notFound_returns404() throws Exception {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        String body = """
                {"title":"New title"}
                """;

        mockMvc.perform(put("/tasks/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateTask_blankTitle_returns400() throws Exception {
        String body = """
                {"title":""}
                """;

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    // -------------------------------------------------------------------------
    // DELETE /tasks/{id}
    // -------------------------------------------------------------------------

    @Test
    void deleteTask_found_returns204() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/tasks/1"))
                .andExpect(status().isNoContent());

        verify(taskRepository).deleteById(1L);
    }

    @Test
    void deleteTask_notFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/tasks/99"))
                .andExpect(status().isNotFound());

        verify(taskRepository, never()).deleteById(any());
    }
}
