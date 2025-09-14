package com.salwita.taskmanagement.scheduling.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of schedule optimization showing original vs optimized results
 */
public class ScheduleOptimizationResult {
    
    private ScheduleResult originalResult;
    private ScheduleResult optimizedResult;
    private String bestStrategy;
    private boolean improvementFound;
    private List<String> failedStrategies;
    
    public ScheduleOptimizationResult() {
        this.improvementFound = false;
        this.failedStrategies = new ArrayList<>();
    }
    
    public ScheduleResult getOriginalResult() {
        return originalResult;
    }
    
    public void setOriginalResult(ScheduleResult originalResult) {
        this.originalResult = originalResult;
    }
    
    public ScheduleResult getOptimizedResult() {
        return optimizedResult;
    }
    
    public void setOptimizedResult(ScheduleResult optimizedResult) {
        this.optimizedResult = optimizedResult;
    }
    
    public String getBestStrategy() {
        return bestStrategy;
    }
    
    public void setBestStrategy(String bestStrategy) {
        this.bestStrategy = bestStrategy;
    }
    
    public boolean isImprovementFound() {
        return improvementFound;
    }
    
    public void setImprovementFound(boolean improvementFound) {
        this.improvementFound = improvementFound;
    }
    
    public List<String> getFailedStrategies() {
        return failedStrategies;
    }
    
    public void setFailedStrategies(List<String> failedStrategies) {
        this.failedStrategies = failedStrategies;
    }
    
    public long getTimeImprovement() {
        if (originalResult == null || optimizedResult == null || !improvementFound) {
            return 0;
        }
        return originalResult.getTotalTime() - optimizedResult.getTotalTime();
    }
    
    public double getImprovementPercentage() {
        if (originalResult == null || optimizedResult == null || !improvementFound || originalResult.getTotalTime() == 0) {
            return 0.0;
        }
        return ((double) getTimeImprovement() / originalResult.getTotalTime()) * 100.0;
    }
    
    @Override
    public String toString() {
        return "ScheduleOptimizationResult{" +
               "improvementFound=" + improvementFound +
               ", bestStrategy='" + bestStrategy + '\'' +
               ", timeImprovement=" + getTimeImprovement() + "ms" +
               ", improvementPercentage=" + String.format("%.2f%%", getImprovementPercentage()) +
               ", failedStrategies=" + failedStrategies.size() +
               '}';
    }
}