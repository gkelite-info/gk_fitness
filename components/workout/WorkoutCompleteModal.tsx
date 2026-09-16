import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { Trophy, Clock, Barbell, Fire, CheckCircle } from 'phosphor-react-native';

interface WorkoutCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  workoutTitle?: string;
  totalExercises?: number;
  totalSetsLogged?: number;
  durationMinutes?: number;
}

export function WorkoutCompleteModal({
  visible,
  onClose,
  workoutTitle = 'Workout Session',
  totalExercises = 1,
  totalSetsLogged = 0,
  durationMinutes = 45,
}: WorkoutCompleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: '#161616',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#2A2A2A',
            padding: 24,
            alignItems: 'center',
            shadowColor: '#DFFF00',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 30,
            elevation: 10,
          }}
        >
          {/* Trophy Header Badge */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#1A2400',
              borderWidth: 2,
              borderColor: '#DFFF00',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <Trophy size={42} color="#DFFF00" weight="fill" />
          </View>

          <Text
            style={{
              color: '#FFF',
              fontSize: 24,
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            WORKOUT COMPLETE!
          </Text>

          <Text
            style={{
              color: '#8E8E8E',
              fontSize: 13,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Great job! You successfully finished {workoutTitle}.
          </Text>

          {/* Stats Summary Cards */}
          <View
            style={{
              flexDirection: 'row',
              width: '100%',
              gap: 8,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: '#1E1E1E',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#2A2A2A',
              }}
            >
              <Clock size={20} color="#DFFF00" />
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 16,
                  fontWeight: '700',
                  marginTop: 4,
                }}
              >
                {durationMinutes}m
              </Text>
              <Text style={{ color: '#8E8E8E', fontSize: 10, marginTop: 2 }}>
                Time
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: '#1E1E1E',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#2A2A2A',
              }}
            >
              <Barbell size={20} color="#DFFF00" />
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 16,
                  fontWeight: '700',
                  marginTop: 4,
                }}
              >
                {totalExercises}
              </Text>
              <Text style={{ color: '#8E8E8E', fontSize: 10, marginTop: 2 }}>
                Exercises
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: '#1E1E1E',
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#2A2A2A',
              }}
            >
              <Fire size={20} color="#FF6B00" weight="fill" />
              <Text
                style={{
                  color: '#FFF',
                  fontSize: 16,
                  fontWeight: '700',
                  marginTop: 4,
                }}
              >
                {totalSetsLogged}
              </Text>
              <Text style={{ color: '#8E8E8E', fontSize: 10, marginTop: 2 }}>
                Sets Logged
              </Text>
            </View>
          </View>

          {/* Streak Boost Note */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#26200A',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: '#4A3B00',
              width: '100%',
              gap: 10,
            }}
          >
            <Fire size={20} color="#FFD700" weight="fill" />
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '600', flex: 1 }}>
              Workout logged! Your daily streak has been updated. 🔥
            </Text>
          </View>

          {/* Done Button */}
          <Pressable
            onPress={onClose}
            style={{
              width: '100%',
              height: 52,
              backgroundColor: '#DFFF00',
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text
              style={{
                color: '#000',
                fontSize: 16,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              FINISH WORKOUT
            </Text>
            <CheckCircle size={22} color="#000" weight="fill" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
