package com.salwita.taskmanagement.security.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireProjectAccess {
    
    String projectIdParam() default "projectId";
    
    boolean allowProjectManager() default true;
    
    boolean allowTeamMember() default false;
    
    boolean allowClient() default false;
    
    String message() default "Access denied: insufficient project permissions";
}