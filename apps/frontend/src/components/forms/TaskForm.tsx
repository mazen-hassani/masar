// ABOUTME: Form component for creating and editing tasks
// ABOUTME: Handles task name, description, duration, and scheduling inputs

import { useForm } from "react-hook-form";
import { Button, Input, Card, CardContent } from "../common";
import { TaskFormData } from "../../types";

interface TaskFormProps {
  initialData?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Task",
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      duration: initialData?.duration || 8,
      startDate: initialData?.startDate as Date | undefined,
      endDate: initialData?.endDate as Date | undefined,
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Task Name"
            placeholder="Enter task name"
            required
            {...register("name", {
              required: "Task name is required",
              minLength: {
                value: 2,
                message: "Task name must be at least 2 characters",
              },
            })}
            error={errors.name?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter task description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...register("startDate")}
              error={errors.startDate?.message}
            />
            <Input
              label="End Date"
              type="date"
              {...register("endDate")}
              error={errors.endDate?.message}
            />
          </div>

          <Input
            label="Duration (hours)"
            type="number"
            min="1"
            {...register("duration", {
              min: {
                value: 1,
                message: "Duration must be at least 1 hour",
              },
            })}
            error={errors.duration?.message}
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
          >
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
