package com.salwita.taskmanagement.service;

import com.salwita.taskmanagement.domain.entity.Project;
import com.salwita.taskmanagement.domain.entity.User;
import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.domain.repository.ProjectRepository;
import com.salwita.taskmanagement.domain.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class SecurityService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    public boolean hasProjectAccess(Long userId, Long projectId, Role userRole, 
                                  boolean allowProjectManager, boolean allowTeamMember, boolean allowClient) {
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return false;
        }

        User user = userOpt.get();
        
        // PMO always has access
        if (user.getRole() == Role.PMO) {
            return true;
        }

        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return false;
        }

        Project project = projectOpt.get();
        
        // Check if user belongs to the same organisation as the project
        if (!user.getOrganisation().getId().equals(project.getOrganisation().getId())) {
            return false;
        }

        // Check role-specific permissions
        switch (user.getRole()) {
            case PM:
                if (!allowProjectManager) {
                    return false;
                }
                // PM can access projects they are assigned to manage
                return project.getAssignedPmUser() != null && 
                       project.getAssignedPmUser().getId().equals(userId);
                       
            case TEAM_MEMBER:
                if (!allowTeamMember) {
                    return false;
                }
                // Team members can access projects where they have assigned tasks
                // This would require checking activity/task assignments
                return isUserAssignedToProject(userId, projectId);
                
            case CLIENT:
                if (!allowClient) {
                    return false;
                }
                // Clients can typically only view projects, depending on business rules
                return true;
                
            default:
                return false;
        }
    }

    private boolean isUserAssignedToProject(Long userId, Long projectId) {
        // This would check if the user has any tasks assigned in the project
        // For now, we'll implement a basic check - in a real application,
        // this would query the tasks table for assignments
        return true; // Simplified for now - implement based on task assignments
    }

    public boolean canManageProject(Long userId, Long projectId) {
        return hasProjectAccess(userId, projectId, null, true, false, false);
    }

    public boolean canViewProject(Long userId, Long projectId) {
        return hasProjectAccess(userId, projectId, null, true, true, true);
    }

    public boolean canEditProject(Long userId, Long projectId) {
        return hasProjectAccess(userId, projectId, null, true, false, false);
    }

    public boolean canDeleteProject(Long userId, Long projectId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return false;
        }

        User user = userOpt.get();
        
        // Only PMO can delete projects
        return user.getRole() == Role.PMO;
    }

    public boolean canManageUsers(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return false;
        }

        User user = userOpt.get();
        
        // Only PMO can manage users
        return user.getRole() == Role.PMO;
    }

    public boolean canCreateProject(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return false;
        }

        User user = userOpt.get();
        
        // PMO and PM can create projects
        return user.getRole() == Role.PMO || user.getRole() == Role.PM;
    }
}