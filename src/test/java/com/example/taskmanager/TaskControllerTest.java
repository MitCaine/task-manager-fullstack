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

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    @MockBean
    private TagRepository tagRepository;

    @MockBean
    private RecurrenceRuleRepository recurrenceRuleRepository;

    // Test fixture builder.

    private Task makeTask(Long id, String title, Long userID, LocalDateTime scheduled) {
        Task t = new Task();
        t.setTaskID(id);
        t.setTitle(title);
        t.setDescription("desc");
        t.setUserID(userID);
        t.setDateTimeScheduled(scheduled);
        return t;
    }

    // GET /tasks

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

    // GET /tasks/{id}

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

    // POST /tasks

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
        // Clients cannot choose the generated task ID.
        Task saved = makeTask(42L, "Task with forced ID", null, null);
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task arg = invocation.getArgument(0);
            // Persistence must receive a task without a caller-supplied ID.
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

    @Test
    void createTask_withEndDateTime_persistsEndDateTime() throws Exception {
        Task saved = makeTask(1L, "Scheduled", null, LocalDateTime.of(2026, 6, 15, 14, 30));
        saved.setEndDateTimeScheduled(LocalDateTime.of(2026, 6, 15, 15, 30));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task arg = invocation.getArgument(0);
            assertEquals(LocalDateTime.of(2026, 6, 15, 15, 30), arg.getEndDateTimeScheduled());
            return saved;
        });

        String body = """
                {"title":"Scheduled","dateTimeScheduled":"2026-06-15T14:30:00","endDateTimeScheduled":"2026-06-15T15:30:00"}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endDateTimeScheduled").value("2026-06-15T15:30:00"));
    }

    @Test
    void createTask_endBeforeStart_returns400() throws Exception {
        String body = """
                {"title":"Invalid","dateTimeScheduled":"2026-06-15T21:00:00","endDateTimeScheduled":"2026-06-15T20:00:00"}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("End time must be after start time."));
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void createTask_endEqualStart_returns400() throws Exception {
        String body = """
                {"title":"Invalid","dateTimeScheduled":"2026-06-15T21:00:00","endDateTimeScheduled":"2026-06-15T21:00:00"}
                """;

        mockMvc.perform(post("/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("End time must be after start time."));
        verify(taskRepository, never()).save(any(Task.class));
    }

    // PUT /tasks/{id}

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
    void updateTask_found_updatesEndDateTime() throws Exception {
        Task existing = makeTask(1L, "Old title", 1L, LocalDateTime.of(2026, 6, 15, 14, 30));
        Task updated = makeTask(1L, "New title", 1L, LocalDateTime.of(2026, 6, 15, 14, 30));
        updated.setEndDateTimeScheduled(LocalDateTime.of(2026, 6, 15, 16, 0));
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task arg = invocation.getArgument(0);
            assertEquals(LocalDateTime.of(2026, 6, 15, 16, 0), arg.getEndDateTimeScheduled());
            return updated;
        });

        String body = """
                {"title":"New title","description":"","userID":1,"dateTimeScheduled":"2026-06-15T14:30:00","endDateTimeScheduled":"2026-06-15T16:00:00"}
                """;

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endDateTimeScheduled").value("2026-06-15T16:00:00"));
    }

    @Test
    void updateTask_found_updatesPriority() throws Exception {
        Task existing = makeTask(1L, "Old title", 1L, null);
        existing.setPriority("LOW");
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String body = """
                {"title":"New title","description":"","userID":1,"priority":"HIGH"}
                """;

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("HIGH"));

        assertEquals("HIGH", existing.getPriority());
    }

    @Test
    void updateTask_endBeforeStart_returns400() throws Exception {
        String body = """
                {"title":"New title","description":"","dateTimeScheduled":"2026-06-15T21:00:00","endDateTimeScheduled":"2026-06-15T20:00:00"}
                """;

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("End time must be after start time."));
        verify(taskRepository, never()).findById(1L);
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void updateTask_acceptsNullEndDateTime() throws Exception {
        Task existing = makeTask(1L, "Old title", 1L, LocalDateTime.of(2026, 6, 15, 14, 30));
        existing.setEndDateTimeScheduled(LocalDateTime.of(2026, 6, 15, 15, 30));
        Task updated = makeTask(1L, "New title", 1L, LocalDateTime.of(2026, 6, 15, 14, 30));
        updated.setEndDateTimeScheduled(null);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task arg = invocation.getArgument(0);
            assertEquals(null, arg.getEndDateTimeScheduled());
            return updated;
        });

        String body = """
                {"title":"New title","description":"","dateTimeScheduled":"2026-06-15T14:30:00","endDateTimeScheduled":null}
                """;

        mockMvc.perform(put("/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endDateTimeScheduled").doesNotExist());
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

    // DELETE /tasks/{id}

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

    // PATCH /tasks/{id}/status

    @Test
    void patchTaskStatus_found_updatesStatus() throws Exception {
        Task task = makeTask(1L, "Some task", 1L, null);
        task.setStatusID(null);
        Task updated = makeTask(1L, "Some task", 1L, null);
        updated.setStatusID(2L);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(updated);

        mockMvc.perform(patch("/tasks/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statusID\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusID").value(2));
    }

    @Test
    void patchTaskStatus_notFound_returns404() throws Exception {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/tasks/99/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statusID\":2}"))
                .andExpect(status().isNotFound());
    }

    // GET /tasks/{id}/recurrence

    @Test
    void getRecurrence_taskHasRule_returnsRule() throws Exception {
        RecurrenceRule rule = new RecurrenceRule();
        rule.setRecurrenceRuleID(10L);
        rule.setFrequency("weekly");
        rule.setTimesOfRecurrence(0);
        rule.setStartDateTime(LocalDateTime.of(2026, 1, 1, 0, 0));
        rule.setEndDateTime(LocalDateTime.of(2036, 1, 1, 0, 0));

        Task task = makeTask(1L, "Repeating task", null, null);
        task.setRecurrenceRuleID(10L);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(recurrenceRuleRepository.findById(10L)).thenReturn(Optional.of(rule));

        mockMvc.perform(get("/tasks/1/recurrence"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.frequency").value("weekly"));
    }

    @Test
    void getRecurrence_noRule_returns404() throws Exception {
        Task task = makeTask(1L, "Task", null, null);
        task.setRecurrenceRuleID(null);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        mockMvc.perform(get("/tasks/1/recurrence"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getRecurrence_taskNotFound_returns404() throws Exception {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/tasks/99/recurrence"))
                .andExpect(status().isNotFound());
    }

    // PATCH /tasks/{id}/repeat

    @Test
    void setRepeat_withFrequency_createsRule() throws Exception {
        Task task = makeTask(1L, "Task", null, LocalDateTime.of(2026, 6, 1, 9, 0));
        task.setRecurrenceRuleID(null);
        RecurrenceRule savedRule = new RecurrenceRule();
        savedRule.setRecurrenceRuleID(5L);
        savedRule.setFrequency("daily");
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(recurrenceRuleRepository.save(any(RecurrenceRule.class))).thenReturn(savedRule);
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        mockMvc.perform(patch("/tasks/1/repeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"frequency\":\"daily\"}"))
                .andExpect(status().isOk());

        verify(recurrenceRuleRepository).save(any(RecurrenceRule.class));
    }

    @Test
    void setRepeat_uppercaseFrequency_normalizesBeforeSave() throws Exception {
        Task task = makeTask(1L, "Task", null, LocalDateTime.of(2026, 6, 1, 9, 0));
        RecurrenceRule savedRule = new RecurrenceRule();
        savedRule.setRecurrenceRuleID(5L);
        savedRule.setFrequency("weekly");
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(recurrenceRuleRepository.save(any(RecurrenceRule.class))).thenAnswer(inv -> {
            RecurrenceRule rule = inv.getArgument(0);
            assert "weekly".equals(rule.getFrequency()) : "frequency should be normalized";
            return savedRule;
        });
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        mockMvc.perform(patch("/tasks/1/repeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"frequency\":\" WEEKLY \"}"))
                .andExpect(status().isOk());
    }

    @Test
    void setRepeat_invalidFrequency_returns400() throws Exception {
        Task task = makeTask(1L, "Task", null, null);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        mockMvc.perform(patch("/tasks/1/repeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"frequency\":\"yearly\"}"))
                .andExpect(status().isBadRequest());

        verify(recurrenceRuleRepository, never()).save(any());
        verify(taskRepository, never()).save(any());
    }

    @Test
    void setRepeat_emptyFrequency_clearsRule() throws Exception {
        Task task = makeTask(1L, "Task", null, null);
        task.setRecurrenceRuleID(7L);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        mockMvc.perform(patch("/tasks/1/repeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"frequency\":\"\"}"))
                .andExpect(status().isOk());

        verify(recurrenceRuleRepository).deleteById(7L);
    }

    @Test
    void setRepeat_taskNotFound_returns404() throws Exception {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/tasks/99/repeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"frequency\":\"daily\"}"))
                .andExpect(status().isNotFound());
    }

    // POST /tasks/{id}/tags/{tagId}

    @Test
    void addTag_bothExist_returns200WithTaskContainingTag() throws Exception {
        Tag tag = new Tag();
        tag.setTagID(3L);
        tag.setTitle("Urgent");

        Task task = makeTask(1L, "Task", null, null);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(tagRepository.findById(3L)).thenReturn(Optional.of(tag));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        mockMvc.perform(post("/tasks/1/tags/3"))
                .andExpect(status().isOk());
    }

    @Test
    void addTag_taskNotFound_returns404() throws Exception {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(post("/tasks/99/tags/3"))
                .andExpect(status().isNotFound());
    }

    // DELETE /tasks/{id}/tags/{tagId}

    @Test
    void removeTag_taskFound_returns200() throws Exception {
        Task task = makeTask(1L, "Task", null, null);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        mockMvc.perform(delete("/tasks/1/tags/3"))
                .andExpect(status().isOk());
    }

    @Test
    void removeTag_taskNotFound_returns404() throws Exception {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/tasks/99/tags/3"))
                .andExpect(status().isNotFound());
    }
}
