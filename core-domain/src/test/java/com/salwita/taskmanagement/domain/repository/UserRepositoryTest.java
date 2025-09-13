package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.builder.OrganisationTestBuilder;
import com.salwita.taskmanagement.domain.builder.UserTestBuilder;
import com.salwita.taskmanagement.domain.entity.Organisation;
import com.salwita.taskmanagement.domain.entity.User;
import com.salwita.taskmanagement.domain.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class UserRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    private Organisation organisation;

    @BeforeEach
    void setUp() {
        organisation = OrganisationTestBuilder.organisation()
                .withName("Test Organization")
                .build();
        entityManager.persistAndFlush(organisation);
    }

    @Test
    void shouldFindByEmail() {
        // Given
        User user = UserTestBuilder.user()
                .withEmail("test@example.com")
                .withOrganisation(organisation)
                .build();
        entityManager.persistAndFlush(user);

        // When
        Optional<User> result = userRepository.findByEmail("test@example.com");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void shouldFindByOrganisationId() {
        // Given
        User user1 = UserTestBuilder.user()
                .withEmail("user1@example.com")
                .withOrganisation(organisation)
                .build();
        User user2 = UserTestBuilder.user()
                .withEmail("user2@example.com")
                .withOrganisation(organisation)
                .build();
        entityManager.persistAndFlush(user1);
        entityManager.persistAndFlush(user2);

        // When
        List<User> result = userRepository.findByOrganisationId(organisation.getId());

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).extracting(User::getEmail)
                .containsExactlyInAnyOrder("user1@example.com", "user2@example.com");
    }

    @Test
    void shouldFindByOrganisationIdAndRole() {
        // Given
        User pmUser = UserTestBuilder.user()
                .withEmail("pm@example.com")
                .withRole(Role.PM)
                .withOrganisation(organisation)
                .build();
        User teamMember = UserTestBuilder.user()
                .withEmail("team@example.com")
                .withRole(Role.TEAM_MEMBER)
                .withOrganisation(organisation)
                .build();
        entityManager.persistAndFlush(pmUser);
        entityManager.persistAndFlush(teamMember);

        // When
        List<User> pmUsers = userRepository.findByOrganisationIdAndRole(organisation.getId(), Role.PM);
        List<User> teamMembers = userRepository.findByOrganisationIdAndRole(organisation.getId(), Role.TEAM_MEMBER);

        // Then
        assertThat(pmUsers).hasSize(1);
        assertThat(pmUsers.get(0).getEmail()).isEqualTo("pm@example.com");
        
        assertThat(teamMembers).hasSize(1);
        assertThat(teamMembers.get(0).getEmail()).isEqualTo("team@example.com");
    }

    @Test
    void shouldFindActiveUsersByOrganisationId() {
        // Given
        User activeUser = UserTestBuilder.user()
                .withEmail("active@example.com")
                .withOrganisation(organisation)
                .build();
        User inactiveUser = UserTestBuilder.user()
                .withEmail("inactive@example.com")
                .withOrganisation(organisation)
                .build();
        inactiveUser.deactivate();
        
        entityManager.persistAndFlush(activeUser);
        entityManager.persistAndFlush(inactiveUser);

        // When
        List<User> result = userRepository.findActiveUsersByOrganisationId(organisation.getId());

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("active@example.com");
    }

    @Test
    void shouldCheckExistsByEmail() {
        // Given
        User user = UserTestBuilder.user()
                .withEmail("existing@example.com")
                .withOrganisation(organisation)
                .build();
        entityManager.persistAndFlush(user);

        // When
        boolean exists = userRepository.existsByEmail("existing@example.com");
        boolean notExists = userRepository.existsByEmail("nonexistent@example.com");

        // Then
        assertThat(exists).isTrue();
        assertThat(notExists).isFalse();
    }

    @Test
    void shouldCountActiveUsersByOrganisationId() {
        // Given
        User activeUser1 = UserTestBuilder.user()
                .withEmail("active1@example.com")
                .withOrganisation(organisation)
                .build();
        User activeUser2 = UserTestBuilder.user()
                .withEmail("active2@example.com")
                .withOrganisation(organisation)
                .build();
        User inactiveUser = UserTestBuilder.user()
                .withEmail("inactive@example.com")
                .withOrganisation(organisation)
                .build();
        inactiveUser.deactivate();
        
        entityManager.persistAndFlush(activeUser1);
        entityManager.persistAndFlush(activeUser2);
        entityManager.persistAndFlush(inactiveUser);

        // When
        long count = userRepository.countActiveUsersByOrganisationId(organisation.getId());

        // Then
        assertThat(count).isEqualTo(2);
    }

    @Test
    void shouldFindProjectManagersByOrganisationId() {
        // Given
        User pmoUser = UserTestBuilder.user()
                .withEmail("pmo@example.com")
                .withRole(Role.PMO)
                .withOrganisation(organisation)
                .build();
        User pmUser = UserTestBuilder.user()
                .withEmail("pm@example.com")
                .withRole(Role.PM)
                .withOrganisation(organisation)
                .build();
        User teamMember = UserTestBuilder.user()
                .withEmail("team@example.com")
                .withRole(Role.TEAM_MEMBER)
                .withOrganisation(organisation)
                .build();
        
        entityManager.persistAndFlush(pmoUser);
        entityManager.persistAndFlush(pmUser);
        entityManager.persistAndFlush(teamMember);

        // When
        List<User> result = userRepository.findProjectManagersByOrganisationId(organisation.getId());

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).extracting(User::getEmail)
                .containsExactlyInAnyOrder("pmo@example.com", "pm@example.com");
    }
}