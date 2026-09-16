import React, { useState, useRef } from 'react';
import {
  View,
  Pressable,
  TextInput,
  Modal,
  Animated,
  Keyboard,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { CheckCircle, Fire, Copy, Trash } from 'phosphor-react-native';

import * as Haptics from 'expo-haptics';

export type SetType = 'working' | 'warmup' | 'dropset';

export interface WorkoutSetRow {
  setNumber: number;
  setType: SetType;
  weight: number;
  reps: number;
  isCompleted: boolean;
}

interface SetRowProps {
  set: WorkoutSetRow;
  onChange: (updated: WorkoutSetRow) => void;
  onComplete: (set: WorkoutSetRow) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const SET_TYPE_LABELS: Record<SetType, { label: string; color: string; bg: string }> = {
  working: { label: 'W', color: '#DFFF00', bg: '#1A1F00' },
  warmup: { label: 'WU', color: '#60CFFF', bg: '#001A22' },
  dropset: { label: 'D', color: '#FF7A60', bg: '#220D00' },
};

export function SetRow({ set, onChange, onComplete, onDuplicate, onDelete }: SetRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const typeInfo = SET_TYPE_LABELS[set.setType];

  const handleComplete = async () => {
    Keyboard.dismiss();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onComplete({ ...set, isCompleted: !set.isCompleted });
  };

  const handleWeightChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const numeric = parseFloat(clean);
    onChange({ ...set, weight: isNaN(numeric) ? 0 : numeric });
  };

  const handleRepsChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    const numeric = parseInt(clean, 10);
    onChange({ ...set, reps: isNaN(numeric) ? 0 : numeric });
  };

  const handleSetType = (type: SetType) => {
    onChange({ ...set, setType: type });
    setShowMenu(false);
  };

  const completedBg = set.isCompleted ? '#0D1A00' : '#161616';
  const completedBorder = set.isCompleted ? '#3D6600' : '#2A2A2A';

  return (
    <>
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }] },
          { backgroundColor: completedBg, borderColor: completedBorder, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
        ]}
      >
        {/* Set number + type badge */}
        <View style={{ width: 36, alignItems: 'center' }}>
          <Text
            style={{
              color: set.isCompleted ? '#6DB300' : '#8E8E8E',
              fontSize: 15,
              fontWeight: '700',
              textDecorationLine: set.isCompleted ? 'line-through' : 'none',
            }}
          >
            {set.setNumber}
          </Text>
          <View
            style={{
              backgroundColor: typeInfo.bg,
              borderRadius: 4,
              paddingHorizontal: 4,
              paddingVertical: 1,
              marginTop: 2,
            }}
          >
            <Text style={{ color: typeInfo.color, fontSize: 9, fontWeight: '800' }}>
              {typeInfo.label}
            </Text>
          </View>
        </View>

        {/* Weight pill */}
        <Pressable
          style={{
            flex: 1,
            backgroundColor: set.isCompleted ? '#1A2800' : '#1E1E1E',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginHorizontal: 6,
            alignItems: 'center',
          }}
        >
          <TextInput
            value={set.weight === 0 ? '' : set.weight.toString()}
            onChangeText={handleWeightChange}
            placeholder="0.0 kg"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
            style={{
              color: set.isCompleted ? '#DFFF00' : '#FFFFFF',
              fontSize: 15,
              fontWeight: '600',
              textAlign: 'center',
              width: '100%',
            }}
            editable={!set.isCompleted}
          />
        </Pressable>

        {/* Reps pill */}
        <Pressable
          style={{
            flex: 1,
            backgroundColor: set.isCompleted ? '#1A2800' : '#1E1E1E',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginHorizontal: 6,
            alignItems: 'center',
          }}
        >
          <TextInput
            value={set.reps === 0 ? '' : set.reps.toString()}
            onChangeText={handleRepsChange}
            placeholder="0 reps"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            style={{
              color: set.isCompleted ? '#DFFF00' : '#FFFFFF',
              fontSize: 15,
              fontWeight: '600',
              textAlign: 'center',
              width: '100%',
            }}
            editable={!set.isCompleted}
          />
        </Pressable>

        {/* Fire action / Checkmark */}
        <Pressable
          onPress={set.isCompleted ? handleComplete : () => setShowMenu(true)}
          hitSlop={8}
          style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          {set.isCompleted ? (
            <CheckCircle size={26} color="#DFFF00" weight="fill" />
          ) : (
            <Fire size={26} color="#FF6B35" weight="fill" />
          )}
        </Pressable>

        {/* Complete button on the far right */}
        {!set.isCompleted && (
          <Pressable
            onPress={handleComplete}
            hitSlop={8}
            style={{ marginLeft: 4 }}
          >
            <CheckCircle size={26} color="#444" weight="regular" />
          </Pressable>
        )}
      </Animated.View>

      {/* Fire Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
          onPress={() => setShowMenu(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: '#161616',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 36,
                borderWidth: 1,
                borderColor: '#2A2A2A',
              }}
            >
              {/* Handle */}
              <View style={{ alignSelf: 'center', width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 20 }} />

              <Text style={{ color: '#8E8E8E', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 16 }}>
                SET {set.setNumber} OPTIONS
              </Text>

              {/* Set type options */}
              <Text style={{ color: '#555', fontSize: 11, fontWeight: '600', marginBottom: 10 }}>TYPE</Text>
              {(['working', 'warmup', 'dropset'] as SetType[]).map((type) => {
                const info = SET_TYPE_LABELS[type];
                const active = set.setType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => handleSetType(type)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: active ? info.bg : 'transparent',
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      marginBottom: 6,
                      borderWidth: 1,
                      borderColor: active ? info.color + '40' : '#2A2A2A',
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: info.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        borderWidth: 1,
                        borderColor: info.color + '50',
                      }}
                    >
                      <Text style={{ color: info.color, fontSize: 10, fontWeight: '800' }}>{info.label}</Text>
                    </View>
                    <Text style={{ color: active ? info.color : '#FFFFFF', fontWeight: '600', fontSize: 15, textTransform: 'capitalize' }}>
                      {type === 'working' ? 'Working Set' : type === 'warmup' ? 'Warmup Set' : 'Drop Set'}
                    </Text>
                    {active && (
                      <CheckCircle size={18} color={info.color} weight="fill" style={{ marginLeft: 'auto' }} />
                    )}
                  </Pressable>
                );
              })}

              {/* Actions */}
              <View style={{ height: 1, backgroundColor: '#2A2A2A', marginVertical: 16 }} />

              <Pressable
                onPress={() => { onDuplicate(); setShowMenu(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: '#1E1E1E',
                  marginBottom: 8,
                }}
              >
                <Copy size={20} color="#DFFF00" style={{ marginRight: 12 }} />
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>Duplicate Set</Text>
              </Pressable>

              <Pressable
                onPress={() => { onDelete(); setShowMenu(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: '#220A00',
                }}
              >
                <Trash size={20} color="#FF4D4D" style={{ marginRight: 12 }} />
                <Text style={{ color: '#FF4D4D', fontWeight: '600', fontSize: 15 }}>Delete Set</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
