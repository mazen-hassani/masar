package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.ProjectBaseline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectBaselineRepository extends JpaRepository<ProjectBaseline, Long> {

    List<ProjectBaseline> findByProjectId(Long projectId);

    @Query("SELECT pb FROM ProjectBaseline pb WHERE pb.project.id = :projectId ORDER BY pb.version DESC")
    List<ProjectBaseline> findByProjectIdOrderByVersionDesc(@Param("projectId") Long projectId);

    @Query("SELECT pb FROM ProjectBaseline pb WHERE pb.project.id = :projectId AND pb.isCurrent = true")
    Optional<ProjectBaseline> findCurrentBaselineByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT pb FROM ProjectBaseline pb WHERE pb.project.id = :projectId AND pb.version = :version")
    Optional<ProjectBaseline> findByProjectIdAndVersion(@Param("projectId") Long projectId, @Param("version") Integer version);

    @Query("SELECT pb FROM ProjectBaseline pb WHERE pb.project.id = :projectId AND pb.name = :name")
    Optional<ProjectBaseline> findByProjectIdAndName(@Param("projectId") Long projectId, @Param("name") String name);

    @Query("SELECT MAX(pb.version) FROM ProjectBaseline pb WHERE pb.project.id = :projectId")
    Optional<Integer> findMaxVersionByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT COUNT(pb) FROM ProjectBaseline pb WHERE pb.project.id = :projectId")
    long countByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT pb FROM ProjectBaseline pb WHERE pb.createdByUser.id = :userId")
    List<ProjectBaseline> findByCreatedByUserId(@Param("userId") Long userId);

    @Query("SELECT pb FROM ProjectBaseline pb WHERE pb.project.organisation.id = :organisationId")
    List<ProjectBaseline> findByOrganisationId(@Param("organisationId") Long organisationId);

    boolean existsByProjectIdAndName(Long projectId, String name);
}