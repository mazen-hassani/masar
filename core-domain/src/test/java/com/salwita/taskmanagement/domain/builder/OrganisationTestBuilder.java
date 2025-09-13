package com.salwita.taskmanagement.domain.builder;

import com.salwita.taskmanagement.domain.entity.Organisation;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;

public class OrganisationTestBuilder {
    
    private String name = "Test Organisation";
    private String description = "Test organisation description";
    private WorkingCalendar workingCalendar = WorkingCalendar.defaultCalendar();
    private Integer atRiskThresholdPercentage = 10;

    public static OrganisationTestBuilder organisation() {
        return new OrganisationTestBuilder();
    }

    public OrganisationTestBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public OrganisationTestBuilder withDescription(String description) {
        this.description = description;
        return this;
    }

    public OrganisationTestBuilder withWorkingCalendar(WorkingCalendar workingCalendar) {
        this.workingCalendar = workingCalendar;
        return this;
    }

    public OrganisationTestBuilder withAtRiskThreshold(Integer percentage) {
        this.atRiskThresholdPercentage = percentage;
        return this;
    }

    public Organisation build() {
        Organisation organisation = new Organisation(name, description, workingCalendar);
        organisation.updateAtRiskThreshold(atRiskThresholdPercentage);
        return organisation;
    }
}