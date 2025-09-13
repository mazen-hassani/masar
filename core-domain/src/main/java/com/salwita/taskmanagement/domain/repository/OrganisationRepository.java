package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.Organisation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganisationRepository extends JpaRepository<Organisation, Long> {

    Optional<Organisation> findByName(String name);

    @Query("SELECT o FROM Organisation o WHERE LOWER(o.name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Optional<Organisation> findByNameContainingIgnoreCase(@Param("searchTerm") String searchTerm);

    boolean existsByName(String name);

    @Query("SELECT COUNT(o) FROM Organisation o")
    long countAllOrganisations();
}