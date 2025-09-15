declare module 'react-frappe-gantt' {
  import React from 'react';

  export interface GanttTaskProps {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  export interface FrappeGanttProps {
    tasks: GanttTaskProps[];
    viewMode?: string;
    onClick?: (task: any) => void;
    onDateChange?: (task: any, start: string, end: string) => void;
    onProgressChange?: (task: any, progress: number) => void;
    onTasksChange?: (tasks: any[]) => void;
    columnWidth?: number;
    barHeight?: number;
    padding?: number;
  }

  declare const FrappeGantt: React.FC<FrappeGanttProps>;
  export default FrappeGantt;
}