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

@WebMvcTest(NoteController.class)
class NoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NoteRepository noteRepository;

    @MockBean
    private TaskRepository taskRepository;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Note makeNote(Long id, String title, String context, Long taskID) {
        Note n = new Note();
        n.setNoteID(id);
        n.setTitle(title);
        n.setContext(context);
        n.setTimestamp(LocalDateTime.of(2026, 1, 1, 12, 0));
        n.setTaskID(taskID);
        return n;
    }

    // -------------------------------------------------------------------------
    // GET /tasks/{taskId}/notes
    // -------------------------------------------------------------------------

    @Test
    void getNotes_taskExists_returnsList() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(noteRepository.findByTaskID(1L))
                .thenReturn(List.of(makeNote(1L, "Title", "Content A", 1L),
                                    makeNote(2L, "Title", "Content B", 1L)));

        mockMvc.perform(get("/tasks/1/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].context").value("Content A"));
    }

    @Test
    void getNotes_emptyList_returnsEmptyArray() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(noteRepository.findByTaskID(1L)).thenReturn(List.of());

        mockMvc.perform(get("/tasks/1/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getNotes_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(get("/tasks/99/notes"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // POST /tasks/{taskId}/notes
    // -------------------------------------------------------------------------

    @Test
    void createNote_valid_returns201WithLocation() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Note saved = makeNote(5L, "My note", "Some content", 1L);
        when(noteRepository.save(any(Note.class))).thenReturn(saved);

        mockMvc.perform(post("/tasks/1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"My note\",\"context\":\"Some content\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/tasks/1/notes/5"))
                .andExpect(jsonPath("$.context").value("Some content"))
                .andExpect(jsonPath("$.taskID").value(1));
    }

    @Test
    void createNote_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(post("/tasks/99/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"My note\",\"context\":\"content\"}"))
                .andExpect(status().isNotFound());

        verify(noteRepository, never()).save(any());
    }

    @Test
    void createNote_setsTimestampOnSave() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Note saved = makeNote(1L, "T", "c", 1L);
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> {
            Note arg = inv.getArgument(0);
            assert arg.getTimestamp() != null : "timestamp must be set by controller before save";
            return saved;
        });

        mockMvc.perform(post("/tasks/1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"T\",\"context\":\"c\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void createNote_idInBodyIsIgnored() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Note saved = makeNote(99L, "T", "c", 1L);
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> {
            Note arg = inv.getArgument(0);
            assert arg.getNoteID() == null : "noteID should be null before save";
            return saved;
        });

        mockMvc.perform(post("/tasks/1/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"noteID\":999,\"title\":\"T\",\"context\":\"c\"}"))
                .andExpect(status().isCreated());
    }

    // -------------------------------------------------------------------------
    // DELETE /notes/{id}
    // -------------------------------------------------------------------------

    @Test
    void deleteNote_found_returns204() throws Exception {
        when(noteRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/notes/1"))
                .andExpect(status().isNoContent());

        verify(noteRepository).deleteById(1L);
    }

    @Test
    void deleteNote_notFound_returns404() throws Exception {
        when(noteRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/notes/99"))
                .andExpect(status().isNotFound());

        verify(noteRepository, never()).deleteById(any());
    }
}
