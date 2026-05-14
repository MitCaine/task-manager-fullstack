package com.example.taskmanager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class TaskRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TaskRepository taskRepository;

    // Test fixture builder.

    private Task persist(String title, Long userID, LocalDateTime scheduled) {
        Task t = new Task();
        t.setTitle(title);
        t.setUserID(userID);
        t.setDateTimeScheduled(scheduled);
        return entityManager.persistAndFlush(t);
    }

    // findAllByOrderByDateTimeScheduledAsc

    @Test
    void findAll_returnsTasksInChronologicalOrder() {
        persist("Third",  1L, LocalDateTime.of(2026, 6, 1, 0, 0));
        persist("First",  1L, LocalDateTime.of(2026, 4, 1, 0, 0));
        persist("Second", 1L, LocalDateTime.of(2026, 5, 1, 0, 0));

        List<Task> results = taskRepository.findAllByOrderByDateTimeScheduledAsc();

        assertThat(results).extracting(Task::getTitle)
                .containsExactly("First", "Second", "Third");
    }

    @Test
    void findAll_tasksWithNullScheduled_includedAndSortFirst() {
        persist("No date",   1L, null);
        persist("Has date",  1L, LocalDateTime.of(2026, 4, 1, 0, 0));

        List<Task> results = taskRepository.findAllByOrderByDateTimeScheduledAsc();

        // H2 and MySQL place null scheduled dates before non-null values in ascending order.
        assertThat(results).hasSize(2);
        assertThat(results.get(0).getDateTimeScheduled()).isNull();
    }

    @Test
    void findAll_noTasks_returnsEmptyList() {
        List<Task> results = taskRepository.findAllByOrderByDateTimeScheduledAsc();
        assertThat(results).isEmpty();
    }

    // findByUserIDOrderByDateTimeScheduledAsc

    @Test
    void findByUserID_returnsOnlyThatUsersTasksInOrder() {
        persist("User1-Later",  1L, LocalDateTime.of(2026, 5, 1, 0, 0));
        persist("User1-Earlier",1L, LocalDateTime.of(2026, 4, 1, 0, 0));
        persist("User2-Task",   2L, LocalDateTime.of(2026, 3, 1, 0, 0));

        List<Task> results = taskRepository.findByUserIDOrderByDateTimeScheduledAsc(1L);

        assertThat(results).hasSize(2);
        assertThat(results).extracting(Task::getTitle)
                .containsExactly("User1-Earlier", "User1-Later");
    }

    @Test
    void findByUserID_noMatchingUser_returnsEmptyList() {
        persist("User1-Task", 1L, LocalDateTime.of(2026, 4, 1, 0, 0));

        List<Task> results = taskRepository.findByUserIDOrderByDateTimeScheduledAsc(999L);

        assertThat(results).isEmpty();
    }

    @Test
    void findByUserID_withNullScheduled_includesTask() {
        persist("User1-NoDate", 1L, null);
        persist("User1-Date",   1L, LocalDateTime.of(2026, 4, 1, 0, 0));

        List<Task> results = taskRepository.findByUserIDOrderByDateTimeScheduledAsc(1L);

        assertThat(results).hasSize(2);
    }

    // Persistence edge cases

    @Test
    void saveTask_withMaxLengthDescription_persists() {
        String maxDesc = "x".repeat(1000);
        Task t = new Task();
        t.setTitle("Max desc task");
        t.setDescription(maxDesc);
        entityManager.persistAndFlush(t);

        List<Task> results = taskRepository.findAllByOrderByDateTimeScheduledAsc();
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getDescription()).hasSize(1000);
    }

    @Test
    void saveTask_withNullOptionalFields_persists() {
        Task t = new Task();
        t.setTitle("Minimal task");
        // Optional task fields may be persisted as null.
        entityManager.persistAndFlush(t);

        List<Task> results = taskRepository.findAllByOrderByDateTimeScheduledAsc();
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getDescription()).isNull();
        assertThat(results.get(0).getDateTimeScheduled()).isNull();
        assertThat(results.get(0).getUserID()).isNull();
    }
}
