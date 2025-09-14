package com.salwita.taskmanagement.domain.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Result of validating a proposed edit to task/activity dates
 */
public class EditValidationResult {
    
    public enum ValidationStatus {
        VALID,
        WARNING,
        ERROR
    }
    
    private ValidationStatus status;
    private boolean canProceed;
    private String primaryMessage;
    private List<String> validationMessages;
    private List<String> warnings;
    private List<String> errors;
    private DownstreamImpact downstreamImpact;
    
    // Suggested alternative dates if the proposed dates are invalid
    private LocalDateTime suggestedStartDate;
    private LocalDateTime suggestedEndDate;
    
    public EditValidationResult() {
        this.status = ValidationStatus.VALID;
        this.canProceed = true;
        this.validationMessages = new ArrayList<>();
        this.warnings = new ArrayList<>();
        this.errors = new ArrayList<>();
    }
    
    public static EditValidationResult valid(String message) {
        EditValidationResult result = new EditValidationResult();
        result.status = ValidationStatus.VALID;
        result.primaryMessage = message;
        result.canProceed = true;
        return result;
    }
    
    public static EditValidationResult warning(String message) {
        EditValidationResult result = new EditValidationResult();
        result.status = ValidationStatus.WARNING;
        result.primaryMessage = message;
        result.canProceed = true;
        result.warnings.add(message);
        return result;
    }
    
    public static EditValidationResult error(String message) {
        EditValidationResult result = new EditValidationResult();
        result.status = ValidationStatus.ERROR;
        result.primaryMessage = message;
        result.canProceed = false;
        result.errors.add(message);
        return result;
    }
    
    // Getters and setters
    
    public ValidationStatus getStatus() {
        return status;
    }
    
    public void setStatus(ValidationStatus status) {
        this.status = status;
    }
    
    public boolean isCanProceed() {
        return canProceed;
    }
    
    public void setCanProceed(boolean canProceed) {
        this.canProceed = canProceed;
    }
    
    public String getPrimaryMessage() {
        return primaryMessage;
    }
    
    public void setPrimaryMessage(String primaryMessage) {
        this.primaryMessage = primaryMessage;
    }
    
    public List<String> getValidationMessages() {
        return validationMessages;
    }
    
    public void setValidationMessages(List<String> validationMessages) {
        this.validationMessages = validationMessages;
    }
    
    public void addValidationMessage(String message) {
        this.validationMessages.add(message);
    }
    
    public List<String> getWarnings() {
        return warnings;
    }
    
    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
    
    public void addWarning(String warning) {
        this.warnings.add(warning);
        if (this.status == ValidationStatus.VALID) {
            this.status = ValidationStatus.WARNING;
        }
    }
    
    public List<String> getErrors() {
        return errors;
    }
    
    public void setErrors(List<String> errors) {
        this.errors = errors;
    }
    
    public void addError(String error) {
        this.errors.add(error);
        this.status = ValidationStatus.ERROR;
        this.canProceed = false;
    }
    
    public DownstreamImpact getDownstreamImpact() {
        return downstreamImpact;
    }
    
    public void setDownstreamImpact(DownstreamImpact downstreamImpact) {
        this.downstreamImpact = downstreamImpact;
    }
    
    public LocalDateTime getSuggestedStartDate() {
        return suggestedStartDate;
    }
    
    public void setSuggestedStartDate(LocalDateTime suggestedStartDate) {
        this.suggestedStartDate = suggestedStartDate;
    }
    
    public LocalDateTime getSuggestedEndDate() {
        return suggestedEndDate;
    }
    
    public void setSuggestedEndDate(LocalDateTime suggestedEndDate) {
        this.suggestedEndDate = suggestedEndDate;
    }
    
    public boolean hasWarnings() {
        return !warnings.isEmpty();
    }
    
    public boolean hasErrors() {
        return !errors.isEmpty();
    }
    
    public boolean requiresUserConfirmation() {
        return hasWarnings() || (downstreamImpact != null && downstreamImpact.hasImpact());
    }
    
    @Override
    public String toString() {
        return "EditValidationResult{" +
               "status=" + status +
               ", canProceed=" + canProceed +
               ", primaryMessage='" + primaryMessage + '\'' +
               ", warnings=" + warnings.size() +
               ", errors=" + errors.size() +
               ", hasDownstreamImpact=" + (downstreamImpact != null && downstreamImpact.hasImpact()) +
               '}';
    }
}