import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savePersonalTrainerRequest, SavePersonalTrainerRequestParams, deletePersonalTrainerRequest } from '@/helpers/personalTrainerRequests/personalTrainerRequestsHelper';

export function useSavePersonalTrainerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SavePersonalTrainerRequestParams) => savePersonalTrainerRequest(data),
    onSuccess: (_, variables) => {
      if (variables.requestedBy) {
        queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests', 'user', variables.requestedBy] });
      }
      if (variables.gymTrainerId) {
        queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests', 'trainer', variables.gymTrainerId] });
      }
    },
  });
}

export function useDeletePersonalTrainerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId, trainerId }: { id: string, userId?: string, trainerId?: string }) => deletePersonalTrainerRequest(id),
    onSuccess: (_, variables) => {
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests', 'user', variables.userId] });
      }
      if (variables.trainerId) {
        queryClient.invalidateQueries({ queryKey: ['personalTrainerRequests', 'trainer', variables.trainerId] });
      }
    },
  });
}
