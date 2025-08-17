'use client';

import { useEffect } from 'react';
import { useSettings } from './useSettings';

export function useApplySubtitleSettings() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings?.subtitles) return;

    const subtitleSettings = settings.subtitles;
    
    // Create CSS custom properties for subtitle styling
    const root = document.documentElement;
    
    // Font size mapping
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px',
      'large': '20px',
      'x-large': '24px'
    };
    
    // Background mapping
    const backgroundMap = {
      'transparent': 'transparent',
      'black': 'rgba(0, 0, 0, 1)',
      'semi-black': 'rgba(0, 0, 0, 0.7)',
      'white': 'rgba(255, 255, 255, 1)'
    };

    // Apply CSS custom properties
    root.style.setProperty('--subtitle-color', subtitleSettings.color || '#ffffff');
    root.style.setProperty('--subtitle-font-size', fontSizeMap[subtitleSettings.fontSize as keyof typeof fontSizeMap] || '16px');
    root.style.setProperty('--subtitle-background', backgroundMap[subtitleSettings.background as keyof typeof backgroundMap] || 'transparent');
    root.style.setProperty('--subtitle-opacity', (subtitleSettings.opacity || 1.0).toString());
    
    // Add text shadow for better readability when background is transparent
    const textShadow = subtitleSettings.background === 'transparent' 
      ? '1px 1px 2px rgba(0, 0, 0, 0.7)' 
      : 'none';
    root.style.setProperty('--subtitle-text-shadow', textShadow);

  }, [settings]);

  // Return settings for component use
  return {
    language: settings?.subtitles?.language || 'en',
    fontSize: settings?.subtitles?.fontSize || 'medium',
    color: settings?.subtitles?.color || '#ffffff',
    background: settings?.subtitles?.background || 'transparent',
    opacity: settings?.subtitles?.opacity || 1.0
  };
}

// CSS classes that components can use
export const subtitleClasses = {
  subtitle: 'subtitle-styled',
  container: 'subtitle-container'
};

// Global CSS that should be added to the app
export const subtitleGlobalCSS = `
.subtitle-styled {
  color: var(--subtitle-color, #ffffff);
  font-size: var(--subtitle-font-size, 16px);
  background-color: var(--subtitle-background, transparent);
  opacity: var(--subtitle-opacity, 1);
  text-shadow: var(--subtitle-text-shadow, 1px 1px 2px rgba(0, 0, 0, 0.7));
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  line-height: 1.4;
}

.subtitle-container {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 30;
  pointer-events: none;
  max-width: 80%;
}
`;
