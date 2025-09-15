import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DependencyType } from './DependencyManager';

interface TaskPosition {
  id: string | number;
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  endX: number;
}

interface VisualDependency {
  id: string;
  predecessorId: string | number;
  successorId: string | number;
  type: DependencyType;
  lag: number;
  isHighlighted?: boolean;
  isConflicted?: boolean;
}

interface DependencyVisualizationProps {
  dependencies: VisualDependency[];
  ganttContainerRef: React.RefObject<HTMLElement | null>;
  selectedTaskId?: string | number;
  onDependencyClick?: (dependencyId: string) => void;
  onDependencyHover?: (dependencyId: string | null) => void;
  isVisible: boolean;
}

interface DependencyPath {
  id: string;
  path: string;
  arrowPath: string;
  labelX: number;
  labelY: number;
  type: DependencyType;
  isHighlighted: boolean;
  isConflicted: boolean;
  lag: number;
}

export const DependencyVisualization: React.FC<DependencyVisualizationProps> = ({
  dependencies,
  ganttContainerRef,
  selectedTaskId,
  onDependencyClick,
  onDependencyHover,
  isVisible
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [taskPositions, setTaskPositions] = useState<Map<string, TaskPosition>>(new Map());
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);
  const [hoveredDependency, setHoveredDependency] = useState<string | null>(null);

  // Update task positions when Gantt chart changes
  useEffect(() => {
    if (!ganttContainerRef.current || !isVisible) return;

    const updatePositions = () => {
      const container = ganttContainerRef.current;
      if (!container) return;

      const taskElements = container.querySelectorAll('.bar-wrapper');
      const newPositions = new Map<string, TaskPosition>();
      const containerRect = container.getBoundingClientRect();
      
      setContainerBounds(containerRect);

      taskElements.forEach((element) => {
        const taskElement = element as HTMLElement;
        const taskId = taskElement.getAttribute('data-id') || taskElement.id;
        
        if (taskId) {
          const rect = taskElement.getBoundingClientRect();
          const barElement = taskElement.querySelector('.bar');
          const barRect = barElement?.getBoundingClientRect();
          
          if (barRect) {
            newPositions.set(taskId, {
              id: taskId,
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height,
              startX: barRect.left - containerRect.left,
              endX: barRect.right - containerRect.left
            });
          }
        }
      });

      setTaskPositions(newPositions);
    };

    // Initial update
    updatePositions();

    // Create observer for position changes
    const observer = new MutationObserver(updatePositions);
    observer.observe(ganttContainerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'transform']
    });

    // Handle scroll and resize
    const handleUpdate = () => requestAnimationFrame(updatePositions);
    const container = ganttContainerRef.current;
    
    container.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [ganttContainerRef, isVisible, dependencies]);

  // Calculate dependency paths
  const dependencyPaths = useMemo(() => {
    if (!containerBounds || taskPositions.size === 0) return [];

    return dependencies.map(dep => {
      const predPos = taskPositions.get(dep.predecessorId.toString());
      const succPos = taskPositions.get(dep.successorId.toString());

      if (!predPos || !succPos) return null;

      const isHighlighted = dep.isHighlighted || 
        hoveredDependency === dep.id ||
        selectedTaskId?.toString() === dep.predecessorId.toString() ||
        selectedTaskId?.toString() === dep.successorId.toString();

      const isConflicted = dep.isConflicted || false;

      // Calculate connection points based on dependency type
      let startPoint: { x: number; y: number };
      let endPoint: { x: number; y: number };

      switch (dep.type) {
        case DependencyType.FS: // Finish to Start
          startPoint = {
            x: predPos.endX,
            y: predPos.y + predPos.height / 2
          };
          endPoint = {
            x: succPos.startX,
            y: succPos.y + succPos.height / 2
          };
          break;

        case DependencyType.SS: // Start to Start
          startPoint = {
            x: predPos.startX,
            y: predPos.y + predPos.height / 2
          };
          endPoint = {
            x: succPos.startX,
            y: succPos.y + succPos.height / 2
          };
          break;

        case DependencyType.FF: // Finish to Finish
          startPoint = {
            x: predPos.endX,
            y: predPos.y + predPos.height / 2
          };
          endPoint = {
            x: succPos.endX,
            y: succPos.y + succPos.height / 2
          };
          break;

        case DependencyType.SF: // Start to Finish
          startPoint = {
            x: predPos.startX,
            y: predPos.y + predPos.height / 2
          };
          endPoint = {
            x: succPos.endX,
            y: succPos.y + succPos.height / 2
          };
          break;

        default:
          startPoint = { x: predPos.endX, y: predPos.y + predPos.height / 2 };
          endPoint = { x: succPos.startX, y: succPos.y + succPos.height / 2 };
      }

      // Create smooth curved path
      const path = createDependencyPath(startPoint, endPoint, dep.type, dep.lag);
      const arrowPath = createArrowPath(endPoint, startPoint, dep.type);

      // Calculate label position (midpoint of path)
      const labelX = (startPoint.x + endPoint.x) / 2;
      const labelY = (startPoint.y + endPoint.y) / 2 - 10;

      return {
        id: dep.id,
        path,
        arrowPath,
        labelX,
        labelY,
        type: dep.type,
        isHighlighted,
        isConflicted,
        lag: dep.lag
      } as DependencyPath;
    }).filter(Boolean) as DependencyPath[];
  }, [dependencies, taskPositions, containerBounds, hoveredDependency, selectedTaskId]);

  // Create SVG path for dependency line
  const createDependencyPath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    type: DependencyType,
    lag: number
  ): string => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    // Add curves for better visual appeal
    const midX = start.x + dx * 0.5;
    const controlOffset = Math.min(Math.abs(dx) * 0.3, 50);

    if (Math.abs(dy) < 10) {
      // Horizontal line with slight curve
      return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y} ${end.x - controlOffset} ${end.y} ${end.x} ${end.y}`;
    } else {
      // Curved path for different row tasks
      const control1X = start.x + Math.min(controlOffset, Math.abs(dx) * 0.5);
      const control2X = end.x - Math.min(controlOffset, Math.abs(dx) * 0.5);
      
      return `M ${start.x} ${start.y} C ${control1X} ${start.y} ${control2X} ${end.y} ${end.x} ${end.y}`;
    }
  };

  // Create arrow marker path
  const createArrowPath = (
    end: { x: number; y: number },
    start: { x: number; y: number },
    type: DependencyType
  ): string => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowLength = 8;
    const arrowWidth = 4;

    const x1 = end.x - arrowLength * Math.cos(angle - Math.PI / 6);
    const y1 = end.y - arrowLength * Math.sin(angle - Math.PI / 6);
    const x2 = end.x - arrowLength * Math.cos(angle + Math.PI / 6);
    const y2 = end.y - arrowLength * Math.sin(angle + Math.PI / 6);

    return `M ${end.x} ${end.y} L ${x1} ${y1} M ${end.x} ${end.y} L ${x2} ${y2}`;
  };

  // Get color for dependency based on state
  const getDependencyColor = (path: DependencyPath): string => {
    if (path.isConflicted) return '#ef4444'; // red for conflicts
    if (path.isHighlighted) return '#3b82f6'; // blue for highlighted
    
    // Color by dependency type
    switch (path.type) {
      case DependencyType.FS: return '#6b7280'; // gray
      case DependencyType.SS: return '#059669'; // green
      case DependencyType.FF: return '#d97706'; // orange
      case DependencyType.SF: return '#dc2626'; // red
      default: return '#6b7280';
    }
  };

  // Get stroke width based on state
  const getStrokeWidth = (path: DependencyPath): number => {
    if (path.isHighlighted) return 3;
    if (path.isConflicted) return 2;
    return 1.5;
  };

  // Handle dependency interactions
  const handleDependencyClick = (dependencyId: string) => {
    if (onDependencyClick) {
      onDependencyClick(dependencyId);
    }
  };

  const handleDependencyMouseEnter = (dependencyId: string) => {
    setHoveredDependency(dependencyId);
    if (onDependencyHover) {
      onDependencyHover(dependencyId);
    }
  };

  const handleDependencyMouseLeave = () => {
    setHoveredDependency(null);
    if (onDependencyHover) {
      onDependencyHover(null);
    }
  };

  if (!isVisible || !containerBounds || dependencyPaths.length === 0) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-10"
      style={{ 
        width: containerBounds.width,
        height: containerBounds.height 
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          {/* Arrow markers for different dependency types */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#6b7280"
            />
          </marker>
          
          <marker
            id="arrowhead-highlighted"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#3b82f6"
            />
          </marker>
          
          <marker
            id="arrowhead-conflict"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#ef4444"
            />
          </marker>
        </defs>

        {dependencyPaths.map((path) => {
          const color = getDependencyColor(path);
          const strokeWidth = getStrokeWidth(path);
          const markerId = path.isConflicted ? 'arrowhead-conflict' :
                          path.isHighlighted ? 'arrowhead-highlighted' : 'arrowhead';

          return (
            <g key={path.id}>
              {/* Main dependency line */}
              <path
                d={path.path}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={path.type === DependencyType.SF ? '5,5' : undefined}
                markerEnd={`url(#${markerId})`}
                style={{ 
                  pointerEvents: 'stroke',
                  cursor: 'pointer',
                  opacity: path.isHighlighted ? 1 : 0.7
                }}
                onClick={() => handleDependencyClick(path.id)}
                onMouseEnter={() => handleDependencyMouseEnter(path.id)}
                onMouseLeave={handleDependencyMouseLeave}
              />

              {/* Lag indicator */}
              {path.lag !== 0 && (
                <g>
                  <circle
                    cx={path.labelX}
                    cy={path.labelY}
                    r="12"
                    fill="white"
                    stroke={color}
                    strokeWidth="1"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={path.labelX}
                    y={path.labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fill={color}
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {path.lag > 0 ? `+${path.lag}` : path.lag}
                  </text>
                </g>
              )}

              {/* Dependency type indicator (when highlighted) */}
              {path.isHighlighted && (
                <g>
                  <rect
                    x={path.labelX - 15}
                    y={path.labelY + 15}
                    width="30"
                    height="16"
                    rx="8"
                    fill={color}
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={path.labelX}
                    y={path.labelY + 23}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fill="white"
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                  >
                    {path.type}
                  </text>
                </g>
              )}

              {/* Invisible wider stroke for easier clicking */}
              <path
                d={path.path}
                stroke="transparent"
                strokeWidth="8"
                fill="none"
                style={{ 
                  pointerEvents: 'stroke',
                  cursor: 'pointer'
                }}
                onClick={() => handleDependencyClick(path.id)}
                onMouseEnter={() => handleDependencyMouseEnter(path.id)}
                onMouseLeave={handleDependencyMouseLeave}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Utility component for dependency legend
export const DependencyLegend: React.FC<{
  className?: string;
  showTypes?: boolean;
}> = ({ className = '', showTypes = true }) => {
  return (
    <div className={`bg-white p-3 rounded-lg border border-gray-200 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-800 mb-2">Dependency Legend</h4>
      
      {showTypes && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-6 h-0.5 bg-gray-600"></div>
            <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">FS</span>
            <span>Finish to Start</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-6 h-0.5 bg-green-600"></div>
            <span className="bg-green-100 px-2 py-1 rounded text-green-700">SS</span>
            <span>Start to Start</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-6 h-0.5 bg-orange-600"></div>
            <span className="bg-orange-100 px-2 py-1 rounded text-orange-700">FF</span>
            <span>Finish to Finish</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-6 h-0.5 bg-red-600 border-dashed border-t"></div>
            <span className="bg-red-100 px-2 py-1 rounded text-red-700">SF</span>
            <span>Start to Finish</span>
          </div>
        </div>
      )}
      
      <div className="space-y-2 border-t border-gray-200 pt-2">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-6 h-0.5 bg-blue-600"></div>
          <span>Highlighted</span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-6 h-0.5 bg-red-500"></div>
          <span>Conflicts</span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-3 h-3 border-2 border-gray-600 rounded-full bg-white flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">±</span>
          </div>
          <span>Lag/Lead time</span>
        </div>
      </div>
    </div>
  );
};