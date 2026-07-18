package com.mitchell.taskmanager;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "Attachment")
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long attachmentID;

    @NotBlank(message = "URL must not be blank")
    @Column(name = "fileORLink")
    private String fileORLink;

    @Column(name = "metadata")
    private String metadata;

    @Column(name = "fileSize")
    private long fileSize = 0;

    @Column(name = "taskID")
    private Long taskID;

    public Long getAttachmentID() { return attachmentID; }
    public void setAttachmentID(Long attachmentID) { this.attachmentID = attachmentID; }
    public String getFileORLink() { return fileORLink; }
    public void setFileORLink(String fileORLink) { this.fileORLink = fileORLink; }
    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    public Long getTaskID() { return taskID; }
    public void setTaskID(Long taskID) { this.taskID = taskID; }
}
