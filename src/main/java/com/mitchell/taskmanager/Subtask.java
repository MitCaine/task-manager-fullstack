package com.mitchell.taskmanager;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "Subtask")
public class Subtask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long subTaskID;

    @NotBlank(message = "Title must not be blank")
    private String title;

    @Column(name = "statusID")
    private Long statusID = 1L;

    @Column(name = "dateTimeScheduled")
    private LocalDateTime dateTimeScheduled;

    @Column(name = "parentTaskID")
    private Long parentTaskID;

    public Long getSubTaskID() { return subTaskID; }
    public void setSubTaskID(Long subTaskID) { this.subTaskID = subTaskID; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Long getStatusID() { return statusID; }
    public void setStatusID(Long statusID) { this.statusID = statusID; }
    public LocalDateTime getDateTimeScheduled() { return dateTimeScheduled; }
    public void setDateTimeScheduled(LocalDateTime dateTimeScheduled) { this.dateTimeScheduled = dateTimeScheduled; }
    public Long getParentTaskID() { return parentTaskID; }
    public void setParentTaskID(Long parentTaskID) { this.parentTaskID = parentTaskID; }
}
