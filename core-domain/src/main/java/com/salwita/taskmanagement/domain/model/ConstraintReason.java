package com.salwita.taskmanagement.domain.model;

import com.salwita.taskmanagement.domain.enums.DependencyType;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Represents a reason why a specific constraint exists on a task or activity
 */
public class ConstraintReason {
    
    public enum ConstraintType {
        DEPENDENCY_CONSTRAINT,
        PROJECT_BOUNDARY_CONSTRAINT,
        WORKING_CALENDAR_CONSTRAINT,
        DURATION_CONSTRAINT,
        RESOURCE_CONSTRAINT
    }
    
    private ConstraintType constraintType;
    private String description;
    private LocalDateTime constraintDateTime;
    
    // For dependency constraints
    private Long dependencyId;
    private Long relatedItemId;
    private String relatedItemName;
    private String relatedItemType; // "Task" or "Activity"
    private DependencyType dependencyType;
    
    // For boundary constraints
    private String boundaryType; // "PROJECT_START", "PROJECT_END"
    
    public ConstraintReason() {}
    
    public ConstraintReason(ConstraintType constraintType, String description) {
        this.constraintType = constraintType;
        this.description = description;
    }
    
    // Static factory methods for common constraint types
    
    public static ConstraintReason createDependencyConstraint(
            Long dependencyId, 
            Long relatedItemId, 
            String relatedItemName, 
            String relatedItemType,
            DependencyType dependencyType, 
            LocalDateTime constraintDateTime) {
        
        ConstraintReason reason = new ConstraintReason();
        reason.constraintType = ConstraintType.DEPENDENCY_CONSTRAINT;
        reason.dependencyId = dependencyId;
        reason.relatedItemId = relatedItemId;
        reason.relatedItemName = relatedItemName;
        reason.relatedItemType = relatedItemType;
        reason.dependencyType = dependencyType;
        reason.constraintDateTime = constraintDateTime;
        reason.description = String.format(
            "%s dependency on %s '%s' requires constraint at %s", 
            dependencyType, relatedItemType.toLowerCase(), relatedItemName, constraintDateTime
        );
        return reason;
    }
    
    public static ConstraintReason createProjectBoundaryConstraint(String boundaryType, LocalDateTime constraintDateTime) {
        ConstraintReason reason = new ConstraintReason();
        reason.constraintType = ConstraintType.PROJECT_BOUNDARY_CONSTRAINT;
        reason.boundaryType = boundaryType;
        reason.constraintDateTime = constraintDateTime;
        reason.description = String.format(
            "Project %s boundary at %s", 
            boundaryType.toLowerCase().replace("_", " "), 
            constraintDateTime
        );
        return reason;
    }
    
    public static ConstraintReason createWorkingCalendarConstraint(String description, LocalDateTime constraintDateTime) {
        ConstraintReason reason = new ConstraintReason();
        reason.constraintType = ConstraintType.WORKING_CALENDAR_CONSTRAINT;
        reason.constraintDateTime = constraintDateTime;
        reason.description = description;
        return reason;
    }
    
    public static ConstraintReason createDurationConstraint(String description) {
        ConstraintReason reason = new ConstraintReason();
        reason.constraintType = ConstraintType.DURATION_CONSTRAINT;
        reason.description = description;
        return reason;
    }
    
    // Getters and setters
    
    public ConstraintType getConstraintType() {
        return constraintType;
    }
    
    public void setConstraintType(ConstraintType constraintType) {
        this.constraintType = constraintType;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public LocalDateTime getConstraintDateTime() {
        return constraintDateTime;
    }
    
    public void setConstraintDateTime(LocalDateTime constraintDateTime) {
        this.constraintDateTime = constraintDateTime;
    }
    
    public Long getDependencyId() {
        return dependencyId;
    }
    
    public void setDependencyId(Long dependencyId) {
        this.dependencyId = dependencyId;
    }
    
    public Long getRelatedItemId() {
        return relatedItemId;
    }
    
    public void setRelatedItemId(Long relatedItemId) {
        this.relatedItemId = relatedItemId;
    }
    
    public String getRelatedItemName() {
        return relatedItemName;
    }
    
    public void setRelatedItemName(String relatedItemName) {
        this.relatedItemName = relatedItemName;
    }
    
    public String getRelatedItemType() {
        return relatedItemType;
    }
    
    public void setRelatedItemType(String relatedItemType) {
        this.relatedItemType = relatedItemType;
    }
    
    public DependencyType getDependencyType() {
        return dependencyType;
    }
    
    public void setDependencyType(DependencyType dependencyType) {
        this.dependencyType = dependencyType;
    }
    
    public String getBoundaryType() {
        return boundaryType;
    }
    
    public void setBoundaryType(String boundaryType) {
        this.boundaryType = boundaryType;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ConstraintReason that = (ConstraintReason) o;
        return constraintType == that.constraintType &&
               Objects.equals(description, that.description) &&
               Objects.equals(dependencyId, that.dependencyId) &&
               Objects.equals(relatedItemId, that.relatedItemId);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(constraintType, description, dependencyId, relatedItemId);
    }
    
    @Override
    public String toString() {
        return "ConstraintReason{" +
               "type=" + constraintType +
               ", description='" + description + '\'' +
               ", constraintDateTime=" + constraintDateTime +
               '}';
    }
}