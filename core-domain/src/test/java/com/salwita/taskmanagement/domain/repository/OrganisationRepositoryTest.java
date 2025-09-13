package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.builder.OrganisationTestBuilder;
import com.salwita.taskmanagement.domain.entity.Organisation;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OrganisationRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Test
    void shouldFindByName() {
        // Given
        Organisation organisation = OrganisationTestBuilder.organisation()
                .withName("Test Organization")
                .build();
        entityManager.persistAndFlush(organisation);

        // When
        Optional<Organisation> result = organisationRepository.findByName("Test Organization");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Test Organization");
    }

    @Test
    void shouldNotFindByNonExistentName() {
        // When
        Optional<Organisation> result = organisationRepository.findByName("Non-existent Organization");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    void shouldFindByNameContainingIgnoreCase() {
        // Given
        Organisation organisation = OrganisationTestBuilder.organisation()
                .withName("Test Organization Inc")
                .build();
        entityManager.persistAndFlush(organisation);

        // When
        Optional<Organisation> result = organisationRepository.findByNameContainingIgnoreCase("organization");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Test Organization Inc");
    }

    @Test
    void shouldCheckExistsByName() {
        // Given
        Organisation organisation = OrganisationTestBuilder.organisation()
                .withName("Existing Organization")
                .build();
        entityManager.persistAndFlush(organisation);

        // When
        boolean exists = organisationRepository.existsByName("Existing Organization");
        boolean notExists = organisationRepository.existsByName("Non-existent Organization");

        // Then
        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }

    @Test
    void shouldCountAllOrganisations() {
        // Given
        Organisation org1 = OrganisationTestBuilder.organisation()
                .withName("Organization 1")
                .build();
        Organisation org2 = OrganisationTestBuilder.organisation()
                .withName("Organization 2")
                .build();
        entityManager.persistAndFlush(org1);
        entityManager.persistAndFlush(org2);

        // When
        long count = organisationRepository.countAllOrganisations();

        // Then
        assertThat(count).isEqualTo(2);
    }
}