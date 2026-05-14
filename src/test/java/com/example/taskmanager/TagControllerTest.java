package com.example.taskmanager;

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

@WebMvcTest(TagController.class)
class TagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TagRepository tagRepository;

    // Test fixture builder.

    private Tag makeTag(Long id, String title, String color) {
        Tag t = new Tag();
        t.setTagID(id);
        t.setTitle(title);
        t.setColor(color);
        return t;
    }

    // GET /tags

    @Test
    void getTags_returnsList() throws Exception {
        when(tagRepository.findAll())
                .thenReturn(List.of(makeTag(1L, "Urgent", "#f87171"),
                                    makeTag(2L, "Personal", "#4ade80")));

        mockMvc.perform(get("/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Urgent"))
                .andExpect(jsonPath("$[1].color").value("#4ade80"));
    }

    @Test
    void getTags_emptyList_returnsEmptyArray() throws Exception {
        when(tagRepository.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // POST /tags

    @Test
    void createTag_valid_returns201WithLocation() throws Exception {
        Tag saved = makeTag(5L, "Work", "#6366f1");
        when(tagRepository.save(any(Tag.class))).thenReturn(saved);

        mockMvc.perform(post("/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Work\",\"color\":\"#6366f1\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/tags/5"))
                .andExpect(jsonPath("$.tagID").value(5))
                .andExpect(jsonPath("$.title").value("Work"));
    }

    @Test
    void createTag_blankTitle_returns400() throws Exception {
        mockMvc.perform(post("/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"color\":\"#6366f1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void createTag_titleTooLong_returns400() throws Exception {
        String longTitle = "A".repeat(26);

        mockMvc.perform(post("/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + longTitle + "\",\"color\":\"#6366f1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").exists());
    }

    @Test
    void createTag_invalidColor_returns400() throws Exception {
        mockMvc.perform(post("/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Work\",\"color\":\"blue\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.color").exists());
    }

    @Test
    void createTag_idInBodyIsIgnored() throws Exception {
        Tag saved = makeTag(99L, "Work", "#6366f1");
        when(tagRepository.save(any(Tag.class))).thenAnswer(inv -> {
            Tag arg = inv.getArgument(0);
            assert arg.getTagID() == null : "tagID should be null before save";
            return saved;
        });

        mockMvc.perform(post("/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tagID\":999,\"title\":\"Work\",\"color\":\"#6366f1\"}"))
                .andExpect(status().isCreated());
    }

    // PATCH /tags/{id}

    @Test
    void updateTag_found_updatesColorAndTitle() throws Exception {
        Tag existing = makeTag(1L, "Old", "#000000");
        Tag updated = makeTag(1L, "New", "#ffffff");
        when(tagRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(tagRepository.save(any(Tag.class))).thenReturn(updated);

        mockMvc.perform(patch("/tags/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New\",\"color\":\"#ffffff\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New"))
                .andExpect(jsonPath("$.color").value("#ffffff"));
    }

    @Test
    void updateTag_onlyColor_leavesOtherFieldsUnchanged() throws Exception {
        Tag existing = makeTag(1L, "Urgent", "#000000");
        Tag updated = makeTag(1L, "Urgent", "#f87171");
        when(tagRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(tagRepository.save(any(Tag.class))).thenReturn(updated);

        mockMvc.perform(patch("/tags/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"#f87171\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Urgent"))
                .andExpect(jsonPath("$.color").value("#f87171"));
    }

    @Test
    void updateTag_notFound_returns404() throws Exception {
        when(tagRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/tags/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"#ff0000\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateTag_invalidColor_returns400() throws Exception {
        mockMvc.perform(patch("/tags/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"not-a-color\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.color").exists());

        verify(tagRepository, never()).save(any());
    }

    // DELETE /tags/{id}

    @Test
    void deleteTag_found_returns204() throws Exception {
        when(tagRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/tags/1"))
                .andExpect(status().isNoContent());

        verify(tagRepository).deleteById(1L);
    }

    @Test
    void deleteTag_notFound_returns404() throws Exception {
        when(tagRepository.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/tags/99"))
                .andExpect(status().isNotFound());

        verify(tagRepository, never()).deleteById(any());
    }
}
