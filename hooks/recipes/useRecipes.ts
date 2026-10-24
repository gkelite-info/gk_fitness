import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRecipes,
  fetchRecipeById,
  fetchRecipeStats,
  deleteRecipe,
  duplicateRecipe,
  updateRecipePhoto,
  FetchRecipesParams,
} from '@/helpers/recipes/recipesHelper';

export function useRecipes(params: FetchRecipesParams = {}) {
  return useQuery({
    queryKey: [
      'globalRecipes',
      params.page,
      params.pageSize,
      params.query,
      params.mealType,
      params.dietType,
      params.condition,
      params.status,
    ],
    queryFn: async () => {
      return await fetchRecipes(params);
    },
  });
}

export function useRecipeById(id?: string) {
  return useQuery({
    queryKey: ['globalRecipe', id],
    queryFn: async () => {
      if (!id) return null;
      return await fetchRecipeById(id);
    },
    enabled: Boolean(id),
  });
}

export function useRecipeStats() {
  return useQuery({
    queryKey: ['globalRecipeStats'],
    queryFn: async () => {
      return await fetchRecipeStats();
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteRecipe(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['globalRecipeStats'] });
    },
  });
}

export function useDuplicateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await duplicateRecipe(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['globalRecipeStats'] });
    },
  });
}

export function useUpdateRecipePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, imageUrl }: { id: string; imageUrl: string | null }) => {
      return await updateRecipePhoto(id, imageUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['globalRecipe'] });
    },
  });
}

