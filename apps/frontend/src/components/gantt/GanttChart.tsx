// ABOUTME: Gantt chart component - displays project timeline with activities
// ABOUTME: Shows task durations, dependencies, and critical path

import React, { useMemo } from "react";

export interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  isCritical?: boolean;
  dependencies?: string[]; // IDs of predecessor tasks
}

interface GanttChartProps {
  tasks: GanttTask[];
  onTaskClick?: (task: GanttTask) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onTaskClick,
}) => {
  const { startDate, endDate, daysCount } = useMemo(() => {
    if (tasks.length === 0) {
      return { startDate: new Date(), endDate: new Date(), daysCount: 1 };
    }

    const allDates = tasks.flatMap((t) => [
      new Date(t.startDate),
      new Date(t.endDate),
    ]);
    const start = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const end = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { startDate: start, endDate: end, daysCount: Math.max(days, 1) };
  }, [tasks]);

  const taskHeight = 40;
  const headerHeight = 80;
  const cellWidth = 40;
  const labelWidth = 200;

  const calculatePosition = (date: Date) => {
    const days = Math.floor(
      (new Date(date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days * cellWidth;
  };

  // Generate month headers
  const monthHeaders: { month: string; start: number; width: number }[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const monthStart = calculatePosition(new Date(currentDate));
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      daysInMonth
    );

    const monthEndPos = Math.min(
      calculatePosition(monthEnd) + cellWidth,
      daysCount * cellWidth
    );

    monthHeaders.push({
      month: currentDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      start: monthStart,
      width: monthEndPos - monthStart,
    });

    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <div className="flex">
        {/* Left panel - Task names */}
        <div style={{ width: labelWidth }} className="border-r border-gray-200">
          <div style={{ height: headerHeight }} className="border-b border-gray-200 bg-gray-50 p-2 font-semibold text-gray-900">
            Tasks
          </div>
          <div style={{ height: tasks.length * taskHeight }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{ height: taskHeight }}
                className="border-b border-gray-200 p-2 flex items-center text-sm truncate cursor-pointer hover:bg-blue-50"
                onClick={() => onTaskClick?.(task)}
              >
                <span className="truncate">{task.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - Timeline */}
        <div style={{ overflowX: "auto" }}>
          {/* Month headers */}
          <div style={{ height: 40, display: "flex", borderBottom: "1px solid #e5e7eb" }} className="bg-gray-50">
            {monthHeaders.map((month, idx) => (
              <div
                key={idx}
                style={{ width: month.width, left: month.start }}
                className="border-r border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700"
              >
                {month.month}
              </div>
            ))}
          </div>

          {/* Week headers and grid */}
          <div style={{ height: 40, display: "flex", borderBottom: "1px solid #e5e7eb" }}>
            {Array.from({ length: daysCount }).map((_, dayIdx) => {
              const dayDate = new Date(startDate);
              dayDate.setDate(dayDate.getDate() + dayIdx);
              return (
                <div
                  key={dayIdx}
                  style={{ width: cellWidth }}
                  className="border-r border-gray-300 text-xs text-gray-600 flex items-center justify-center"
                >
                  {dayDate.getDate()}
                </div>
              );
            })}
          </div>

          {/* Tasks and bars */}
          <div style={{ height: tasks.length * taskHeight }}>
            {tasks.map((task) => {
              const startPos = calculatePosition(new Date(task.startDate));
              const endPos = calculatePosition(new Date(task.endDate));
              const barWidth = Math.max(endPos - startPos, 20);

              return (
                <div
                  key={task.id}
                  style={{ height: taskHeight }}
                  className="border-b border-gray-200 relative"
                >
                  {/* Grid background */}
                  <div style={{ display: "flex", height: "100%" }}>
                    {Array.from({ length: daysCount }).map((_, dayIdx) => (
                      <div
                        key={dayIdx}
                        style={{ width: cellWidth }}
                        className="border-r border-gray-300 flex-shrink-0"
                      />
                    ))}
                  </div>

                  {/* Task bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: startPos,
                      width: barWidth,
                      height: 24,
                      transform: "translateY(-50%)",
                      backgroundColor: task.isCritical ? "#ef4444" : "#3b82f6",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    className="hover:opacity-80 transition-opacity"
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* Progress indicator */}
                    <div
                      style={{
                        width: `${task.progress}%`,
                        height: "100%",
                        backgroundColor: task.isCritical ? "#991b1b" : "#1e40af",
                        borderRadius: "4px",
                      }}
                    />
                  </div>

                  {/* Dependency lines (simple visualization) */}
                  {task.dependencies?.map((_depId, depIdx) => (
                    <div
                      key={depIdx}
                      style={{
                        position: "absolute",
                        width: 2,
                        height: 2,
                        backgroundColor: "#fbbf24",
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-sm text-gray-600 flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Regular Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-900 rounded"></div>
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
};
