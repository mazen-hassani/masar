package com.salwita.taskmanagement.security;

import com.salwita.taskmanagement.domain.enums.Role;
import com.salwita.taskmanagement.security.annotations.RequireProjectAccess;
import com.salwita.taskmanagement.security.annotations.RequireRole;
import com.salwita.taskmanagement.service.SecurityService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Arrays;

@Aspect
@Component
public class SecurityAspect {

    @Autowired
    private SecurityService securityService;

    @Before("@annotation(requireRole)")
    public void checkRoleAccess(JoinPoint joinPoint, RequireRole requireRole) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new AccessDeniedException("Authentication required");
        }

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Role userRole = userPrincipal.getRole();

        boolean hasRequiredRole = Arrays.asList(requireRole.value()).contains(userRole);
        if (!hasRequiredRole) {
            throw new AccessDeniedException(requireRole.message());
        }
    }

    @Before("@annotation(requireProjectAccess)")
    public void checkProjectAccess(JoinPoint joinPoint, RequireProjectAccess requireProjectAccess) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new AccessDeniedException("Authentication required");
        }

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long projectId = extractProjectId(joinPoint, requireProjectAccess.projectIdParam());

        if (projectId == null) {
            throw new AccessDeniedException("Project ID not found in method parameters");
        }

        boolean hasAccess = securityService.hasProjectAccess(
            userPrincipal.getId(), 
            projectId, 
            userPrincipal.getRole(),
            requireProjectAccess.allowProjectManager(),
            requireProjectAccess.allowTeamMember(),
            requireProjectAccess.allowClient()
        );

        if (!hasAccess) {
            throw new AccessDeniedException(requireProjectAccess.message());
        }
    }

    private Long extractProjectId(JoinPoint joinPoint, String paramName) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Parameter[] parameters = method.getParameters();
        Object[] args = joinPoint.getArgs();

        for (int i = 0; i < parameters.length; i++) {
            if (parameters[i].getName().equals(paramName)) {
                Object arg = args[i];
                if (arg instanceof Long) {
                    return (Long) arg;
                } else if (arg instanceof String) {
                    return Long.parseLong((String) arg);
                }
            }
        }

        return null;
    }
}