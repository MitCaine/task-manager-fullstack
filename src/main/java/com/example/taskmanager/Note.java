package com.example.taskmanager;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "Note")
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long noteID;

    private String title;

    @Size(max = 5000, message = "Note content must not exceed 5000 characters")
    @Column(columnDefinition = "TEXT")
    private String context;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @Column(name = "taskID")
    private Long taskID;

    public Long getNoteID() { return noteID; }
    public void setNoteID(Long noteID) { this.noteID = noteID; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContext() { return context; }
    public void setContext(String context) { this.context = context; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public Long getTaskID() { return taskID; }
    public void setTaskID(Long taskID) { this.taskID = taskID; }
}
