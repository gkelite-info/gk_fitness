import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGymAnnouncements, saveGymAnnouncement, deleteGymAnnouncement, SaveGymAnnouncementParams } from '@/helpers/gymAnnouncements/gymAnnouncementsHelper';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';

export function useGymAnnouncements(userId: string | null) {
  return useQuery({
    queryKey: ['gymAnnouncements', userId],
    queryFn: async () => {
      if (!userId) return [];
      const gymId = await getOwnerGymId(userId);
      if (!gymId) return [];
      return await fetchGymAnnouncements(gymId);
    },
    enabled: !!userId,
  });
}

export function useSaveGymAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementData: SaveGymAnnouncementParams) => saveGymAnnouncement(announcementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymAnnouncements'] });
    },
  });
}

export function useDeleteGymAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGymAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymAnnouncements'] });
    },
  });
}
