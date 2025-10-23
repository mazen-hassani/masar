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
  [Status.NOT_STARTED]: "bg-gray-100 border-gray-300",
  [Status.IN_PROGRESS]: "bg-blue-50 border-blue-300",
  [Status.ON_HOLD]: "bg-yellow-50 border-yellow-300",
  [Status.COMPLETED]: "bg-green-50 border-green-300",
  [Status.VERIFIED]: "bg-purple-50 border-purple-300",
};

const statusHeaderBg: Record<Status, string> = {
  [Status.NOT_STARTED]: "bg-gray-500",
  [Status.IN_PROGRESS]: "bg-blue-500",
  [Status.ON_HOLD]: "bg-yellow-500",
  [Status.COMPLETED]: "bg-green-500",
  [Status.VERIFIED]: "bg-purple-500",
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
    <div className="flex gap-6 overflow-x-auto pb-6">
      {statuses.map((status) => (
        <div
          key={status}
          className="flex flex-col min-w-[350px] bg-gray-50 rounded-lg overflow-hidden"
        >
          {/* Column Header */}
          <div className={`${statusHeaderBg[status]} text-white p-4`}>
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">
                {statusLabels[status]}
              </h2>
              <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                {cardsByStatus[status].length}
              </span>
            </div>
          </div>

          {/* Cards Container */}
          <div
            className={`flex-1 p-4 space-y-3 overflow-y-auto min-h-[600px] transition-colors ${
              draggedCard ? "bg-gray-100" : "bg-gray-50"
            }`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            {cardsByStatus[status].length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No tasks</p>
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
                  className={`p-4 rounded-lg border-2 cursor-move hover:shadow-md transition-all ${
                    statusColors[status]
                  } ${draggedCard?.id === card.id ? "opacity-50" : ""}`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {card.title}
                  </h3>

                  {card.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {card.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    {/* Priority Badge */}
                    {card.priority && (
                      <div className="flex gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            priorityColors[card.priority]
                          }`}
                        >
                          {card.priority.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Due Date */}
                    {card.dueDate && (
                      <div className="text-xs text-gray-600">
                        Due:{" "}
                        {new Date(card.dueDate).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </div>
                    )}

                    {/* Assignee */}
                    {card.assignee && (
                      <div className="text-xs text-gray-600">
                        Assigned to: {card.assignee}
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
