import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ViewStyle } from 'react-native';

export const ResizeMode = {
  CONTAIN: 'contain',
  COVER: 'cover',
  STRETCH: 'stretch',
};

export type VideoProps = {
  source: any;
  style?: ViewStyle | any;
  resizeMode?: string;
  shouldPlay?: boolean;
  isLooping?: boolean;
  useNativeControls?: boolean;
  onPlaybackStatusUpdate?: (status: any) => void;
  isMuted?: boolean;
};

export const Video = forwardRef((props: VideoProps, ref) => {
  const { source, style, resizeMode, shouldPlay, isLooping, useNativeControls, onPlaybackStatusUpdate, isMuted } = props;
  
  const player = useVideoPlayer(source, p => {
    p.loop = !!isLooping;
    p.muted = !!isMuted;
    if (shouldPlay) {
      p.play();
    }
  });

  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [shouldPlay, player]);

  useEffect(() => {
    player.loop = !!isLooping;
  }, [isLooping, player]);

  // Polling for duration/status since onPlaybackStatusUpdate is legacy
  useEffect(() => {
    if (!onPlaybackStatusUpdate) return;
    
    let interval = setInterval(() => {
      // Mocking the old status object structure
      onPlaybackStatusUpdate({
        isLoaded: true,
        durationMillis: player.duration ? player.duration * 1000 : 0,
        positionMillis: player.currentTime ? player.currentTime * 1000 : 0,
        didJustFinish: player.currentTime >= player.duration && player.duration > 0
      });
    }, 250);

    return () => clearInterval(interval);
  }, [onPlaybackStatusUpdate, player]);

  useImperativeHandle(ref, () => ({
    playAsync: () => player.play(),
    pauseAsync: () => player.pause(),
    replayAsync: () => {
      player.currentTime = 0;
      player.play();
    }
  }));

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={(resizeMode as any) || 'contain'}
      nativeControls={!!useNativeControls}
    />
  );
});
