package com.salwita.taskmanagement.scheduling.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
@ComponentScan(basePackages = "com.salwita.taskmanagement.scheduling")
public class SchedulingConfig {
}