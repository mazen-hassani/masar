package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.valueobject.ExternalRefs;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Objects;

@Entity
@Table(name = "project_templates")
@EntityListeners(AuditingEntityListener.class)
public class ProjectTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Embedded
    private WorkingCalendar workingCalendar;

    @ElementCollection(targetClass = com.salwita.taskmanagement.domain.enums.DependencyType.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "template_supported_dependency_types", 
                     joinColumns = @JoinColumn(name = "template_id"))
    @Column(name = "dependency_type")
    private Set<com.salwita.taskmanagement.domain.enums.DependencyType> supportedDependencyTypes = new HashSet<>();

    @Embedded
    private ExternalRefs externalRefs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisation_id", nullable = false)
    @NotNull
    private Organisation organisation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    @NotNull
    private User createdByUser;

    @OneToMany(mappedBy = "projectTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TemplateActivity> templateActivities = new ArrayList<>();

    @OneToMany(mappedBy = "projectTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<TemplateDependency> templateDependencies = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ProjectTemplate() {
        // Default constructor for JPA
    }

    public ProjectTemplate(String name, String description, Organisation organisation, User createdByUser) {
        this.name = name;
        this.description = description;
        this.organisation = organisation;
        this.createdByUser = createdByUser;
        // Initialize with organization's working calendar as default
        this.workingCalendar = organisation.getWorkingCalendar();
        this.supportedDependencyTypes.addAll(Set.of(
            com.salwita.taskmanagement.domain.enums.DependencyType.FS,
            com.salwita.taskmanagement.domain.enums.DependencyType.SS,
            com.salwita.taskmanagement.domain.enums.DependencyType.FF,
            com.salwita.taskmanagement.domain.enums.DependencyType.SF
        ));
    }

    public void addTemplateActivity(TemplateActivity templateActivity) {
        templateActivities.add(templateActivity);
        templateActivity.setProjectTemplate(this);
    }

    public void removeTemplateActivity(TemplateActivity templateActivity) {
        templateActivities.remove(templateActivity);
        templateActivity.setProjectTemplate(null);
    }

    public void addTemplateDependency(TemplateDependency templateDependency) {
        templateDependencies.add(templateDependency);
        templateDependency.setProjectTemplate(this);
    }

    public void removeTemplateDependency(TemplateDependency templateDependency) {
        templateDependencies.remove(templateDependency);
        templateDependency.setProjectTemplate(null);
    }

    public ProjectTemplate createNewVersion(User updatingUser) {
        ProjectTemplate newVersion = new ProjectTemplate(this.name, this.description, this.organisation, updatingUser);
        newVersion.version = this.version + 1;
        newVersion.workingCalendar = this.workingCalendar;
        newVersion.supportedDependencyTypes = new HashSet<>(this.supportedDependencyTypes);
        newVersion.externalRefs = this.externalRefs;
        
        // Mark current version as inactive
        this.isActive = false;
        
        return newVersion;
    }

    public boolean isValidDependencyType(com.salwita.taskmanagement.domain.enums.DependencyType dependencyType) {
        return supportedDependencyTypes.contains(dependencyType);
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

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public WorkingCalendar getWorkingCalendar() {
        return workingCalendar;
    }

    public void setWorkingCalendar(WorkingCalendar workingCalendar) {
        this.workingCalendar = workingCalendar;
    }

    public Set<com.salwita.taskmanagement.domain.enums.DependencyType> getSupportedDependencyTypes() {
        return supportedDependencyTypes;
    }

    public void setSupportedDependencyTypes(Set<com.salwita.taskmanagement.domain.enums.DependencyType> supportedDependencyTypes) {
        this.supportedDependencyTypes = supportedDependencyTypes;
    }

    public ExternalRefs getExternalRefs() {
        return externalRefs;
    }

    public void setExternalRefs(ExternalRefs externalRefs) {
        this.externalRefs = externalRefs;
    }

    public Organisation getOrganisation() {
        return organisation;
    }

    public void setOrganisation(Organisation organisation) {
        this.organisation = organisation;
    }

    public User getCreatedByUser() {
        return createdByUser;
    }

    public void setCreatedByUser(User createdByUser) {
        this.createdByUser = createdByUser;
    }

    public List<TemplateActivity> getTemplateActivities() {
        return templateActivities;
    }

    public Set<TemplateDependency> getTemplateDependencies() {
        return templateDependencies;
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
        ProjectTemplate that = (ProjectTemplate) o;
        return Objects.equals(name, that.name) &&
               Objects.equals(version, that.version) &&
               Objects.equals(organisation, that.organisation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, version, organisation);
    }

    @Override
    public String toString() {
        return "ProjectTemplate{" +
               "id=" + id +
               ", name='" + name + '\'' +
               ", version=" + version +
               ", isActive=" + isActive +
               ", organisation=" + organisation +
               '}';
    }
}