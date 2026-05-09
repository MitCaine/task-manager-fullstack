package com.example.taskmanager;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/tags")
public class TagController {

    private final TagRepository tagRepository;

    public TagController(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @GetMapping
    public List<Tag> getTags() {
        return tagRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Tag> createTag(@Valid @RequestBody Tag tag) {
        tag.setTagID(null);
        Tag saved = tagRepository.save(tag);
        return ResponseEntity
                .created(URI.create("/tags/" + saved.getTagID()))
                .body(saved);
    }

    private record TagUpdateRequest(
            @Size(max = 25, message = "Title must not exceed 25 characters")
            String title,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be a 6-digit hex value")
            String color
    ) {}

    @PatchMapping("/{id}")
    public ResponseEntity<Tag> updateTag(@PathVariable Long id, @Valid @RequestBody TagUpdateRequest update) {
        return tagRepository.findById(id)
                .map(tag -> {
                    if (update.color() != null) tag.setColor(update.color());
                    if (update.title() != null && !update.title().isBlank()) tag.setTitle(update.title());
                    return ResponseEntity.ok(tagRepository.save(tag));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        if (!tagRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        tagRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
