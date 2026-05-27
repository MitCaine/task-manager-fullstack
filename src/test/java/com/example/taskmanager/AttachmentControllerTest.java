package com.example.taskmanager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AttachmentController.class)
class AttachmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AttachmentRepository attachmentRepository;

    @MockBean
    private TaskRepository taskRepository;

    // Test fixture builder.

    private Attachment makeAttachment(Long id, String url, Long taskID) {
        Attachment a = new Attachment();
        a.setAttachmentID(id);
        a.setFileORLink(url);
        a.setMetadata("label");
        a.setFileSize(0);
        a.setTaskID(taskID);
        return a;
    }

    // GET /tasks/{taskId}/attachments

    @Test
    void getAttachments_taskExists_returnsList() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(attachmentRepository.findByTaskID(1L))
                .thenReturn(List.of(makeAttachment(1L, "https://example.com/a", 1L),
                                    makeAttachment(2L, "https://example.com/b", 1L)));

        mockMvc.perform(get("/tasks/1/attachments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].fileORLink").value("https://example.com/a"));
    }

    @Test
    void getAttachments_emptyList_returnsEmptyArray() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(attachmentRepository.findByTaskID(1L)).thenReturn(List.of());

        mockMvc.perform(get("/tasks/1/attachments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getAttachments_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(get("/tasks/99/attachments"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAttachments_taskNotFound_doesNotQueryAttachments() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(get("/tasks/99/attachments"))
                .andExpect(status().isNotFound());

        verify(attachmentRepository, never()).findByTaskID(any());
    }

    // POST /tasks/{taskId}/attachments

    @Test
    void createAttachment_valid_returns201WithLocation() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Attachment saved = makeAttachment(8L, "https://example.com", 1L);
        when(attachmentRepository.save(any(Attachment.class))).thenReturn(saved);

        mockMvc.perform(post("/tasks/1/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileORLink\":\"https://example.com\",\"metadata\":\"Docs\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/tasks/1/attachments/8"))
                .andExpect(jsonPath("$.taskID").value(1));
    }

    @Test
    void createAttachment_taskNotFound_returns404() throws Exception {
        when(taskRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(post("/tasks/99/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileORLink\":\"https://example.com\"}"))
                .andExpect(status().isNotFound());

        verify(attachmentRepository, never()).save(any());
    }

    @Test
    void createAttachment_blankFileORLink_returns400() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(post("/tasks/1/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileORLink\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createAttachment_missingFileORLink_returns400() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(post("/tasks/1/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"metadata\":\"Docs\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createAttachment_valid_setsTaskIdFromPathNotBody() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(inv -> {
            Attachment arg = inv.getArgument(0);
            assertEquals(1L, arg.getTaskID(), "taskID must come from the path");
            Attachment saved = makeAttachment(8L, arg.getFileORLink(), arg.getTaskID());
            saved.setMetadata(arg.getMetadata());
            return saved;
        });

        mockMvc.perform(post("/tasks/1/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileORLink\":\"https://example.com\",\"metadata\":\"Docs\",\"taskID\":99}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskID").value(1));
    }

    @Test
    void createAttachment_setsFileSizeToZero() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Attachment saved = makeAttachment(1L, "https://example.com", 1L);
        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(inv -> {
            Attachment arg = inv.getArgument(0);
            assertEquals(0, arg.getFileSize(), "fileSize must be set to 0 by controller");
            return saved;
        });

        mockMvc.perform(post("/tasks/1/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileORLink\":\"https://example.com\",\"fileSize\":9999}"))
                .andExpect(status().isCreated());
    }

    @Test
    void createAttachment_idInBodyIsIgnored() throws Exception {
        when(taskRepository.existsById(1L)).thenReturn(true);
        Attachment saved = makeAttachment(20L, "https://example.com", 1L);
        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(inv -> {
            Attachment arg = inv.getArgument(0);
            assertNull(arg.getAttachmentID(), "attachmentID should be null before save");
            return saved;
        });

        mockMvc.perform(post("/tasks/1/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"attachmentID\":999,\"fileORLink\":\"https://example.com\"}"))
                .andExpect(status().isCreated());
    }

    // DELETE /attachments/{id}

    @Test
    void deleteAttachment_found_returns204() throws Exception {
        when(attachmentRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/attachments/1"))
                .andExpect(status().isNoContent());

        verify(attachmentRepository).deleteById(1L);
    }

    @Test
    void deleteAttachment_notFound_returns404() throws Exception {
        when(attachmentRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/attachments/99"))
                .andExpect(status().isNotFound());

        verify(attachmentRepository, never()).deleteById(any());
    }
}
