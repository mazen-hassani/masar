package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.enums.DependencyType;
import com.salwita.taskmanagement.domain.enums.Status;
import com.salwita.taskmanagement.domain.enums.TrackingStatus;
import com.salwita.taskmanagement.domain.valueobject.ExternalRefs;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "projects")
@EntityListeners(AuditingEntityListener.class)
public class Project {

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

    @Embedded
    private ExternalRefs externalRefs;

    @Embedded
    private WorkingCalendar workingCalendar; // Can override organisation calendar

    @ElementCollection(targetClass = DependencyType.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "project_supported_dependency_types", 
                     joinColumns = @JoinColumn(name = "project_id"))
    @Column(name = "dependency_type")
    private Set<DependencyType> supportedDependencyTypes = EnumSet.allOf(DependencyType.class);

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisation_id", nullable = false)
    @NotNull
    private Organisation organisation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_pm_user_id")
    private User assignedPmUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_template_id")
    private ProjectTemplate sourceTemplate;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Activity> activities = new HashSet<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProjectBaseline> baselines = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Project() {
        // Default constructor for JPA
    }

    public Project(String name, String description, Organisation organisation) {
        this.name = name;
        this.description = description;
        this.organisation = organisation;
    }

    public Project(String name, String description, Organisation organisation, User assignedPmUser) {
        this.name = name;
        this.description = description;
        this.organisation = organisation;
        this.assignedPmUser = assignedPmUser;
    }

    // Business methods
    public WorkingCalendar getEffectiveWorkingCalendar() {
        return workingCalendar != null ? workingCalendar : organisation.getWorkingCalendar();
    }

    public void assignProjectManager(User pmUser) {
        if (!pmUser.canManageProject()) {
            throw new IllegalArgumentException("User must have PM or PMO role to manage projects");
        }
        this.assignedPmUser = pmUser;
    }

    public void updateStatus(Status newStatus) {
        if (status.canTransitionTo(newStatus)) {
            this.status = newStatus;
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
        this.percentageComplete = percentageComplete;
    }

    public boolean supportsDependencyType(DependencyType dependencyType) {
        return supportedDependencyTypes.contains(dependencyType);
    }

    public void addSupportedDependencyType(DependencyType dependencyType) {
        supportedDependencyTypes.add(dependencyType);
    }

    public void removeSupportedDependencyType(DependencyType dependencyType) {
        supportedDependencyTypes.remove(dependencyType);
    }

    public void setProjectTimeline(LocalDateTime startDate, LocalDateTime endDate) {
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

    public ExternalRefs getExternalRefs() {
        return externalRefs;
    }

    public void setExternalRefs(ExternalRefs externalRefs) {
        this.externalRefs = externalRefs;
    }

    public WorkingCalendar getWorkingCalendar() {
        return workingCalendar;
    }

    public void setWorkingCalendar(WorkingCalendar workingCalendar) {
        this.workingCalendar = workingCalendar;
    }

    public Set<DependencyType> getSupportedDependencyTypes() {
        return supportedDependencyTypes;
    }

    public Organisation getOrganisation() {
        return organisation;
    }

    public void setOrganisation(Organisation organisation) {
        this.organisation = organisation;
    }

    public User getAssignedPmUser() {
        return assignedPmUser;
    }

    public void setAssignedPmUser(User assignedPmUser) {
        this.assignedPmUser = assignedPmUser;
    }

    public ProjectTemplate getSourceTemplate() {
        return sourceTemplate;
    }

    public void setSourceTemplate(ProjectTemplate sourceTemplate) {
        this.sourceTemplate = sourceTemplate;
    }

    public Set<Activity> getActivities() {
        return activities;
    }

    public Set<ProjectBaseline> getBaselines() {
        return baselines;
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
        Project project = (Project) o;
        return Objects.equals(id, project.id) && Objects.equals(name, project.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }

    @Override
    public String toString() {
        return "Project{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", status=" + status +
               ", trackingStatus=" + trackingStatus +
               ", percentageComplete=" + percentageComplete +
               ", startDate=" + startDate +
               ", endDate=" + endDate +
               '}';
    }
}