import React from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { X, Barbell, Lightbulb, Clock } from 'phosphor-react-native';

interface ExerciseInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  category: string;
  plannedSets: number;
  plannedReps: string;
  durationMinutes?: number;
}

export function ExerciseInfoSheet({
  visible,
  onClose,
  exerciseName,
  category,
  plannedSets,
  plannedReps,
  durationMinutes,
}: ExerciseInfoSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              backgroundColor: '#161616',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 48,
              borderTopWidth: 1,
              borderColor: '#2A2A2A',
            }}
          >
            {/* Handle */}
            <View style={{ alignSelf: 'center', width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 20 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
                  {exerciseName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Barbell size={14} color="#DFFF00" weight="fill" />
                  <Text style={{ color: '#8E8E8E', fontSize: 13 }}>{category}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <X size={22} color="#555" />
              </Pressable>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#1A2D00',
                  borderRadius: 16,
                  padding: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#DFFF0030',
                }}
              >
                <Text style={{ color: '#8E8E8E', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>SETS</Text>
                <Text style={{ color: '#DFFF00', fontSize: 28, fontWeight: '800' }}>{plannedSets}</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#1A1A1A',
                  borderRadius: 16,
                  padding: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#2A2A2A',
                }}
              >
                <Text style={{ color: '#8E8E8E', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>REPS</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>{plannedReps}</Text>
              </View>
              {durationMinutes && (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#1A1A1A',
                    borderRadius: 16,
                    padding: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#2A2A2A',
                  }}
                >
                  <Text style={{ color: '#8E8E8E', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                    <Clock size={10} color="#8E8E8E" /> MIN
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>{durationMinutes}</Text>
                </View>
              )}
            </View>

            {/* Form tips */}
            <View
              style={{
                backgroundColor: '#1A1F00',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: '#DFFF0025',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Lightbulb size={18} color="#DFFF00" weight="fill" />
                <Text style={{ color: '#DFFF00', fontWeight: '700', fontSize: 14 }}>Form Tips</Text>
              </View>
              <Text style={{ color: '#8E8E8E', fontSize: 13, lineHeight: 20 }}>
                Focus on controlled movement throughout the full range of motion. Keep your core engaged and avoid using momentum. Breathe out on the exertion phase.
              </Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
