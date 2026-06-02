package com.example.taskmanager;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "endDateTimeScheduled")
    private LocalDateTime endDateTimeScheduled;

    @Column(name = "userID")
    private Long userID;

    @Column(name = "statusID")
    private Long statusID;

    @Column(name = "createdAt", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "scheduleID")
    private Long scheduleID;

    @Column(name = "recurrenceRuleID")
    private Long recurrenceRuleID;

    @Column(name = "projectID")
    private Long projectID;

    @Column(name = "priority")
    private String priority;

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

    public LocalDateTime getEndDateTimeScheduled() {
        return endDateTimeScheduled;
    }

    public void setEndDateTimeScheduled(LocalDateTime endDateTimeScheduled) {
        this.endDateTimeScheduled = endDateTimeScheduled;
    }

    public Long getUserID() {
        return userID;
    }

    public void setUserID(Long userID) {
        this.userID = userID;
    }

    public Long getStatusID() {
        return statusID;
    }

    public void setStatusID(Long statusID) {
        this.statusID = statusID;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Long getScheduleID() {
        return scheduleID;
    }

    public void setScheduleID(Long scheduleID) {
        this.scheduleID = scheduleID;
    }

    public Long getRecurrenceRuleID() {
        return recurrenceRuleID;
    }

    public void setRecurrenceRuleID(Long recurrenceRuleID) {
        this.recurrenceRuleID = recurrenceRuleID;
    }

    public Long getProjectID() {
        return projectID;
    }

    public void setProjectID(Long projectID) {
        this.projectID = projectID;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "TaskTag",
        joinColumns = @JoinColumn(name = "taskID"),
        inverseJoinColumns = @JoinColumn(name = "tagID")
    )

    private List<Tag> tags = new ArrayList<>();

    public List<Tag> getTags() {
        return tags;
    }

    public void setTags(List<Tag> tags) {
        this.tags = tags;
    }
}
