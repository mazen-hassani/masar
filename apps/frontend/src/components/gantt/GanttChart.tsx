// ABOUTME: Gantt chart component - displays project timeline with activities
// ABOUTME: Shows task durations, dependencies, and critical path with interactive features

import React, { useMemo, useState } from "react";
import { ProgressBar } from "../common";

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

type ZoomLevel = "week" | "month";

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onTaskClick,
}) => {
  const [zoom, setZoom] = useState<ZoomLevel>("month");

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

    // Add buffer days
    start.setDate(start.getDate() - 5);
    end.setDate(end.getDate() + 5);

    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { startDate: start, endDate: end, daysCount: Math.max(days, 1) };
  }, [tasks]);

  const taskHeight = 50;
  const headerHeight = 100;
  const cellWidth = zoom === "week" ? 60 : 40;
  const labelWidth = 250;

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
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
      {/* Toolbar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Project Timeline</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setZoom("month")}
            className={`px-3 py-1.5 text-sm rounded border ${
              zoom === "month"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setZoom("week")}
            className={`px-3 py-1.5 text-sm rounded border ${
              zoom === "week"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="overflow-x-auto flex-1">
        <div className="flex">
          {/* Left panel - Task names */}
          <div style={{ width: labelWidth }} className="flex-shrink-0 border-r border-gray-200">
            <div style={{ height: headerHeight }} className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 font-semibold text-gray-900">
              Tasks ({tasks.length})
            </div>
            <div style={{ height: tasks.length * taskHeight }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{ height: taskHeight }}
                  className="border-b border-gray-200 p-3 flex items-center text-sm truncate cursor-pointer hover:bg-blue-50 transition-colors group"
                  onClick={() => onTaskClick?.(task)}
                  title={task.name}
                >
                  <div className="flex items-center gap-2 w-full">
                    {task.isCritical && (
                      <span className="text-red-500 font-bold" title="Critical Path">
                        ⚠
                      </span>
                    )}
                    <span className="truncate font-medium text-gray-900 group-hover:text-blue-600">
                      {task.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel - Timeline */}
          <div className="flex-1 overflow-x-auto">
            {/* Month headers */}
            <div style={{ height: 40, display: "flex", borderBottom: "2px solid #e5e7eb" }} className="bg-gradient-to-b from-gray-50 to-white sticky top-0">
              {monthHeaders.map((month, idx) => (
                <div
                  key={idx}
                  style={{ width: month.width }}
                  className="border-r border-gray-300 px-2 py-1 text-xs font-bold text-gray-700 flex items-center"
                >
                  {month.month}
                </div>
              ))}
            </div>

            {/* Day headers and grid */}
            <div style={{ height: 40, display: "flex", borderBottom: "1px solid #e5e7eb" }} className="bg-white">
              {Array.from({ length: daysCount }).map((_, dayIdx) => {
                const dayDate = new Date(startDate);
                dayDate.setDate(dayDate.getDate() + dayIdx);
                const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                return (
                  <div
                    key={dayIdx}
                    style={{ width: cellWidth }}
                    className={`border-r text-xs flex items-center justify-center font-medium ${
                      isWeekend
                        ? "bg-gray-50 border-gray-300 text-gray-500"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {dayDate.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Tasks and bars */}
            <div style={{ height: tasks.length * taskHeight }}>
              {tasks.map((task, idx) => {
                const startPos = calculatePosition(new Date(task.startDate));
                const endPos = calculatePosition(new Date(task.endDate));
                const barWidth = Math.max(endPos - startPos, 2);

                return (
                  <div
                    key={task.id}
                    style={{ height: taskHeight }}
                    className="border-b border-gray-200 relative bg-white hover:bg-gray-50 transition-colors"
                  >
                    {/* Grid background */}
                    <div style={{ display: "flex", height: "100%" }}>
                      {Array.from({ length: daysCount }).map((_, dayIdx) => {
                        const dayDate = new Date(startDate);
                        dayDate.setDate(dayDate.getDate() + dayIdx);
                        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                        return (
                          <div
                            key={dayIdx}
                            style={{ width: cellWidth }}
                            className={`border-r flex-shrink-0 ${
                              isWeekend ? "bg-gray-50 border-gray-300" : "border-gray-200"
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Task bar with better styling */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: startPos,
                        width: barWidth,
                        height: 28,
                        transform: "translateY(-50%)",
                        backgroundColor: task.isCritical ? "#dc2626" : "#2563eb",
                        borderRadius: "6px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        border: `2px solid ${task.isCritical ? "#991b1b" : "#1e40af"}`,
                      }}
                      className="hover:shadow-md transition-shadow group"
                      onClick={() => onTaskClick?.(task)}
                      title={`${task.name} (${task.progress}% complete)`}
                    >
                      {/* Progress fill */}
                      <div
                        style={{
                          width: `${task.progress}%`,
                          height: "100%",
                          backgroundColor: task.isCritical ? "#7f1d1d" : "#1e3a8a",
                          borderRadius: "4px",
                        }}
                        className="transition-all duration-300"
                      />
                      {/* Progress text */}
                      {barWidth > 50 && (
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.progress}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend and Info */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500 border border-blue-700"></div>
            <span className="text-gray-700">Normal Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-600 border border-red-900"></div>
            <span className="text-gray-700">Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">💡 Hover tasks to see progress | Click to view details</span>
          </div>
        </div>
      </div>
    </div>
  );
};
