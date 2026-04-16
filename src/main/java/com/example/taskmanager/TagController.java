package com.example.taskmanager;

import jakarta.validation.Valid;
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

    @PatchMapping("/{id}")
    public ResponseEntity<Tag> updateTag(@PathVariable Long id, @RequestBody Tag update) {
        return tagRepository.findById(id)
                .map(tag -> {
                    if (update.getColor() != null) tag.setColor(update.getColor());
                    if (update.getTitle() != null && !update.getTitle().isBlank()) tag.setTitle(update.getTitle());
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
