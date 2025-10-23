// ABOUTME: Form component for creating and editing activities
// ABOUTME: Handles activity name, description, and scheduling inputs

import { useForm } from "react-hook-form";
import { Button, Input, Card, CardContent } from "../common";
import { ActivityFormData } from "../../types";

interface ActivityFormProps {
  initialData?: Partial<ActivityFormData>;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Activity",
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityFormData>({
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      startDate: initialData?.startDate as Date | undefined,
      endDate: initialData?.endDate as Date | undefined,
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Activity Name"
            placeholder="Enter activity name"
            required
            {...register("name", {
              required: "Activity name is required",
              minLength: {
                value: 2,
                message: "Activity name must be at least 2 characters",
              },
            })}
            error={errors.name?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter activity description"
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
