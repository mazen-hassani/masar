package com.salwita.taskmanagement.security.annotations;

import com.salwita.taskmanagement.domain.enums.Role;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRole {
    Role[] value();
    
    String message() default "Access denied: insufficient role permissions";
}