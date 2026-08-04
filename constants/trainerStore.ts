import { useState, useEffect } from 'react';
import { mockTrainers } from './mockTrainers';

export type TrainerStatus = 'none' | 'pending' | 'approved';

interface TrainerState {
  status: TrainerStatus;
  trainerId: string | null;
  selectedSlot: string;
  nextSessionDate: string;
  nextSessionTime: string;
  remainingSessions: number;
  isSessionCancelled: boolean;
  simulationTimeLeft: number;
}

let state: TrainerState = {
  status: 'none',
  trainerId: '1',
  selectedSlot: '5:00 PM',
  nextSessionDate: '16 Jul 2026',
  nextSessionTime: '06:00 PM',
  remainingSessions: 8,
  isSessionCancelled: false,
  simulationTimeLeft: 15,
};

let simulationInterval: ReturnType<typeof setInterval> | null = null;
type Listener = (state: TrainerState) => void;
const listeners = new Set<Listener>();

export function setTrainerState(
  updater: Partial<TrainerState> | ((prev: TrainerState) => Partial<TrainerState>)
) {
  const next = typeof updater === 'function' ? updater(state) : updater;
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

export function startApprovalSimulation(durationSeconds = 15, trainerId?: string) {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }

  setTrainerState({
    status: 'pending',
    trainerId: trainerId || state.trainerId || '1',
    simulationTimeLeft: durationSeconds,
    isSessionCancelled: false,
  });

  simulationInterval = setInterval(() => {
    if (state.simulationTimeLeft <= 1) {
      if (simulationInterval) clearInterval(simulationInterval);
      simulationInterval = null;
      setTrainerState({ status: 'approved', simulationTimeLeft: 0 });
    } else {
      setTrainerState({ simulationTimeLeft: state.simulationTimeLeft - 1 });
    }
  }, 1000);
}

export function cancelTrainerRequest() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  setTrainerState({
    status: 'none',
    simulationTimeLeft: 15,
    isSessionCancelled: false,
  });
}

export function useTrainerStore() {
  const [localState, setLocalState] = useState<TrainerState>(state);

  useEffect(() => {
    const listener: Listener = (newState) => {
      setLocalState(newState);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const currentTrainer = localState.trainerId
    ? mockTrainers.find((t) => t.id === localState.trainerId) || mockTrainers[0]
    : mockTrainers[0];

  return {
    ...localState,
    trainer: currentTrainer,
    setStatus: (status: TrainerStatus) => setTrainerState({ status }),
    setTrainerId: (trainerId: string | null) => setTrainerState({ trainerId }),
    setSelectedSlot: (selectedSlot: string) => setTrainerState({ selectedSlot }),
    bookSelectedSlot: () =>
      setTrainerState((prev) => ({
        nextSessionTime: prev.selectedSlot,
        isSessionCancelled: false,
      })),
    cancelSession: () => setTrainerState({ isSessionCancelled: true }),
    rescheduleSession: (newTime: string) =>
      setTrainerState({ nextSessionTime: newTime, isSessionCancelled: false }),
    startApprovalSimulation,
    cancelTrainerRequest,
    resetTrainer: cancelTrainerRequest,
  };
}
