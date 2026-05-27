package com.example.taskmanager;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SubtaskController.class)
class SubtaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SubtaskRepository subtaskRepository;

    @MockBean
    private TaskRepository taskRepository;

    // Test fixture builder.

    private Subtask makeSubtask(Long id, String title, Long parentTaskID) {
        Subtask s = new Subtask();
        s.setSubTaskID(id);
        s.setTitle(title);
        s.setStatusID(1L);
        s.setParentTaskID(parentTaskID);
        return s;
    }

    // GET /tasks/{taskId}/subtasks

    @Test
    void getSubtasks_taskExists_returnsList() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(subtaskRepository.findByParentTaskID(1L))
                .thenReturn(List.of(makeSubtask(1L, "Step one", 1L),
                                    makeSubtask(2L, "Step two", 1L)));

        mockMvc.perform(get("/tasks/1/subtasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Step one"));
    }

    @Test
    void getSubtasks_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(get("/tasks/99/subtasks"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getSubtasks_taskNotFound_doesNotQuerySubtasks() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(get("/tasks/99/subtasks"))
                .andExpect(status().isNotFound());

        verify(subtaskRepository, never()).findByParentTaskID(any());
    }

    // POST /tasks/{taskId}/subtasks

    @Test
    void createSubtask_valid_returns201WithLocation() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Subtask saved = makeSubtask(10L, "New step", 1L);
        when(subtaskRepository.save(any(Subtask.class))).thenReturn(saved);

        mockMvc.perform(post("/tasks/1/subtasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New step\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/tasks/1/subtasks/10"))
                .andExpect(jsonPath("$.title").value("New step"))
                .andExpect(jsonPath("$.parentTaskID").value(1));
    }

    @Test
    void createSubtask_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(post("/tasks/99/subtasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New step\"}"))
                .andExpect(status().isNotFound());

        verify(subtaskRepository, never()).save(any());
    }

    @Test
    void createSubtask_blankTitle_returns400() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(post("/tasks/1/subtasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSubtask_idInBodyIsIgnored() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Subtask saved = makeSubtask(42L, "Step", 1L);
        when(subtaskRepository.save(any(Subtask.class))).thenAnswer(inv -> {
            Subtask arg = inv.getArgument(0);
            assert arg.getSubTaskID() == null : "subTaskID should be null before save";
            return saved;
        });

        mockMvc.perform(post("/tasks/1/subtasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subTaskID\":999,\"title\":\"Step\"}"))
                .andExpect(status().isCreated());
    }

    // PATCH /subtasks/{id}/status

    @Test
    void patchSubtaskStatus_found_updatesStatus() throws Exception {
        Subtask existing = makeSubtask(1L, "Step", 1L);
        Subtask updated = makeSubtask(1L, "Step", 1L);
        updated.setStatusID(2L);
        when(subtaskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(subtaskRepository.save(any(Subtask.class))).thenReturn(updated);

        mockMvc.perform(patch("/subtasks/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statusID\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusID").value(2));
    }

    @Test
    void patchSubtaskStatus_notFound_returns404() throws Exception {
        when(subtaskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/subtasks/99/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"statusID\":2}"))
                .andExpect(status().isNotFound());
    }

    // PUT /subtasks/{id}

    @Test
    void updateSubtask_found_returnsUpdatedSubtask() throws Exception {
        Subtask existing = makeSubtask(1L, "Old title", 1L);
        Subtask updated = makeSubtask(1L, "New title", 1L);
        when(subtaskRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(subtaskRepository.save(any(Subtask.class))).thenReturn(updated);

        mockMvc.perform(put("/subtasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New title\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New title"));
    }

    @Test
    void updateSubtask_notFound_returns404() throws Exception {
        when(subtaskRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/subtasks/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New title\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateSubtask_blankTitle_returns400() throws Exception {
        mockMvc.perform(put("/subtasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    // DELETE /subtasks/{id}

    @Test
    void deleteSubtask_found_returns204() throws Exception {
        when(subtaskRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/subtasks/1"))
                .andExpect(status().isNoContent());

        verify(subtaskRepository).deleteById(1L);
    }

    @Test
    void deleteSubtask_notFound_returns404() throws Exception {
        when(subtaskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/subtasks/99"))
                .andExpect(status().isNotFound());

        verify(subtaskRepository, never()).deleteById(any());
    }
}
