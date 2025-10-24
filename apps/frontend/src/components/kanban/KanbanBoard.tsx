// ABOUTME: Kanban board component - displays tasks organized by status
// ABOUTME: Supports drag-and-drop for task status updates

import React, { useState } from "react";
import { Status } from "../../types";

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  status: Status;
  dueDate?: Date;
  priority?: "low" | "medium" | "high";
  assignee?: string;
}

interface KanbanBoardProps {
  cards: KanbanCard[];
  onCardMove?: (cardId: string, newStatus: Status) => void;
  onCardClick?: (card: KanbanCard) => void;
  statuses?: Status[];
}

const statusLabels: Record<Status, string> = {
  [Status.NOT_STARTED]: "Not Started",
  [Status.IN_PROGRESS]: "In Progress",
  [Status.ON_HOLD]: "On Hold",
  [Status.COMPLETED]: "Completed",
  [Status.VERIFIED]: "Verified",
};

const statusColors: Record<Status, string> = {
  [Status.NOT_STARTED]: "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md",
  [Status.IN_PROGRESS]: "bg-white border-blue-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100",
  [Status.ON_HOLD]: "bg-white border-yellow-200 hover:border-yellow-300 hover:shadow-md hover:shadow-yellow-100",
  [Status.COMPLETED]: "bg-white border-green-200 hover:border-green-300 hover:shadow-md hover:shadow-green-100",
  [Status.VERIFIED]: "bg-white border-purple-200 hover:border-purple-300 hover:shadow-md hover:shadow-purple-100",
};

const statusHeaderBg: Record<Status, string> = {
  [Status.NOT_STARTED]: "bg-gradient-to-r from-gray-500 to-gray-600",
  [Status.IN_PROGRESS]: "bg-gradient-to-r from-blue-500 to-blue-600",
  [Status.ON_HOLD]: "bg-gradient-to-r from-yellow-500 to-yellow-600",
  [Status.COMPLETED]: "bg-gradient-to-r from-green-500 to-green-600",
  [Status.VERIFIED]: "bg-gradient-to-r from-purple-500 to-purple-600",
};

const statusIcons: Record<Status, string> = {
  [Status.NOT_STARTED]: "📋",
  [Status.IN_PROGRESS]: "⚡",
  [Status.ON_HOLD]: "⏸",
  [Status.COMPLETED]: "✓",
  [Status.VERIFIED]: "✓✓",
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  cards,
  onCardMove,
  onCardClick,
  statuses = Object.values(Status),
}) => {
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [dragSource, setDragSource] = useState<Status | null>(null);

  const handleDragStart = (card: KanbanCard, status: Status) => {
    setDraggedCard(card);
    setDragSource(status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetStatus: Status) => {
    if (draggedCard && dragSource !== targetStatus) {
      onCardMove?.(draggedCard.id, targetStatus);
    }
    setDraggedCard(null);
    setDragSource(null);
  };

  const cardsByStatus = statuses.reduce(
    (acc, status) => {
      acc[status] = cards.filter((card) => card.status === status);
      return acc;
    },
    {} as Record<Status, KanbanCard[]>
  );

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[650px]">
      {statuses.map((status) => (
        <div
          key={status}
          className="flex flex-col min-w-[360px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200"
        >
          {/* Column Header */}
          <div className={`${statusHeaderBg[status]} text-white p-4 shadow-md`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">{statusIcons[status]}</span>
                <h2 className="font-bold text-base">
                  {statusLabels[status]}
                </h2>
              </div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                {cardsByStatus[status].length}
              </span>
            </div>
          </div>

          {/* Cards Container */}
          <div
            className={`flex-1 p-4 space-y-3 overflow-y-auto transition-all duration-200 ${
              draggedCard ? "bg-blue-50" : "bg-white"
            }`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            {cardsByStatus[status].length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg mb-2">📭</p>
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="text-xs mt-1">Drag tasks here or create new ones</p>
              </div>
            ) : (
              cardsByStatus[status].map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card, status)}
                  onDragEnd={() => {
                    setDraggedCard(null);
                    setDragSource(null);
                  }}
                  onClick={() => onCardClick?.(card)}
                  className={`p-4 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all duration-200 ${
                    statusColors[status]
                  } ${draggedCard?.id === card.id ? "opacity-50 scale-95" : "scale-100"}`}
                >
                  {/* Card Title */}
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
                    {card.title}
                  </h3>

                  {/* Card Description */}
                  {card.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {card.description}
                    </p>
                  )}

                  {/* Card Metadata */}
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    {/* Priority Badge */}
                    {card.priority && (
                      <div className="flex gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            priorityColors[card.priority]
                          }`}
                        >
                          {card.priority.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Due Date */}
                    {card.dueDate && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <span>📅</span>
                        {new Date(card.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}

                    {/* Assignee */}
                    {card.assignee && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <span>👤</span>
                        {card.assignee}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
