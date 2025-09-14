package com.salwita.taskmanagement.scheduling.model;

import com.salwita.taskmanagement.domain.entity.Dependency;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Graph representation of project dependencies for scheduling calculations
 */
public class DependencyGraph {
    
    private final Map<SchedulableItem, Set<SchedulableItem>> adjacencyList;
    private final Map<SchedulableItem, Set<SchedulableItem>> reverseAdjacencyList;
    private final Map<SchedulableItem, Set<Dependency>> predecessorDependencies;
    private final Map<SchedulableItem, Set<Dependency>> successorDependencies;
    private final Set<SchedulableItem> nodes;
    
    public DependencyGraph() {
        this.adjacencyList = new ConcurrentHashMap<>();
        this.reverseAdjacencyList = new ConcurrentHashMap<>();
        this.predecessorDependencies = new ConcurrentHashMap<>();
        this.successorDependencies = new ConcurrentHashMap<>();
        this.nodes = ConcurrentHashMap.newKeySet();
    }
    
    public void addNode(SchedulableItem item) {
        nodes.add(item);
        adjacencyList.computeIfAbsent(item, k -> ConcurrentHashMap.newKeySet());
        reverseAdjacencyList.computeIfAbsent(item, k -> ConcurrentHashMap.newKeySet());
        predecessorDependencies.computeIfAbsent(item, k -> ConcurrentHashMap.newKeySet());
        successorDependencies.computeIfAbsent(item, k -> ConcurrentHashMap.newKeySet());
    }
    
    public void addEdge(SchedulableItem predecessor, SchedulableItem successor, Dependency dependency) {
        addNode(predecessor);
        addNode(successor);
        
        adjacencyList.get(predecessor).add(successor);
        reverseAdjacencyList.get(successor).add(predecessor);
        predecessorDependencies.get(successor).add(dependency);
        successorDependencies.get(predecessor).add(dependency);
    }
    
    public Set<SchedulableItem> getSuccessors(SchedulableItem item) {
        return adjacencyList.getOrDefault(item, Collections.emptySet());
    }
    
    public Set<SchedulableItem> getPredecessors(SchedulableItem item) {
        return reverseAdjacencyList.getOrDefault(item, Collections.emptySet());
    }
    
    public Set<Dependency> getPredecessorDependencies(SchedulableItem item) {
        return predecessorDependencies.getOrDefault(item, Collections.emptySet());
    }
    
    public Set<Dependency> getSuccessorDependencies(SchedulableItem item) {
        return successorDependencies.getOrDefault(item, Collections.emptySet());
    }
    
    public int getInDegree(SchedulableItem item) {
        return getPredecessors(item).size();
    }
    
    public int getOutDegree(SchedulableItem item) {
        return getSuccessors(item).size();
    }
    
    public Set<SchedulableItem> getAllItems() {
        return new HashSet<>(nodes);
    }
    
    public int size() {
        return nodes.size();
    }
    
    public boolean isEmpty() {
        return nodes.isEmpty();
    }
    
    public boolean containsItem(SchedulableItem item) {
        return nodes.contains(item);
    }
    
    /**
     * Find all items reachable from the given starting item (downstream)
     */
    public Set<SchedulableItem> getDownstreamItems(SchedulableItem startItem) {
        Set<SchedulableItem> visited = new HashSet<>();
        Set<SchedulableItem> downstream = new HashSet<>();
        
        traverseDownstream(startItem, visited, downstream);
        
        return downstream;
    }
    
    /**
     * Find all items that can reach the given item (upstream)
     */
    public Set<SchedulableItem> getUpstreamItems(SchedulableItem endItem) {
        Set<SchedulableItem> visited = new HashSet<>();
        Set<SchedulableItem> upstream = new HashSet<>();
        
        traverseUpstream(endItem, visited, upstream);
        
        return upstream;
    }
    
    private void traverseDownstream(SchedulableItem current, Set<SchedulableItem> visited, Set<SchedulableItem> result) {
        if (visited.contains(current)) {
            return;
        }
        
        visited.add(current);
        
        for (SchedulableItem successor : getSuccessors(current)) {
            result.add(successor);
            traverseDownstream(successor, visited, result);
        }
    }
    
    private void traverseUpstream(SchedulableItem current, Set<SchedulableItem> visited, Set<SchedulableItem> result) {
        if (visited.contains(current)) {
            return;
        }
        
        visited.add(current);
        
        for (SchedulableItem predecessor : getPredecessors(current)) {
            result.add(predecessor);
            traverseUpstream(predecessor, visited, result);
        }
    }
    
    /**
     * Check if there's a path from source to target
     */
    public boolean hasPath(SchedulableItem source, SchedulableItem target) {
        if (source.equals(target)) {
            return true;
        }
        
        Set<SchedulableItem> visited = new HashSet<>();
        return dfsPath(source, target, visited);
    }
    
    private boolean dfsPath(SchedulableItem current, SchedulableItem target, Set<SchedulableItem> visited) {
        if (visited.contains(current)) {
            return false;
        }
        
        visited.add(current);
        
        for (SchedulableItem successor : getSuccessors(current)) {
            if (successor.equals(target) || dfsPath(successor, target, visited)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get items with no predecessors (starting points)
     */
    public Set<SchedulableItem> getRootItems() {
        return nodes.stream()
                .filter(item -> getInDegree(item) == 0)
                .collect(HashSet::new, Set::add, Set::addAll);
    }
    
    /**
     * Get items with no successors (end points)  
     */
    public Set<SchedulableItem> getLeafItems() {
        return nodes.stream()
                .filter(item -> getOutDegree(item) == 0)
                .collect(HashSet::new, Set::add, Set::addAll);
    }
    
    /**
     * Create a subgraph containing only the specified items
     */
    public DependencyGraph createSubgraph(Set<SchedulableItem> items) {
        DependencyGraph subgraph = new DependencyGraph();
        
        // Add nodes
        for (SchedulableItem item : items) {
            if (nodes.contains(item)) {
                subgraph.addNode(item);
            }
        }
        
        // Add edges between included nodes
        for (SchedulableItem item : items) {
            if (nodes.contains(item)) {
                for (Dependency dependency : getSuccessorDependencies(item)) {
                    SchedulableItem successor = getSuccessorFromDependency(dependency);
                    if (items.contains(successor)) {
                        subgraph.addEdge(item, successor, dependency);
                    }
                }
            }
        }
        
        return subgraph;
    }
    
    private SchedulableItem getSuccessorFromDependency(Dependency dependency) {
        if (dependency.getSuccessorActivity() != null) {
            return new ActivitySchedulableItem(dependency.getSuccessorActivity());
        } else if (dependency.getSuccessorTask() != null) {
            return new TaskSchedulableItem(dependency.getSuccessorTask());
        }
        return null;
    }
}