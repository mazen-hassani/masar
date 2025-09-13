package com.salwita.taskmanagement.domain.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class SimpleRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private DependencyRepository dependencyRepository;

    @Autowired
    private ProjectBaselineRepository projectBaselineRepository;

    @Autowired
    private BaselineSnapshotRepository baselineSnapshotRepository;

    @Test
    void shouldInjectAllRepositories() {
        assertThat(organisationRepository).isNotNull();
        assertThat(userRepository).isNotNull();
        assertThat(projectRepository).isNotNull();
        assertThat(activityRepository).isNotNull();
        assertThat(taskRepository).isNotNull();
        assertThat(dependencyRepository).isNotNull();
        assertThat(projectBaselineRepository).isNotNull();
        assertThat(baselineSnapshotRepository).isNotNull();
    }

    @Test
    void shouldProvideBasicCrudOperations() {
        assertThat(organisationRepository.count()).isEqualTo(0);
        assertThat(userRepository.count()).isEqualTo(0);
        assertThat(projectRepository.count()).isEqualTo(0);
        assertThat(activityRepository.count()).isEqualTo(0);
        assertThat(taskRepository.count()).isEqualTo(0);
        assertThat(dependencyRepository.count()).isEqualTo(0);
        assertThat(projectBaselineRepository.count()).isEqualTo(0);
        assertThat(baselineSnapshotRepository.count()).isEqualTo(0);
    }
}