package com.mitchell.taskmanager;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "RecurrenceRule")
public class RecurrenceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long recurrenceRuleID;

    @Column(name = "frequency")
    private String frequency;

    @Column(name = "intervalUnit", nullable = false)
    private String intervalUnit;

    @Column(name = "intervalValue", nullable = false)
    private int intervalValue = 1;

    @Column(name = "timesOfRecurrence", nullable = false)
    private int timesOfRecurrence = 0;

    @Column(name = "startDateTime", nullable = false)
    private LocalDateTime startDateTime;

    @Column(name = "endDateTime", nullable = false)
    private LocalDateTime endDateTime;

    public Long getRecurrenceRuleID() { return recurrenceRuleID; }
    public void setRecurrenceRuleID(Long recurrenceRuleID) { this.recurrenceRuleID = recurrenceRuleID; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getIntervalUnit() { return intervalUnit; }
    public void setIntervalUnit(String intervalUnit) { this.intervalUnit = intervalUnit; }
    public int getIntervalValue() { return intervalValue; }
    public void setIntervalValue(int intervalValue) { this.intervalValue = intervalValue; }
    public int getTimesOfRecurrence() { return timesOfRecurrence; }
    public void setTimesOfRecurrence(int timesOfRecurrence) { this.timesOfRecurrence = timesOfRecurrence; }
    public LocalDateTime getStartDateTime() { return startDateTime; }
    public void setStartDateTime(LocalDateTime startDateTime) { this.startDateTime = startDateTime; }
    public LocalDateTime getEndDateTime() { return endDateTime; }
    public void setEndDateTime(LocalDateTime endDateTime) { this.endDateTime = endDateTime; }
}
