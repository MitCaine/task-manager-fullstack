package com.example.taskmanager;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;

    public ProjectController(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @GetMapping
    public List<Project> getProjects() {
        return projectRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable Long id) {
        return projectRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@Valid @RequestBody Project project) {
        project.setProjectID(null);
        Project saved = projectRepository.save(project);
        return ResponseEntity
                .created(URI.create("/projects/" + saved.getProjectID()))
                .body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable Long id, @Valid @RequestBody Project updated) {
        return projectRepository.findById(id)
                .map(project -> {
                    project.setTitle(updated.getTitle());
                    project.setDescription(updated.getDescription());
                    project.setDueDate(updated.getDueDate());
                    project.setUserID(updated.getUserID());
                    return ResponseEntity.ok(projectRepository.save(project));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        if (!projectRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
