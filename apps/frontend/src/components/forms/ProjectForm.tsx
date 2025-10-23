// ABOUTME: Form component for creating and editing projects
// ABOUTME: Handles project name, description, and date range inputs

import { useForm } from "react-hook-form";
import { Button, Input, Card, CardContent } from "../common";
import { ProjectFormData } from "../../types";

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Project",
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      startDate: initialData?.startDate as Date | undefined,
      timezone: initialData?.timezone || "UTC",
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            required
            {...register("name", {
              required: "Project name is required",
              minLength: {
                value: 3,
                message: "Project name must be at least 3 characters",
              },
            })}
            error={errors.name?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter project description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              {...register("description")}
            />
          </div>

          <Input
            label="Start Date"
            type="date"
            {...register("startDate")}
            error={errors.startDate?.message}
          />

          <Input
            label="Timezone"
            placeholder="e.g., UTC, America/New_York"
            {...register("timezone")}
            error={errors.timezone?.message}
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
