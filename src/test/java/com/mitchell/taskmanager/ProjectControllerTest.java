package com.mitchell.taskmanager;

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

@WebMvcTest(ProjectController.class)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectRepository projectRepository;

    // Test fixture builder.

    private Project makeProject(Long id, String title) {
        Project p = new Project();
        p.setProjectID(id);
        p.setTitle(title);
        p.setDescription("A project");
        return p;
    }

    // GET /projects

    @Test
    void getProjects_returnsList() throws Exception {
        when(projectRepository.findAll())
                .thenReturn(List.of(makeProject(1L, "Alpha"), makeProject(2L, "Beta")));

        mockMvc.perform(get("/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Alpha"))
                .andExpect(jsonPath("$[1].title").value("Beta"));
    }

    @Test
    void getProjects_emptyList_returnsEmptyArray() throws Exception {
        when(projectRepository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // GET /projects/{id}

    @Test
    void getProject_found_returns200() throws Exception {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(makeProject(1L, "Alpha")));

        mockMvc.perform(get("/projects/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectID").value(1))
                .andExpect(jsonPath("$.title").value("Alpha"));
    }

    @Test
    void getProject_notFound_returns404() throws Exception {
        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/projects/99"))
                .andExpect(status().isNotFound());
    }

    // POST /projects

    @Test
    void createProject_valid_returns201WithLocation() throws Exception {
        Project saved = makeProject(10L, "New project");
        when(projectRepository.save(any(Project.class))).thenReturn(saved);

        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New project\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/projects/10"))
                .andExpect(jsonPath("$.projectID").value(10))
                .andExpect(jsonPath("$.title").value("New project"));
    }

    @Test
    void createProject_blankTitle_returns400() throws Exception {
        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void createProject_titleExceeds25Chars_returns400() throws Exception {
        String longTitle = "A".repeat(26);
        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + longTitle + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void createProject_idInBodyIsIgnored() throws Exception {
        Project saved = makeProject(42L, "Test");
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
            Project arg = inv.getArgument(0);
            assert arg.getProjectID() == null : "projectID should be null before save";
            return saved;
        });

        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"projectID\":999,\"title\":\"Test\"}"))
                .andExpect(status().isCreated());
    }

    // PUT /projects/{id}

    @Test
    void updateProject_found_returns200() throws Exception {
        Project existing = makeProject(1L, "Old name");
        Project updated = makeProject(1L, "New name");
        when(projectRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenReturn(updated);

        mockMvc.perform(put("/projects/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New name\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New name"));
    }

    @Test
    void updateProject_notFound_returns404() throws Exception {
        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/projects/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New name\"}"))
                .andExpect(status().isNotFound());
    }

    // DELETE /projects/{id}

    @Test
    void deleteProject_found_returns204() throws Exception {
        when(projectRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/projects/1"))
                .andExpect(status().isNoContent());

        verify(projectRepository).deleteById(1L);
    }

    @Test
    void deleteProject_notFound_returns404() throws Exception {
        when(projectRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/projects/99"))
                .andExpect(status().isNotFound());

        verify(projectRepository, never()).deleteById(any());
    }
}
