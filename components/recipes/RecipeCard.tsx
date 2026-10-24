import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  Clock,
  Eye,
  PencilSimple,
  Copy,
  Trash,
  Fire,
  Heartbeat,
  Sparkle,
} from 'phosphor-react-native';
import { GlobalMeal, MEAL_TYPES } from '@/lib/types/recipes';
import { triggerLightHaptic } from '@/lib/haptics';
import { getRecipeImageUrl } from '@/helpers/recipes/recipesHelper';

interface RecipeCardProps {
  recipe: GlobalMeal;
  onPreview: (recipe: GlobalMeal) => void;
  onEdit: (recipe: GlobalMeal) => void;
  onDuplicate: (recipe: GlobalMeal) => void;
  onDelete: (recipe: GlobalMeal) => void;
}

export function RecipeCard({
  recipe,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
}: RecipeCardProps) {
  const normalizedType = (recipe.mealType || 'lunch').toLowerCase();
  const typeMeta = MEAL_TYPES.find((t) => t.value === normalizedType) || {
    label: recipe.mealType,
    color: '#D4FF32',
  };

  const calories = recipe.calories ?? recipe.baseCalories ?? 0;
  const protein = recipe.protein ?? recipe.baseProtein ?? 0;
  const carbs = recipe.carbs ?? recipe.baseCarbs ?? 0;
  const fat = recipe.fat ?? recipe.baseFat ?? 0;
  const displayImage = recipe.imageUrl || getRecipeImageUrl(null, recipe.mealType);

  return (
    <View className="bg-[#12141A] border border-[#232631] rounded-2xl overflow-hidden mb-4 shadow-sm">
      {/* Recipe Cover Image */}
      <View className="relative w-full h-44 bg-[#0A0B0E]">
        <Image
          source={{ uri: displayImage }}
          className="w-full h-full"
          resizeMode="cover"
        />

        {/* Category Badge */}
        <View className="absolute top-3 left-3 flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 border border-white/10 backdrop-blur-md">
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: typeMeta.color }}
          />
          <Text className="text-[11px] font-bold tracking-wider uppercase text-white">
            {typeMeta.label}
          </Text>
        </View>

        {/* Difficulty & Time Badge */}
        <View className="absolute top-3 right-3 flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 border border-white/10">
          <Clock size={12} color="#CBD5E1" weight="bold" />
          <Text className="text-[11px] font-medium text-white">
            {recipe.prepTimeMinutes || 15}m
          </Text>
        </View>
      </View>

      {/* Content Body */}
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-2 mb-1">
          <Text
            className="text-white font-bold text-base flex-1"
            numberOfLines={1}
          >
            {recipe.mealName}
          </Text>
          {recipe.difficulty && (
            <View className="px-2 py-0.5 rounded-md bg-[#1C202B] border border-[#2D3344]">
              <Text className="text-[10px] font-medium text-[#94A3B8]">
                {recipe.difficulty}
              </Text>
            </View>
          )}
        </View>

        <Text
          className="text-[#94A3B8] text-xs leading-4 mb-3"
          numberOfLines={2}
        >
          {recipe.description || 'Nutrient-rich fitness recipe.'}
        </Text>

        {/* Nutritional Macro Pills */}
        <View className="flex-row items-center justify-between bg-[#181A20] border border-[#262A36] rounded-xl p-2.5 mb-3">
          <View className="flex-row items-center gap-1">
            <Fire size={14} color="#FF453A" weight="fill" />
            <Text className="text-white font-bold text-xs">{calories}</Text>
            <Text className="text-[#64748B] text-[10px]">kcal</Text>
          </View>
          <View className="w-[1px] h-3 bg-[#2D3344]" />
          <View className="flex-row items-center gap-1">
            <Text className="text-[#38BDF8] font-bold text-xs">{protein}g</Text>
            <Text className="text-[#64748B] text-[10px]">prot</Text>
          </View>
          <View className="w-[1px] h-3 bg-[#2D3344]" />
          <View className="flex-row items-center gap-1">
            <Text className="text-[#FBBF24] font-bold text-xs">{carbs}g</Text>
            <Text className="text-[#64748B] text-[10px]">carb</Text>
          </View>
          <View className="w-[1px] h-3 bg-[#2D3344]" />
          <View className="flex-row items-center gap-1">
            <Text className="text-[#FB923C] font-bold text-xs">{fat}g</Text>
            <Text className="text-[#64748B] text-[10px]">fat</Text>
          </View>
        </View>

        {/* Clinical Suitability Tags */}
        {recipe.suitableFor && recipe.suitableFor.length > 0 && (
          <View className="flex-row flex-wrap items-center gap-1.5 mb-3">
            <Heartbeat size={13} color="#4ADE80" weight="fill" />
            {recipe.suitableFor.slice(0, 2).map((cond, idx) => (
              <View
                key={idx}
                className="px-2 py-0.5 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20"
              >
                <Text className="text-[10px] font-medium text-[#4ADE80]">
                  {cond}
                </Text>
              </View>
            ))}
            {recipe.suitableFor.length > 2 && (
              <Text className="text-[10px] text-[#64748B]">
                +{recipe.suitableFor.length - 2} more
              </Text>
            )}
          </View>
        )}

        {/* Actions Bar */}
        <View className="flex-row items-center justify-between pt-3 border-t border-[#1C202B]">
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              onPreview(recipe);
            }}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181A20] border border-[#262A36] active:opacity-70"
          >
            <Eye size={14} color="#CBD5E1" weight="bold" />
            <Text className="text-white text-xs font-semibold">Preview</Text>
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onEdit(recipe);
              }}
              className="w-8 h-8 rounded-xl bg-[#181A20] border border-[#262A36] items-center justify-center active:opacity-70"
            >
              <PencilSimple size={14} color="#CBD5E1" weight="bold" />
            </Pressable>

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onDuplicate(recipe);
              }}
              className="w-8 h-8 rounded-xl bg-[#181A20] border border-[#262A36] items-center justify-center active:opacity-70"
            >
              <Copy size={14} color="#CBD5E1" weight="bold" />
            </Pressable>

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                onDelete(recipe);
              }}
              className="w-8 h-8 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 items-center justify-center active:opacity-70"
            >
              <Trash size={14} color="#EF4444" weight="bold" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
