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
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReminderController.class)
class ReminderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReminderRepository reminderRepository;

    @MockBean
    private TaskRepository taskRepository;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Reminder makeReminder(Long id, Long taskID, LocalDateTime dueDate) {
        Reminder r = new Reminder();
        r.setReminderID(id);
        r.setTaskID(taskID);
        r.setDueDate(dueDate);
        r.setMessage("Reminder message");
        return r;
    }

    // -------------------------------------------------------------------------
    // GET /tasks/{taskId}/reminders
    // -------------------------------------------------------------------------

    @Test
    void getReminders_taskExists_returnsList() throws Exception {
        LocalDateTime due = LocalDateTime.of(2026, 6, 1, 9, 0);
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(reminderRepository.findByTaskID(1L))
                .thenReturn(List.of(makeReminder(1L, 1L, due),
                                    makeReminder(2L, 1L, due.plusDays(1))));

        mockMvc.perform(get("/tasks/1/reminders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void getReminders_emptyList_returnsEmptyArray() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(reminderRepository.findByTaskID(1L)).thenReturn(List.of());

        mockMvc.perform(get("/tasks/1/reminders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getReminders_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(get("/tasks/99/reminders"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // POST /tasks/{taskId}/reminders
    // -------------------------------------------------------------------------

    @Test
    void createReminder_valid_returns201WithLocation() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Reminder saved = makeReminder(7L, 1L, LocalDateTime.of(2026, 6, 1, 9, 0));
        when(reminderRepository.save(any(Reminder.class))).thenReturn(saved);

        mockMvc.perform(post("/tasks/1/reminders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dueDate\":\"2026-06-01T09:00:00\",\"message\":\"Don't forget\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/tasks/1/reminders/7"))
                .andExpect(jsonPath("$.taskID").value(1));
    }

    @Test
    void createReminder_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(post("/tasks/99/reminders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dueDate\":\"2026-06-01T09:00:00\"}"))
                .andExpect(status().isNotFound());

        verify(reminderRepository, never()).save(any());
    }

    @Test
    void createReminder_idInBodyIsIgnored() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Reminder saved = makeReminder(10L, 1L, LocalDateTime.of(2026, 6, 1, 9, 0));
        when(reminderRepository.save(any(Reminder.class))).thenAnswer(inv -> {
            Reminder arg = inv.getArgument(0);
            assert arg.getReminderID() == null : "reminderID should be null before save";
            return saved;
        });

        mockMvc.perform(post("/tasks/1/reminders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reminderID\":999,\"dueDate\":\"2026-06-01T09:00:00\"}"))
                .andExpect(status().isCreated());
    }

    // -------------------------------------------------------------------------
    // PATCH /reminders/{id}
    // -------------------------------------------------------------------------

    @Test
    void patchReminder_found_updatesDueDate() throws Exception {
        Reminder existing = makeReminder(1L, 1L, LocalDateTime.of(2026, 1, 1, 9, 0));
        Reminder updated = makeReminder(1L, 1L, LocalDateTime.of(2026, 7, 1, 9, 0));
        when(reminderRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reminderRepository.save(any(Reminder.class))).thenReturn(updated);

        mockMvc.perform(patch("/reminders/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dueDate\":\"2026-07-01T09:00:00\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reminderID").value(1));
    }

    @Test
    void patchReminder_notFound_returns404() throws Exception {
        when(reminderRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/reminders/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dueDate\":\"2026-07-01T09:00:00\"}"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // DELETE /reminders/{id}
    // -------------------------------------------------------------------------

    @Test
    void deleteReminder_found_returns204() throws Exception {
        when(reminderRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/reminders/1"))
                .andExpect(status().isNoContent());

        verify(reminderRepository).deleteById(1L);
    }

    @Test
    void deleteReminder_notFound_returns404() throws Exception {
        when(reminderRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/reminders/99"))
                .andExpect(status().isNotFound());

        verify(reminderRepository, never()).deleteById(any());
    }
}
