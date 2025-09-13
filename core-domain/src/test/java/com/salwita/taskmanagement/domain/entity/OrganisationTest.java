package com.salwita.taskmanagement.domain.entity;

import com.salwita.taskmanagement.domain.builder.OrganisationTestBuilder;
import com.salwita.taskmanagement.domain.valueobject.WorkingCalendar;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrganisationTest {

    @Test
    void shouldCreateOrganisationWithValidData() {
        Organisation organisation = OrganisationTestBuilder.organisation()
                .withName("Test Org")
                .withDescription("Test Description")
                .build();

        assertNotNull(organisation);
        assertEquals("Test Org", organisation.getName());
        assertEquals("Test Description", organisation.getDescription());
        assertEquals(10, organisation.getAtRiskThresholdPercentage());
        assertNotNull(organisation.getWorkingCalendar());
    }

    @Test
    void shouldUpdateWorkingCalendar() {
        Organisation organisation = OrganisationTestBuilder.organisation().build();
        WorkingCalendar newCalendar = new WorkingCalendar("Europe/London", 
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY", 8, "08:00", "16:00");

        organisation.updateWorkingCalendar(newCalendar);

        assertEquals(newCalendar, organisation.getWorkingCalendar());
        assertEquals("Europe/London", organisation.getWorkingCalendar().getTimezone());
    }

    @Test
    void shouldUpdateAtRiskThreshold() {
        Organisation organisation = OrganisationTestBuilder.organisation().build();

        organisation.updateAtRiskThreshold(15);

        assertEquals(15, organisation.getAtRiskThresholdPercentage());
    }

    @Test
    void shouldThrowExceptionForInvalidAtRiskThreshold() {
        Organisation organisation = OrganisationTestBuilder.organisation().build();

        assertThrows(IllegalArgumentException.class, 
                () -> organisation.updateAtRiskThreshold(-5));
        assertThrows(IllegalArgumentException.class, 
                () -> organisation.updateAtRiskThreshold(105));
    }

    @Test
    void shouldHaveProperEqualsAndHashCode() {
        Organisation org1 = OrganisationTestBuilder.organisation().withName("Same Name").build();
        Organisation org2 = OrganisationTestBuilder.organisation().withName("Same Name").build();
        Organisation org3 = OrganisationTestBuilder.organisation().withName("Different Name").build();

        // Since entities use ID and name for equality, those with same name are equal when both have null IDs
        assertEquals(org1, org2);
        assertNotEquals(org1, org3);
        
        // But toString should work
        assertNotNull(org1.toString());
        assertTrue(org1.toString().contains("Same Name"));
    }
}