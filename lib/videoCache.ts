import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// In-memory cache to prevent redundant filesystem lookups within the same session
const inMemoryUriCache = new Map<string, string>();
const activeDownloads = new Map<string, Promise<string>>();

/**
 * Returns the directory on device storage dedicated to caching workout videos.
 */
export function getVideoCacheDir(): string {
  const base = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  return `${base}workout_videos/`;
}

/**
 * Generates a clean, safe local filename from a video URL or key.
 */
export function getSanitizedVideoFilename(rawUrl: string): string {
  if (!rawUrl) return 'video.mp4';
  const clean = rawUrl.split('?')[0];
  const parts = clean.split('/');
  let last = parts[parts.length - 1] || 'video.mp4';
  last = last.replace(/[^a-zA-Z0-9._-]/g, '_') || 'video.mp4';
  if (!/\.[a-zA-Z0-9]{2,5}$/.test(last)) {
    last = `${last}.mp4`;
  }
  return last;
}

/**
 * Resolves a raw videoUrl or filename to its public Supabase Storage URL.
 */
export function getSupabaseVideoPublicUrl(rawUrl: any): string {
  if (!rawUrl) return '';
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : (rawUrl?.uri || String(rawUrl || '')).trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }
  return supabase.storage.from('workout-videos').getPublicUrl(url).data.publicUrl;
}

/**
 * Checks if the video is already saved in the local device cache.
 * If yes, returns the local file:// URI immediately.
 * If not, downloads and saves the video in the background to device cache for future instant access.
 */
export async function getCachedVideoUri(rawUrl: string): Promise<string> {
  if (!rawUrl) return '';

  // 1. Check in-memory session cache
  if (inMemoryUriCache.has(rawUrl)) {
    return inMemoryUriCache.get(rawUrl)!;
  }

  const publicUrl = getSupabaseVideoPublicUrl(rawUrl);
  if (!publicUrl) return '';

  const cacheDir = getVideoCacheDir();
  const fileName = getSanitizedVideoFilename(rawUrl);
  const localFileUri = `${cacheDir}${fileName}`;

  try {
    // 2. Check if file already exists in device local cache
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);
    if (fileInfo.exists && (fileInfo as any).size > 0) {
      inMemoryUriCache.set(rawUrl, localFileUri);
      return localFileUri;
    }

    // 3. If a download is already in progress for this URL, reuse the existing promise
    if (activeDownloads.has(rawUrl)) {
      return await activeDownloads.get(rawUrl)!;
    }

    // 4. Ensure cache directory exists on the device
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }

    // 5. Download and save the video file to device storage
    const downloadPromise = (async () => {
      try {
        const downloadResult = await FileSystem.downloadAsync(publicUrl, localFileUri);
        if (downloadResult && downloadResult.status === 200) {
          inMemoryUriCache.set(rawUrl, downloadResult.uri);
          return downloadResult.uri;
        }
        return publicUrl;
      } catch (downloadErr) {
        console.warn(`[videoCache] Download failed for ${fileName}, falling back to remote URL:`, downloadErr);
        return publicUrl;
      } finally {
        activeDownloads.delete(rawUrl);
      }
    })();

    activeDownloads.set(rawUrl, downloadPromise);
    return await downloadPromise;
  } catch (error) {
    console.warn(`[videoCache] Error in getCachedVideoUri for ${rawUrl}:`, error);
    return publicUrl;
  }
}

/**
 * Preload and cache a list of video URLs into the device in the background.
 */
export async function prefetchVideoList(rawUrls: (string | undefined | null)[]): Promise<void> {
  const valid = rawUrls.filter(Boolean) as string[];
  for (const url of valid) {
    getCachedVideoUri(url).catch(() => { });
  }
}

/**
 * React hook to get a cached local URI for a video.
 * Returns local file URI if cached on device, or immediately returns the remote URL while caching in background.
 */
export function useCachedVideoUri(rawUrl?: string | null): {
  uri: string | null;
  isCached: boolean;
  isReady: boolean;
} {
  const publicUrl = rawUrl ? getSupabaseVideoPublicUrl(rawUrl) : null;
  const initialCached = rawUrl ? inMemoryUriCache.get(rawUrl) : null;

  const [uri, setUri] = useState<string | null>(initialCached || publicUrl);
  const [isCached, setIsCached] = useState<boolean>(!!initialCached);
  const [isReady, setIsReady] = useState<boolean>(!!initialCached);

  useEffect(() => {
    let isMounted = true;
    if (!rawUrl) {
      setUri(null);
      setIsCached(false);
      setIsReady(true);
      return;
    }

    const currentPublic = getSupabaseVideoPublicUrl(rawUrl);
    if (inMemoryUriCache.has(rawUrl)) {
      setUri(inMemoryUriCache.get(rawUrl)!);
      setIsCached(true);
      setIsReady(true);
      return;
    }

    // Set remote URI for immediate playback without waiting
    setUri(currentPublic);

    getCachedVideoUri(rawUrl)
      .then((cachedUri) => {
        if (isMounted && cachedUri) {
          setUri(cachedUri);
          setIsCached(cachedUri.startsWith('file://'));
          setIsReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUri(currentPublic);
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [rawUrl]);

  return { uri, isCached, isReady };
}
