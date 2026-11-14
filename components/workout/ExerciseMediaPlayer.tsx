import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Pressable, Image, ActivityIndicator } from 'react-native';
import { Play } from 'phosphor-react-native';
import { Video, ResizeMode } from '@/components/ui/Video';
import { getSupabaseVideoPublicUrl } from '@/lib/videoCache';
import { getMuscleThumbnailImage } from '@/lib/workoutMuscleImage';

const isStaticImageOrGif = (url?: string | null) => {
  if (!url) return false;
  return /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i.test(url);
};

const resolveCustomImageSource = (customImage?: any) => {
  if (typeof customImage === 'string' && customImage && !customImage.includes('1571019614242')) {
    return { uri: customImage };
  }
  if (customImage && typeof customImage === 'object' && customImage.uri) {
    return customImage;
  }
  return null;
};

export interface ExerciseMediaPlayerProps {
  videoUrl?: string | null;
  muscleGroup?: string | null;
  exerciseName?: string | null;
  customImage?: any;
  containerClassName: string;
  activeBorderClassName?: string;
  badgeSize?: 'sm' | 'lg';
  staticImageResizeMode?: 'cover' | 'contain';
  accentColor?: string;
  dimmed?: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

/**
 * Displays the static muscle thumbnail behind a Play button and mounts at most one
 * active <Video> player on tap, keeping the thumbnail + spinning loader overlay visible
 * until the native player renders its first frame to eliminate black loading flashes.
 */
export const ExerciseMediaPlayer = React.memo(({
  videoUrl,
  muscleGroup,
  exerciseName,
  customImage,
  containerClassName,
  activeBorderClassName,
  badgeSize = 'sm',
  staticImageResizeMode = 'cover',
  accentColor = '#D7FF00',
  dimmed = false,
  isPlaying = false,
  onTogglePlay,
}: ExerciseMediaPlayerProps) => {
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isFirstFrameReady, setIsFirstFrameReady] = useState(false);

  const publicUrl = useMemo(() => (videoUrl ? getSupabaseVideoPublicUrl(videoUrl) : null), [videoUrl]);
  const isStaticMedia = useMemo(() => isStaticImageOrGif(publicUrl), [publicUrl]);

  const muscleThumbnailSource = useMemo(
    () => resolveCustomImageSource(customImage) ?? getMuscleThumbnailImage(muscleGroup, exerciseName),
    [customImage, muscleGroup, exerciseName]
  );

  useEffect(() => {
    setHasVideoError(false);
    setIsFirstFrameReady(false);
  }, [publicUrl]);

  useEffect(() => {
    if (!isPlaying) {
      setIsFirstFrameReady(false);
    }
  }, [isPlaying]);

  const handleFirstFrameRender = useCallback(() => {
    setIsFirstFrameReady(true);
  }, []);

  const handleVideoError = useCallback(() => {
    setHasVideoError(true);
    setIsFirstFrameReady(false);
  }, []);

  const shouldShowActiveVideo = Boolean(publicUrl && !hasVideoError && !isStaticMedia && isPlaying);
  const badgeDimensions = badgeSize === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  const playIconSize = badgeSize === 'lg' ? 16 : 11;
  const spinnerScale = badgeSize === 'lg' ? 0.95 : 0.65;

  if (!publicUrl || hasVideoError) {
    return (
      <Pressable
        onPress={onTogglePlay}
        disabled={!onTogglePlay}
        hitSlop={4}
        className={`${containerClassName} ${dimmed ? 'opacity-70' : ''}`}
      >
        <Image
          source={muscleThumbnailSource}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/35 items-center justify-center">
          <View
            className={`${badgeDimensions} rounded-full bg-black/75 border items-center justify-center`}
            style={{ borderColor: `${accentColor}B3` }}
          >
            <Play size={playIconSize} color={accentColor} weight="fill" />
          </View>
        </View>
      </Pressable>
    );
  }

  if (isStaticMedia) {
    return (
      <View className={`${containerClassName} ${dimmed ? 'opacity-70' : ''}`}>
        <Image
          source={{ uri: publicUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={staticImageResizeMode}
          onError={handleVideoError}
        />
      </View>
    );
  }

  if (!shouldShowActiveVideo) {
    return (
      <Pressable
        onPress={onTogglePlay}
        hitSlop={4}
        className={`${containerClassName} ${dimmed ? 'opacity-70' : ''}`}
      >
        <Image
          source={muscleThumbnailSource}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/35 items-center justify-center">
          <View
            className={`${badgeDimensions} rounded-full bg-black/75 border items-center justify-center`}
            style={{ borderColor: `${accentColor}B3` }}
          >
            <Play size={playIconSize} color={accentColor} weight="fill" />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onTogglePlay}
      className={`${activeBorderClassName || containerClassName} ${dimmed ? 'opacity-70' : ''}`}
    >
      <Video
        source={{ uri: publicUrl }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={ResizeMode.COVER}
        surfaceType="textureView"
        useNativeControls={false}
        shouldPlay={true}
        isLooping={true}
        isMuted={true}
        onFirstFrameRender={handleFirstFrameRender}
        fallback={
          <Image
            source={muscleThumbnailSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        }
        onError={handleVideoError}
      />

      {!isFirstFrameReady && (
        <View className="absolute inset-0">
          <Image
            source={muscleThumbnailSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/45 items-center justify-center">
            <View
              className={`${badgeDimensions} rounded-full bg-black/80 border items-center justify-center`}
              style={{ borderColor: `${accentColor}B3` }}
            >
              <ActivityIndicator
                size="small"
                color={accentColor}
                style={{ transform: [{ scale: spinnerScale }] }}
              />
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
});

