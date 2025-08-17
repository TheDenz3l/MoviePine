'use client';

import { useEffect } from 'react';
import { useSettings } from './useSettings';

export function useApplyPlaybackSettings(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const { settings } = useSettings();

  useEffect(() => {
    if (!videoRef.current || !settings) return;

    const video = videoRef.current;
    const playbackSettings = settings.playback || {};

    // Apply default playback speed
    const defaultSpeed = playbackSettings.defaultSpeed || 1.0;
    if (video.playbackRate !== defaultSpeed) {
      video.playbackRate = defaultSpeed;
    }

    // Apply quality preference (this would need integration with video source selection)
    // For now, we'll store this for use in source selection logic
    const defaultQuality = playbackSettings.defaultQuality || 'auto';
    video.setAttribute('data-preferred-quality', defaultQuality);

  }, [settings, videoRef]);

  // Return settings for use in components
  return {
    autoplayNext: settings?.playback?.autoplayNext ?? true,
    skipIntros: settings?.playback?.skipIntros ?? false,
    defaultQuality: settings?.playback?.defaultQuality || 'auto',
    defaultSpeed: settings?.playback?.defaultSpeed || 1.0,
    autoplayCountdown: settings?.playback?.autoplayCountdown ?? 15,
    resumeThreshold: settings?.playback?.resumeThreshold ?? 10,
    preferredFormat: settings?.playback?.preferredFormat || 'auto'
  };
}
