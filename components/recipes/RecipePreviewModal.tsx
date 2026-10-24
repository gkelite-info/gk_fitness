import React from 'react';
import { View, Modal, ScrollView, Image, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  X,
  Clock,
  Fire,
  CheckCircle,
  WarningCircle,
  CookingPot,
  Sparkle,
  Scales,
} from 'phosphor-react-native';
import { GlobalMeal, MEAL_TYPES } from '@/lib/types/recipes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerLightHaptic } from '@/lib/haptics';
import { getRecipeImageUrl } from '@/helpers/recipes/recipesHelper';

interface RecipePreviewModalProps {
  recipe: GlobalMeal | null;
  visible: boolean;
  onClose: () => void;
}

export function RecipePreviewModal({ recipe, visible, onClose }: RecipePreviewModalProps) {
  const insets = useSafeAreaInsets();
  if (!recipe) return null;

  const normalizedType = (recipe.mealType || 'lunch').toLowerCase();
  const typeMeta = MEAL_TYPES.find((t) => t.value === normalizedType) || {
    label: recipe.mealType,
    color: '#D4FF32',
  };

  const calories = recipe.calories ?? recipe.baseCalories ?? 0;
  const protein = recipe.protein ?? recipe.baseProtein ?? 0;
  const carbs = recipe.carbs ?? recipe.baseCarbs ?? 0;
  const fat = recipe.fat ?? recipe.baseFat ?? 0;
  const fiber = recipe.fiber ?? Math.round(carbs * 0.15);
  const displayImage = recipe.imageUrl || getRecipeImageUrl(null, recipe.mealType);

  const steps = Array.isArray(recipe.recipeInstructions) ? recipe.recipeInstructions : [];
  const ingredients = recipe.ingredients || [];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/90">
        {/* Hero Image Header */}
        <View className="relative w-full h-72 bg-[#0A0B0E]">
          <Image
            source={{ uri: displayImage }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-gradient-to-t from-[#12141A] via-black/40 to-black/60" />

          {/* Close Button */}
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              onClose();
            }}
            style={{ top: insets.top + 10 }}
            className="absolute right-4 w-9 h-9 rounded-full bg-black/70 border border-white/20 items-center justify-center z-10"
          >
            <X size={18} color="#FFFFFF" weight="bold" />
          </Pressable>

          {/* Overlay info */}
          <View className="absolute bottom-4 left-4 right-4">
            <View className="flex-row items-center gap-2 mb-2">
              <View
                className="px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${typeMeta.color}20` }}
              >
                <Text
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: typeMeta.color }}
                >
                  {typeMeta.label}
                </Text>
              </View>

              {recipe.difficulty && (
                <View className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md">
                  <Text className="text-xs font-medium text-white">
                    {recipe.difficulty}
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-white text-2xl font-bold tracking-tight">
              {recipe.mealName}
            </Text>
          </View>
        </View>

        {/* Scrollable Details */}
        <ScrollView
          className="flex-1 bg-[#12141A] px-5"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Metrics Bar */}
          <View className="flex-row items-center justify-between bg-[#181A20] border border-[#232631] rounded-2xl p-4 mb-5">
            <View className="items-center flex-1">
              <Clock size={16} color="#CBD5E1" weight="bold" />
              <Text className="text-white font-bold text-sm mt-1">
                {recipe.prepTimeMinutes || 15}m
              </Text>
              <Text className="text-[10px] text-[#64748B]">Prep Time</Text>
            </View>
            <View className="w-[1px] h-8 bg-[#232631]" />
            <View className="items-center flex-1">
              <CookingPot size={16} color="#CBD5E1" weight="bold" />
              <Text className="text-white font-bold text-sm mt-1">
                {recipe.cookTimeMinutes || 15}m
              </Text>
              <Text className="text-[10px] text-[#64748B]">Cook Time</Text>
            </View>
            <View className="w-[1px] h-8 bg-[#232631]" />
            <View className="items-center flex-1">
              <Scales size={16} color="#CBD5E1" weight="bold" />
              <Text className="text-white font-bold text-sm mt-1">
                {recipe.servings || 1}
              </Text>
              <Text className="text-[10px] text-[#64748B]">
                {recipe.servingUnit || 'serving'}
              </Text>
            </View>
          </View>

          {/* Macronutrients Grid */}
          <Text className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
            Nutritional Targets
          </Text>
          <View className="grid grid-cols-2 flex-row flex-wrap gap-2 mb-5">
            <View className="flex-1 min-w-[45%] bg-[#181A20] border border-[#262A36] rounded-xl p-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Fire size={14} color="#FF453A" weight="fill" />
                <Text className="text-[#94A3B8] text-xs">Calories</Text>
              </View>
              <Text className="text-white text-xl font-bold">{calories} kcal</Text>
            </View>

            <View className="flex-1 min-w-[45%] bg-[#181A20] border border-[#262A36] rounded-xl p-3">
              <Text className="text-[#94A3B8] text-xs mb-1">Protein</Text>
              <Text className="text-[#38BDF8] text-xl font-bold">{protein}g</Text>
            </View>

            <View className="flex-1 min-w-[45%] bg-[#181A20] border border-[#262A36] rounded-xl p-3">
              <Text className="text-[#94A3B8] text-xs mb-1">Carbohydrates</Text>
              <Text className="text-[#FBBF24] text-xl font-bold">{carbs}g</Text>
            </View>

            <View className="flex-1 min-w-[45%] bg-[#181A20] border border-[#262A36] rounded-xl p-3">
              <Text className="text-[#94A3B8] text-xs mb-1">Dietary Fat</Text>
              <Text className="text-[#FB923C] text-xl font-bold">{fat}g</Text>
            </View>
          </View>

          {/* Description */}
          {recipe.description ? (
            <View className="mb-5">
              <Text className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                Culinary Summary
              </Text>
              <Text className="text-[#CBD5E1] text-sm leading-5">
                {recipe.description}
              </Text>
            </View>
          ) : null}

          {/* Clinical Suitability & Contraindications */}
          {((recipe.suitableFor && recipe.suitableFor.length > 0) ||
            (recipe.contraindications && recipe.contraindications.length > 0)) && (
            <View className="bg-[#181A20] border border-[#232631] rounded-2xl p-4 mb-5">
              {recipe.suitableFor && recipe.suitableFor.length > 0 && (
                <View className="mb-3">
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <CheckCircle size={14} color="#4ADE80" weight="fill" />
                    <Text className="text-xs font-bold text-[#4ADE80]">
                      Clinically Suitable For
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    {recipe.suitableFor.map((cond, i) => (
                      <View
                        key={i}
                        className="px-2 py-1 rounded-lg bg-[#4ADE80]/10 border border-[#4ADE80]/20"
                      >
                        <Text className="text-[11px] font-medium text-[#4ADE80]">
                          {cond}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {recipe.contraindications && recipe.contraindications.length > 0 && (
                <View>
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <WarningCircle size={14} color="#EF4444" weight="fill" />
                    <Text className="text-xs font-bold text-[#EF4444]">
                      Contraindicated Conditions
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    {recipe.contraindications.map((cond, i) => (
                      <View
                        key={i}
                        className="px-2 py-1 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20"
                      >
                        <Text className="text-[11px] font-medium text-[#EF4444]">
                          {cond}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Ingredients Section */}
          {ingredients.length > 0 && (
            <View className="mb-5">
              <Text className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
                Ingredients ({ingredients.length})
              </Text>
              <View className="bg-[#181A20] border border-[#232631] rounded-2xl divide-y divide-[#232631]">
                {ingredients.map((ing, i) => (
                  <View
                    key={i}
                    className="flex-row items-center justify-between p-3.5"
                  >
                    <Text className="text-white text-sm font-medium">{ing.name}</Text>
                    <Text className="text-[#BEF227] text-xs font-semibold">
                      {ing.quantity} {ing.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Instructions Section */}
          {steps.length > 0 && (
            <View className="mb-6">
              <Text className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
                Cooking Instructions ({steps.length} Steps)
              </Text>
              <View className="gap-2.5">
                {steps.map((st, i) => (
                  <View
                    key={i}
                    className="flex-row items-start gap-3 bg-[#181A20] border border-[#232631] rounded-2xl p-3.5"
                  >
                    <View className="w-6 h-6 rounded-full bg-[#BEF227]/10 border border-[#BEF227]/30 items-center justify-center shrink-0 mt-0.5">
                      <Text className="text-[#BEF227] text-xs font-bold">
                        {st.step || i + 1}
                      </Text>
                    </View>
                    <Text className="text-[#CBD5E1] text-sm leading-5 flex-1">
                      {st.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
