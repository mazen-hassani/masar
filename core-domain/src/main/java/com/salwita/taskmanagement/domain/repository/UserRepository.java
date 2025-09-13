package com.salwita.taskmanagement.domain.repository;

import com.salwita.taskmanagement.domain.entity.User;
import com.salwita.taskmanagement.domain.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByOrganisationId(Long organisationId);

    List<User> findByOrganisationIdAndRole(Long organisationId, Role role);

    List<User> findByRole(Role role);

    @Query("SELECT u FROM User u WHERE u.organisation.id = :organisationId AND u.isActive = true")
    List<User> findActiveUsersByOrganisationId(@Param("organisationId") Long organisationId);

    @Query("SELECT u FROM User u WHERE u.organisation.id = :organisationId AND u.role = :role AND u.isActive = true")
    List<User> findActiveUsersByOrganisationIdAndRole(@Param("organisationId") Long organisationId, @Param("role") Role role);

    @Query("SELECT u FROM User u WHERE u.organisation.id = :organisationId AND " +
           "(LOWER(u.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<User> findByOrganisationIdAndSearchTerm(@Param("organisationId") Long organisationId, 
                                                  @Param("searchTerm") String searchTerm, 
                                                  Pageable pageable);

    boolean existsByEmail(String email);

    @Query("SELECT COUNT(u) FROM User u WHERE u.organisation.id = :organisationId AND u.isActive = true")
    long countActiveUsersByOrganisationId(@Param("organisationId") Long organisationId);

    @Query("SELECT u FROM User u WHERE u.role IN ('PMO', 'PM') AND u.organisation.id = :organisationId AND u.isActive = true")
    List<User> findProjectManagersByOrganisationId(@Param("organisationId") Long organisationId);
}