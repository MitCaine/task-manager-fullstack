package com.example.taskmanager;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecurrenceRuleRepository extends JpaRepository<RecurrenceRule, Long> {
}
