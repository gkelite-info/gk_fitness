import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CookingPot,
  Plus,
  ArrowLeft,
  MagnifyingGlass,
  X,
  Funnel,
  Sparkle,
  Egg,
  BowlFood,
  Cookie,
  Trash,
} from 'phosphor-react-native';
import { useRecipes, useRecipeStats, useDeleteRecipe, useDuplicateRecipe } from '@/hooks/recipes/useRecipes';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipePreviewModal } from '@/components/recipes/RecipePreviewModal';
import ConfirmModal from '@/components/ConfirmModal';
import { CustomRefreshControl } from '@/components/CustomRefreshControl';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { GlobalMeal, DIET_TYPES, CLINICAL_CONDITIONS } from '@/lib/types/recipes';

const MEAL_TABS = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snack', label: 'Snack' },
  { id: 'dinner', label: 'Dinner' },
];

export default function RecipesCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('all');
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [previewRecipe, setPreviewRecipe] = useState<GlobalMeal | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<GlobalMeal | null>(null);
  const [accumulatedRecipes, setAccumulatedRecipes] = useState<GlobalMeal[]>([]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
    setAccumulatedRecipes([]);
  }, [debouncedSearch, selectedMealType, selectedDiet, selectedCondition]);

  const {
    data: recipesResponse,
    isLoading,
    refetch,
    isFetching,
  } = useRecipes({
    page,
    pageSize,
    query: debouncedSearch,
    mealType: selectedMealType,
    dietType: selectedDiet,
    condition: selectedCondition,
  });

  const { data: stats, refetch: refetchStats } = useRecipeStats();
  const deleteMutation = useDeleteRecipe();
  const duplicateMutation = useDuplicateRecipe();

  const total = recipesResponse?.total || 0;
  const totalPages = recipesResponse?.totalPages || 1;
  const hasMore = page < totalPages;

  useEffect(() => {
    if (recipesResponse?.list) {
      if (page === 1) {
        setAccumulatedRecipes(recipesResponse.list);
      } else {
        setAccumulatedRecipes((prev) => {
          const prevIds = new Set(prev.map((r) => r.globalMealId));
          const newItems = recipesResponse.list.filter((r) => !prevIds.has(r.globalMealId));
          return [...prev, ...newItems];
        });
      }
    }
  }, [recipesResponse, page]);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchStats();
    }, [refetch, refetchStats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerLightHaptic();
    await Promise.all([refetch(), refetchStats()]);
    setRefreshing(false);
  }, [refetch, refetchStats]);

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleEdit = (recipe: GlobalMeal) => {
    router.push({
      pathname: '/(superadmin)/dashboard/recipes/add',
      params: { id: recipe.globalMealId },
    } as any);
  };

  const handleDuplicate = async (recipe: GlobalMeal) => {
    try {
      toast.loading('Duplicating recipe...');
      await duplicateMutation.mutateAsync(recipe.globalMealId);
      triggerSuccessHaptic();
      toast.success('Recipe duplicated successfully!');
      onRefresh();
    } catch (err: any) {
      triggerErrorHaptic();
      toast.error(err.message || 'Failed to duplicate recipe');
    }
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;
    try {
      await deleteMutation.mutateAsync(recipeToDelete.globalMealId);
      triggerSuccessHaptic();
      toast.success('Recipe deleted from database');
      setRecipeToDelete(null);
      onRefresh();
    } catch (err: any) {
      triggerErrorHaptic();
      toast.error(err.message || 'Failed to delete recipe');
    }
  };

  const statsList = [
    {
      title: 'All Recipes',
      value: stats?.total || 0,
      icon: Sparkle,
      color: '#BEF227',
      bg: 'bg-[#BEF227]/10',
    },
    {
      title: 'Breakfast',
      value: stats?.breakfast || 0,
      icon: Egg,
      color: '#FBBF24',
      bg: 'bg-[#FBBF24]/10',
    },
    {
      title: 'Lunch & Dinner',
      value: (stats?.lunch || 0) + (stats?.dinner || 0),
      icon: BowlFood,
      color: '#38BDF8',
      bg: 'bg-[#38BDF8]/10',
    },
    {
      title: 'Snacks',
      value: stats?.snack || 0,
      icon: Cookie,
      color: '#FB923C',
      bg: 'bg-[#FB923C]/10',
    },
  ];

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Top Header */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="px-4 pb-3 bg-[#0F0F12] border-b border-[#1E2028] flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              router.back();
            }}
            className="w-10 h-10 rounded-xl bg-[#181A20] border border-[#262A36] items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={18} color="#FFFFFF" weight="bold" />
          </Pressable>
          <View>
            <Text className="text-white font-bold text-lg tracking-tight">
              Recipes & Meals
            </Text>
            <Text className="text-[#888888] text-xs">
              {total} total items configured
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            router.push('/(superadmin)/dashboard/recipes/add' as any);
          }}
          className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#BEF227] active:opacity-80"
        >
          <Plus size={16} color="#000000" weight="bold" />
          <Text className="text-black font-bold text-xs">Add Recipe</Text>
        </Pressable>
      </View>

      <FlatList
        data={accumulatedRecipes}
        keyExtractor={(item) => item.globalMealId}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPreview={setPreviewRecipe}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={setRecipeToDelete}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 90,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mb-4">
            {/* Stats Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2.5 mb-4"
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {statsList.map((st, idx) => {
                const Icon = st.icon;
                return (
                  <View
                    key={idx}
                    className="min-w-[125px] bg-[#12141A] border border-[#232631] rounded-2xl p-3 flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-[11px] text-[#94A3B8] font-medium">
                        {st.title}
                      </Text>
                      <Text className="text-xl font-bold text-white mt-0.5">
                        {st.value}
                      </Text>
                    </View>
                    <View className={`w-8 h-8 rounded-xl ${st.bg} items-center justify-center ml-2`}>
                      <Icon size={16} color={st.color} weight="fill" />
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Search Input & Filter Toggle */}
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1 flex-row items-center bg-[#14161E] border border-[#232631] rounded-xl px-3 h-11">
                <MagnifyingGlass size={16} color="#64748B" weight="bold" />
                <TextInput
                  placeholder="Search recipes, tags, ingredients..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-white text-xs h-full"
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery('')} className="p-1">
                    <X size={14} color="#8E8E93" weight="bold" />
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setShowAdvancedFilters(!showAdvancedFilters);
                }}
                className={`w-11 h-11 rounded-xl items-center justify-center border ${
                  selectedDiet !== 'all' || selectedCondition !== 'all' || showAdvancedFilters
                    ? 'bg-[#BEF227]/15 border-[#BEF227]'
                    : 'bg-[#14161E] border-[#232631]'
                }`}
              >
                <Funnel
                  size={18}
                  color={
                    selectedDiet !== 'all' || selectedCondition !== 'all' || showAdvancedFilters
                      ? '#BEF227'
                      : '#94A3B8'
                  }
                  weight={
                    selectedDiet !== 'all' || selectedCondition !== 'all' ? 'fill' : 'bold'
                  }
                />
              </Pressable>
            </View>

            {/* Meal Type Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2 mb-3"
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {MEAL_TABS.map((tab) => {
                const isActive = selectedMealType === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedMealType(tab.id);
                    }}
                    className={`px-3.5 py-2 rounded-xl border ${
                      isActive
                        ? 'bg-[#BEF227] border-[#BEF227]'
                        : 'bg-[#14161E] border-[#232631]'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isActive ? 'text-black font-bold' : 'text-[#CBD5E1]'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Collapsible Advanced Filters */}
            {showAdvancedFilters && (
              <View className="bg-[#12141A] border border-[#232631] rounded-2xl p-4 mb-4 gap-3">
                <View>
                  <Text className="text-[11px] font-bold text-[#94A3B8] uppercase mb-1.5">
                    Dietary Classification
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-1.5"
                  >
                    {['all', ...DIET_TYPES].map((d) => (
                      <Pressable
                        key={d}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedDiet(d);
                        }}
                        className={`px-2.5 py-1 rounded-lg border ${
                          selectedDiet === d
                            ? 'bg-[#BEF227] border-[#BEF227]'
                            : 'bg-[#181A20] border-[#262A36]'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-medium ${
                            selectedDiet === d ? 'text-black font-bold' : 'text-[#CBD5E1]'
                          }`}
                        >
                          {d === 'all' ? 'All Diets' : d}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View>
                  <Text className="text-[11px] font-bold text-[#94A3B8] uppercase mb-1.5">
                    Clinical Medical Condition
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-1.5"
                  >
                    {['all', ...CLINICAL_CONDITIONS.slice(0, 8)].map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedCondition(c);
                        }}
                        className={`px-2.5 py-1 rounded-lg border ${
                          selectedCondition === c
                            ? 'bg-[#4ADE80] border-[#4ADE80]'
                            : 'bg-[#181A20] border-[#262A36]'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-medium ${
                            selectedCondition === c ? 'text-black font-bold' : 'text-[#CBD5E1]'
                          }`}
                        >
                          {c === 'all' ? 'All Conditions' : c}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {(selectedDiet !== 'all' || selectedCondition !== 'all') && (
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedDiet('all');
                      setSelectedCondition('all');
                    }}
                    className="self-end pt-1"
                  >
                    <Text className="text-xs text-[#BEF227] font-semibold">
                      Reset Filters
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-16 bg-[#12141A] border border-[#232631] rounded-2xl p-6">
              <View className="w-16 h-16 rounded-2xl bg-[#BEF227]/10 border border-[#BEF227]/20 items-center justify-center mb-4">
                <CookingPot size={32} color="#BEF227" weight="fill" />
              </View>
              <Text className="text-white text-base font-bold mb-1">
                No Recipes Found
              </Text>
              <Text className="text-[#888888] text-xs text-center mb-5 max-w-[260px] leading-4">
                No global recipes matched your search or selected filters.
              </Text>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  router.push('/(superadmin)/dashboard/recipes/add' as any);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#BEF227] flex-row items-center gap-1.5 active:opacity-80"
              >
                <Plus size={16} color="#000000" weight="bold" />
                <Text className="text-black font-bold text-xs">Create New Recipe</Text>
              </Pressable>
            </View>
          ) : (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#BEF227" />
              <Text className="text-[#888888] text-xs mt-3">Loading recipes catalog...</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetching && page > 1 ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#BEF227" />
            </View>
          ) : null
        }
      />

      {/* Full Recipe Preview Modal */}
      <RecipePreviewModal
        recipe={previewRecipe}
        visible={Boolean(previewRecipe)}
        onClose={() => setPreviewRecipe(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={Boolean(recipeToDelete)}
        onClose={() => setRecipeToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Recipe"
        description={`Are you sure you want to delete "${recipeToDelete?.mealName}"? This will remove it from all automated customer meal plans.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="bg-red-500"
        isLoading={deleteMutation.isPending}
        icon={
          <View className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 items-center justify-center">
            <Trash size={24} color="#EF4444" weight="fill" />
          </View>
        }
      />
    </View>
  );
}
