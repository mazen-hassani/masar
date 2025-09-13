package com.salwita.taskmanagement.domain.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "project_baselines")
@EntityListeners(AuditingEntityListener.class)
public class ProjectBaseline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "is_current", nullable = false)
    private Boolean isCurrent = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @NotNull
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    @NotNull
    private User createdByUser;

    @OneToMany(mappedBy = "baseline", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<BaselineSnapshot> snapshots = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ProjectBaseline() {
        // Default constructor for JPA
    }

    public ProjectBaseline(String name, String description, Project project, User createdByUser) {
        this.name = name;
        this.description = description;
        this.project = project;
        this.createdByUser = createdByUser;
    }

    public ProjectBaseline(String name, String description, Project project, User createdByUser, Integer version) {
        this(name, description, project, createdByUser);
        this.version = version;
    }

    // Business methods
    public void makeCurrentBaseline() {
        // Should be handled by service to ensure only one current baseline per project
        this.isCurrent = true;
    }

    public void deactivate() {
        this.isCurrent = false;
    }

    public static ProjectBaseline createPlannedBaseline(Project project, User createdByUser) {
        return new ProjectBaseline("Planned v1", "Initial planned baseline", project, createdByUser);
    }

    public void addSnapshot(BaselineSnapshot snapshot) {
        snapshots.add(snapshot);
        snapshot.setBaseline(this);
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

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public Boolean getIsCurrent() {
        return isCurrent;
    }

    public void setIsCurrent(Boolean isCurrent) {
        this.isCurrent = isCurrent;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public User getCreatedByUser() {
        return createdByUser;
    }

    public void setCreatedByUser(User createdByUser) {
        this.createdByUser = createdByUser;
    }

    public Set<BaselineSnapshot> getSnapshots() {
        return snapshots;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ProjectBaseline that = (ProjectBaseline) o;
        return Objects.equals(id, that.id) && Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }

    @Override
    public String toString() {
        return "ProjectBaseline{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", version=" + version +
               ", isCurrent=" + isCurrent +
               ", createdAt=" + createdAt +
               '}';
    }
}