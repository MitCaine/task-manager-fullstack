package com.mitchell.taskmanager;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findAllByOrderByDateTimeScheduledAsc();
    List<Task> findByUserIDOrderByDateTimeScheduledAsc(Long userID);
}