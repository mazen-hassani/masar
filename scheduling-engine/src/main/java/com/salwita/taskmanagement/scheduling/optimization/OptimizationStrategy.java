package com.salwita.taskmanagement.scheduling.optimization;

import com.salwita.taskmanagement.domain.entity.Project;

/**
 * Interface for schedule optimization strategies
 */
public interface OptimizationStrategy {
    
    /**
     * Apply optimization strategy to the project
     */
    void apply(Project project);
    
    /**
     * Get the name of this optimization strategy
     */
    String getName();
    
    /**
     * Get description of what this strategy does
     */
    String getDescription();
}