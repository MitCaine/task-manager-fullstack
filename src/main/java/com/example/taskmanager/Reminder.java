package com.example.taskmanager;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Reminder")
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reminderID;

    @Column(name = "dueDate")
    private LocalDateTime dueDate;

    @Column(name = "notificationMethod")
    private String notificationMethod = "browser";

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "taskID")
    private Long taskID;

    public Long getReminderID() { return reminderID; }
    public void setReminderID(Long reminderID) { this.reminderID = reminderID; }
    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public String getNotificationMethod() { return notificationMethod; }
    public void setNotificationMethod(String notificationMethod) { this.notificationMethod = notificationMethod; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Long getTaskID() { return taskID; }
    public void setTaskID(Long taskID) { this.taskID = taskID; }
}
