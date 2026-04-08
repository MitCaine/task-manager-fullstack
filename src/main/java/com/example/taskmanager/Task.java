package com.example.taskmanager;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

@Entity
@Table(name = "Task")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long taskID;

    @NotBlank(message = "Title must not be blank")
    private String title;

    @Size(max = 1000, message = "Description must not be more than 1000 characters")
    private String description;

    @Column(name = "dateTimeScheduled")
    private LocalDateTime dateTimeScheduled;

    @Column(name = "userID")
    private Long userID;

    public Long getTaskID() {
        return taskID;
    }

    public void setTaskID(Long taskID) {
        this.taskID = taskID;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getDateTimeScheduled() {
        return dateTimeScheduled;
    }

    public void setDateTimeScheduled(LocalDateTime dateTimeScheduled) {
        this.dateTimeScheduled = dateTimeScheduled;
    }

    public Long getUserID() {
        return userID;
    }

    public void setUserID(Long userID) {
        this.userID = userID;
    }
}