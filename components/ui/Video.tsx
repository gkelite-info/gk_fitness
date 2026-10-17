import React, { forwardRef, useImperativeHandle, useEffect, Component, ErrorInfo } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { View, ViewStyle } from 'react-native';

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
  fallback?: React.ReactNode;
  onError?: (error: any) => void;
};

class VideoErrorBoundary extends Component<
  { fallback?: React.ReactNode; onError?: (error: any) => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.warn('[Video] Caught native VideoPlayer constructor error:', error?.message || error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }} />;
    }
    return this.props.children;
  }
}

const VideoPlayerComponent = forwardRef((props: VideoProps, ref) => {
  const { source, style, resizeMode, shouldPlay, isLooping, useNativeControls, onPlaybackStatusUpdate, isMuted } = props;
  
  const parsedSource = typeof source === 'object' && source?.uri ? source.uri : source;
  const player = useVideoPlayer(parsedSource, p => {
    try {
      p.loop = !!isLooping;
      p.muted = !!isMuted;
      if (shouldPlay) {
        p.play();
      }
    } catch (e) {
      console.warn('[Video] Error in setup callback:', e);
    }
  });

  useEffect(() => {
    try {
      if (shouldPlay) player.play();
      else player.pause();
    } catch (e) {
      console.warn('[Video] Error in shouldPlay effect:', e);
    }
  }, [shouldPlay, player]);

  useEffect(() => {
    try {
      player.loop = !!isLooping;
    } catch (e) {
      console.warn('[Video] Error in isLooping effect:', e);
    }
  }, [isLooping, player]);

  // Polling for duration/status since onPlaybackStatusUpdate is legacy
  useEffect(() => {
    if (!onPlaybackStatusUpdate) return;
    
    let interval = setInterval(() => {
      try {
        onPlaybackStatusUpdate({
          isLoaded: true,
          durationMillis: player.duration ? player.duration * 1000 : 0,
          positionMillis: player.currentTime ? player.currentTime * 1000 : 0,
          didJustFinish: player.currentTime >= player.duration && player.duration > 0
        });
      } catch (e) {
        // ignore
      }
    }, 250);

    return () => clearInterval(interval);
  }, [onPlaybackStatusUpdate, player]);

  useImperativeHandle(ref, () => ({
    playAsync: () => {
      try { player.play(); } catch (e) {}
    },
    pauseAsync: () => {
      try { player.pause(); } catch (e) {}
    },
    replayAsync: () => {
      try {
        player.currentTime = 0;
        player.play();
      } catch (e) {}
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

export const Video = forwardRef((props: VideoProps, ref) => {
  const parsedSource = typeof props.source === 'object' && props.source?.uri ? props.source.uri : props.source;
  if (!parsedSource) {
    return (props.fallback as React.ReactElement) ?? <View style={props.style} />;
  }

  return (
    <VideoErrorBoundary fallback={props.fallback} onError={props.onError}>
      <VideoPlayerComponent {...props} ref={ref} />
    </VideoErrorBoundary>
  );
});
