package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.valueobject.ExternalRefs;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "activities")
@EntityListeners(AuditingEntityListener.class)
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status = Status.NOT_STARTED;

    @Enumerated(EnumType.STRING)
    @Column(name = "tracking_status")
    private TrackingStatus trackingStatus;

    @Column(name = "percentage_complete", nullable = false)
    private Integer percentageComplete = 0;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "verification_checklist", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<ChecklistItem> verificationChecklist = new ArrayList<>();

    @Embedded
    private ExternalRefs externalRefs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @NotNull
    private Project project;

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Task> tasks = new HashSet<>();

    @OneToMany(mappedBy = "predecessorActivity", cascade = CascadeType.ALL)
    private Set<Dependency> predecessorDependencies = new HashSet<>();

    @OneToMany(mappedBy = "successorActivity", cascade = CascadeType.ALL)
    private Set<Dependency> successorDependencies = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Activity() {
        // Default constructor for JPA
    }

    public Activity(String name, String description, Project project) {
        this.name = name;
        this.description = description;
        this.project = project;
    }

    // Business methods
    public void updateStatus(Status newStatus) {
        if (status.canTransitionTo(newStatus)) {
            this.status = newStatus;
            if (newStatus == Status.VERIFIED) {
                // Ensure all checklist items are completed
                boolean allItemsCompleted = verificationChecklist.stream()
                    .allMatch(ChecklistItem::isCompleted);
                if (!allItemsCompleted) {
                    throw new IllegalStateException("Cannot verify activity: checklist not completed");
                }
            }
        } else {
            throw new IllegalStateException("Cannot transition from " + status + " to " + newStatus);
        }
    }

    public void updateTrackingStatus(TrackingStatus trackingStatus) {
        this.trackingStatus = trackingStatus;
    }

    public Integer calculateProgressFromTasks() {
        if (tasks.isEmpty()) {
            return percentageComplete;
        }
        
        int totalProgress = tasks.stream()
            .mapToInt(Task::getPercentageComplete)
            .sum();
        
        return totalProgress / tasks.size();
    }

    public void addChecklistItem(String description) {
        ChecklistItem item = new ChecklistItem(description);
        verificationChecklist.add(item);
    }

    public void completeChecklistItem(int index, User completedBy, String comments) {
        if (index >= 0 && index < verificationChecklist.size()) {
            ChecklistItem item = verificationChecklist.get(index);
            item.complete(completedBy.getFullName(), comments);
        }
    }

    public boolean isChecklistComplete() {
        return verificationChecklist.stream().allMatch(ChecklistItem::isCompleted);
    }

    public void setActivityTimeline(LocalDateTime startDate, LocalDateTime endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must be before end date");
        }
        this.startDate = startDate;
        this.endDate = endDate;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public TrackingStatus getTrackingStatus() {
        return trackingStatus;
    }

    public void setTrackingStatus(TrackingStatus trackingStatus) {
        this.trackingStatus = trackingStatus;
    }

    public Integer getPercentageComplete() {
        return percentageComplete;
    }

    public void setPercentageComplete(Integer percentageComplete) {
        this.percentageComplete = percentageComplete;
    }

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }

    public List<ChecklistItem> getVerificationChecklist() {
        return verificationChecklist;
    }

    public void setVerificationChecklist(List<ChecklistItem> verificationChecklist) {
        this.verificationChecklist = verificationChecklist;
    }

    public ExternalRefs getExternalRefs() {
        return externalRefs;
    }

    public void setExternalRefs(ExternalRefs externalRefs) {
        this.externalRefs = externalRefs;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public Set<Task> getTasks() {
        return tasks;
    }

    public Set<Dependency> getPredecessorDependencies() {
        return predecessorDependencies;
    }

    public Set<Dependency> getSuccessorDependencies() {
        return successorDependencies;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Activity activity = (Activity) o;
        return Objects.equals(id, activity.id) && Objects.equals(name, activity.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }

    @Override
    public String toString() {
        return "Activity{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", status=" + status +
               ", trackingStatus=" + trackingStatus +
               ", percentageComplete=" + percentageComplete +
               ", startDate=" + startDate +
               ", endDate=" + endDate +
               '}';
    }

    // Inner class for checklist items
    public static class ChecklistItem {
        private String description;
        private boolean completed;
        private String completedBy;
        private LocalDateTime completedAt;
        private String comments;

        protected ChecklistItem() {
            // Default constructor for JSON serialization
        }

        public ChecklistItem(String description) {
            this.description = description;
            this.completed = false;
        }

        public void complete(String completedBy, String comments) {
            this.completed = true;
            this.completedBy = completedBy;
            this.completedAt = LocalDateTime.now();
            this.comments = comments;
        }

        // Getters
        public String getDescription() { return description; }
        public boolean isCompleted() { return completed; }
        public String getCompletedBy() { return completedBy; }
        public LocalDateTime getCompletedAt() { return completedAt; }
        public String getComments() { return comments; }
    }
}