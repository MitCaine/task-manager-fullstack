package com.example.taskmanager;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubtaskRepository extends JpaRepository<Subtask, Long> {
    List<Subtask> findByParentTaskID(Long parentTaskID);
}
