package com.mitchell.taskmanager;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final TagRepository tagRepository;
    private final RecurrenceRuleRepository recurrenceRuleRepository;
    private static final Map<String, Integer> REPEAT_UNIT_MAX_VALUES = Map.of(
            "day", 7,
            "week", 4,
            "month", 12,
            "year", 5
    );
    private static final Map<String, String> LEGACY_FREQUENCY_UNITS = Map.of(
            "daily", "day",
            "weekly", "week",
            "monthly", "month"
    );

    public TaskController(TaskRepository taskRepository, TagRepository tagRepository,
                          RecurrenceRuleRepository recurrenceRuleRepository) {
        this.taskRepository = taskRepository;
        this.tagRepository = tagRepository;
        this.recurrenceRuleRepository = recurrenceRuleRepository;
    }

    @GetMapping
    public List<Task> getTasks(@RequestParam(required = false) Long userID) {
        if (userID != null) {
            return taskRepository.findByUserIDOrderByDateTimeScheduledAsc(userID);
        }
        return taskRepository.findAllByOrderByDateTimeScheduledAsc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTask(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@Valid @RequestBody Task newTask) {
        newTask.setTaskID(null);
        validateTimeRange(newTask);

        Task saved = taskRepository.save(newTask);
        return ResponseEntity
                .created(URI.create("/tasks/" + saved.getTaskID()))
                .body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, @Valid @RequestBody Task updatedTask) {
        validateTimeRange(updatedTask);
        return taskRepository.findById(id)
                .map(task -> {
                    task.setTitle(updatedTask.getTitle());
                    task.setDescription(updatedTask.getDescription());
                    task.setDateTimeScheduled(updatedTask.getDateTimeScheduled());
                    task.setEndDateTimeScheduled(updatedTask.getEndDateTimeScheduled());
                    task.setUserID(updatedTask.getUserID());
                    task.setStatusID(updatedTask.getStatusID());
                    task.setPriority(updatedTask.getPriority());
                    task.setProjectID(updatedTask.getProjectID());
                    Task saved = taskRepository.save(task);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private void validateTimeRange(Task task) {
        LocalDateTime start = task.getDateTimeScheduled();
        LocalDateTime end = task.getEndDateTimeScheduled();
        if (start != null && end != null && !end.isAfter(start)) {
            throw new ResponseStatusException(BAD_REQUEST, "End time must be after start time.");
        }
    }

    private record StatusUpdateRequest(Long statusID) {}

    @PatchMapping("/{id}/status")
    public ResponseEntity<Task> patchTaskStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequest req) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setStatusID(req.statusID());
                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        taskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Recurrence endpoints manage the rule referenced by a task.

    private record RepeatRequest(String frequency, String intervalUnit, Integer intervalValue) {}

    private record RepeatInterval(String intervalUnit, int intervalValue) {}

    @GetMapping("/{id}/recurrence")
    public ResponseEntity<RecurrenceRule> getRecurrence(@PathVariable Long id) {
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) return ResponseEntity.notFound().build();
        if (task.getRecurrenceRuleID() == null) return ResponseEntity.notFound().build();
        return recurrenceRuleRepository.findById(task.getRecurrenceRuleID())
                .map(r -> ResponseEntity.<RecurrenceRule>ok(r))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/repeat")
    public ResponseEntity<Task> setRepeat(@PathVariable Long id, @RequestBody RepeatRequest req) {
        return taskRepository.findById(id).map(task -> {
            RepeatInterval repeatInterval = normalizeRepeatInterval(req);
            if (repeatInterval == null) {
                // Detach the task before deleting its now-unused recurrence rule.
                Long ruleId = task.getRecurrenceRuleID();
                task.setRecurrenceRuleID(null);
                taskRepository.save(task);
                if (ruleId != null) recurrenceRuleRepository.deleteById(ruleId);
            } else {
                RecurrenceRule rule = task.getRecurrenceRuleID() == null
                        ? new RecurrenceRule()
                        : recurrenceRuleRepository.findById(task.getRecurrenceRuleID()).orElseGet(RecurrenceRule::new);
                rule.setIntervalUnit(repeatInterval.intervalUnit());
                rule.setIntervalValue(repeatInterval.intervalValue());
                rule.setFrequency(toLegacyFrequency(repeatInterval));
                rule.setTimesOfRecurrence(0);
                LocalDateTime start = task.getDateTimeScheduled() != null ? task.getDateTimeScheduled() : LocalDateTime.now();
                rule.setStartDateTime(start);
                rule.setEndDateTime(start.plusYears(10));
                RecurrenceRule saved = recurrenceRuleRepository.save(rule);
                task.setRecurrenceRuleID(saved.getRecurrenceRuleID());
                taskRepository.save(task);
            }
            return ResponseEntity.ok(task);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private RepeatInterval normalizeRepeatInterval(RepeatRequest req) {
        String legacyFrequency = req.frequency() == null ? null : req.frequency().trim().toLowerCase();
        if (legacyFrequency != null) {
            if (legacyFrequency.isBlank()) return null;
            String legacyUnit = LEGACY_FREQUENCY_UNITS.get(legacyFrequency);
            if (legacyUnit == null) {
                throw new ResponseStatusException(BAD_REQUEST, "Frequency must be daily, weekly, or monthly");
            }
            return new RepeatInterval(legacyUnit, 1);
        }

        String unit = req.intervalUnit() == null ? null : req.intervalUnit().trim().toLowerCase();
        Integer value = req.intervalValue();
        if ((unit == null || unit.isBlank()) && value == null) return null;
        if (unit == null || unit.isBlank() || value == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Recurrence interval requires intervalUnit and intervalValue");
        }
        Integer maxValue = REPEAT_UNIT_MAX_VALUES.get(unit);
        if (maxValue == null) {
            throw new ResponseStatusException(BAD_REQUEST, "intervalUnit must be day, week, month, or year");
        }
        if (value < 1 || value > maxValue) {
            throw new ResponseStatusException(BAD_REQUEST, "intervalValue is outside the allowed range for intervalUnit");
        }
        return new RepeatInterval(unit, value);
    }

    private String toLegacyFrequency(RepeatInterval repeatInterval) {
        if (repeatInterval.intervalValue() != 1) return null;
        return switch (repeatInterval.intervalUnit()) {
            case "day" -> "daily";
            case "week" -> "weekly";
            case "month" -> "monthly";
            default -> null;
        };
    }

    @PostMapping("/{id}/tags/{tagId}")
    public ResponseEntity<Task> addTag(@PathVariable Long id, @PathVariable Long tagId) {
        return taskRepository.findById(id).map(task ->
            tagRepository.findById(tagId).map(tag -> {
                if (!task.getTags().contains(tag)) {
                    task.getTags().add(tag);
                    taskRepository.save(task);
                }
                return ResponseEntity.ok(task);
            }).orElseGet(() -> ResponseEntity.notFound().build())
        ).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public ResponseEntity<Task> removeTag(@PathVariable Long id, @PathVariable Long tagId) {
        return taskRepository.findById(id).map(task -> {
            task.getTags().removeIf(tag -> tag.getTagID().equals(tagId));
            taskRepository.save(task);
            return ResponseEntity.ok(task);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
