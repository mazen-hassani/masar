package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.valueobject.ExternalRefs;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "tasks")
@EntityListeners(AuditingEntityListener.class)
public class Task {

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

    @Column(name = "actual_start_date")
    private LocalDateTime actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDateTime actualEndDate;

    @Embedded
    private ExternalRefs externalRefs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false)
    @NotNull
    private Activity activity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_user_id")
    private User assigneeUser;

    @OneToMany(mappedBy = "predecessorTask", cascade = CascadeType.ALL)
    private Set<Dependency> predecessorDependencies = new HashSet<>();

    @OneToMany(mappedBy = "successorTask", cascade = CascadeType.ALL)
    private Set<Dependency> successorDependencies = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by_user_id")
    private User verifiedByUser;

    protected Task() {
        // Default constructor for JPA
    }

    public Task(String name, String description, Activity activity) {
        this.name = name;
        this.description = description;
        this.activity = activity;
    }

    public Task(String name, String description, Activity activity, User assigneeUser) {
        this.name = name;
        this.description = description;
        this.activity = activity;
        this.assigneeUser = assigneeUser;
    }

    // Business methods
    public void updateStatus(Status newStatus) {
        if (status.canTransitionTo(newStatus)) {
            Status previousStatus = this.status;
            this.status = newStatus;
            
            // Track actual start/end dates
            if (newStatus == Status.IN_PROGRESS && actualStartDate == null) {
                this.actualStartDate = LocalDateTime.now();
            }
            if (newStatus == Status.COMPLETED && actualEndDate == null) {
                this.actualEndDate = LocalDateTime.now();
                this.percentageComplete = 100;
            }
        } else {
            throw new IllegalStateException("Cannot transition from " + status + " to " + newStatus);
        }
    }

    public void updateTrackingStatus(TrackingStatus trackingStatus) {
        this.trackingStatus = trackingStatus;
    }

    public void updateProgress(Integer percentageComplete) {
        if (percentageComplete < 0 || percentageComplete > 100) {
            throw new IllegalArgumentException("Percentage complete must be between 0 and 100");
        }
        if (status != Status.IN_PROGRESS) {
            throw new IllegalStateException("Can only update progress when task is in progress");
        }
        this.percentageComplete = percentageComplete;
        
        // Auto-complete if 100%
        if (percentageComplete == 100 && status == Status.IN_PROGRESS) {
            updateStatus(Status.COMPLETED);
        }
    }

    public void assignTo(User user) {
        this.assigneeUser = user;
    }

    public void verify(User verifier) {
        if (!verifier.canVerifyTasks()) {
            throw new IllegalArgumentException("User does not have permission to verify tasks");
        }
        if (status != Status.COMPLETED) {
            throw new IllegalStateException("Task must be completed before it can be verified");
        }
        
        this.status = Status.VERIFIED;
        this.verifiedAt = LocalDateTime.now();
        this.verifiedByUser = verifier;
    }

    public boolean isOverdue() {
        return endDate != null && 
               LocalDateTime.now().isAfter(endDate) && 
               status != Status.COMPLETED && 
               status != Status.VERIFIED;
    }

    public void setTaskTimeline(LocalDateTime startDate, LocalDateTime endDate) {
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

    public LocalDateTime getActualStartDate() {
        return actualStartDate;
    }

    public void setActualStartDate(LocalDateTime actualStartDate) {
        this.actualStartDate = actualStartDate;
    }

    public LocalDateTime getActualEndDate() {
        return actualEndDate;
    }

    public void setActualEndDate(LocalDateTime actualEndDate) {
        this.actualEndDate = actualEndDate;
    }

    public ExternalRefs getExternalRefs() {
        return externalRefs;
    }

    public void setExternalRefs(ExternalRefs externalRefs) {
        this.externalRefs = externalRefs;
    }

    public Activity getActivity() {
        return activity;
    }

    public void setActivity(Activity activity) {
        this.activity = activity;
    }

    public User getAssigneeUser() {
        return assigneeUser;
    }

    public void setAssigneeUser(User assigneeUser) {
        this.assigneeUser = assigneeUser;
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

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }

    public User getVerifiedByUser() {
        return verifiedByUser;
    }

    public void setVerifiedByUser(User verifiedByUser) {
        this.verifiedByUser = verifiedByUser;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Task task = (Task) o;
        return Objects.equals(id, task.id) && Objects.equals(name, task.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }

    @Override
    public String toString() {
        return "Task{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", status=" + status +
               ", trackingStatus=" + trackingStatus +
               ", percentageComplete=" + percentageComplete +
               ", startDate=" + startDate +
               ", endDate=" + endDate +
               ", assigneeUser=" + (assigneeUser != null ? assigneeUser.getFullName() : "Unassigned") +
               '}';
    }
}