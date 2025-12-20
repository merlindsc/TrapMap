/**
 * Haptic Feedback Utilities for Mobile Devices
 * Provides tactile feedback for touch interactions
 */

/**
 * Check if haptic feedback is supported
 */
export const isHapticsSupported = () => {
  return (
    typeof window !== 'undefined' &&
    (
      'vibrate' in navigator ||
      (window.navigator && 'vibrate' in window.navigator)
    )
  );
};

/**
 * Trigger light haptic feedback (for selections, taps)
 */
export const hapticLight = () => {
  if (!isHapticsSupported()) return;
  
  try {
    // Try modern Haptics API first (iOS)
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
      return;
    }
    
    // Fallback to vibration API
    navigator.vibrate(10);
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Trigger medium haptic feedback (for button presses)
 */
export const hapticMedium = () => {
  if (!isHapticsSupported()) return;
  
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
      return;
    }
    
    navigator.vibrate(20);
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Trigger heavy haptic feedback (for important actions, errors)
 */
export const hapticHeavy = () => {
  if (!isHapticsSupported()) return;
  
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
      return;
    }
    
    navigator.vibrate(30);
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Trigger selection haptic feedback (for list items, toggles)
 */
export const hapticSelection = () => {
  if (!isHapticsSupported()) return;
  
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.selectionStart();
      return;
    }
    
    navigator.vibrate(5);
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Trigger success haptic feedback
 */
export const hapticSuccess = () => {
  if (!isHapticsSupported()) return;
  
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
      return;
    }
    
    // Double pulse for success
    navigator.vibrate([10, 50, 10]);
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Trigger error haptic feedback
 */
export const hapticError = () => {
  if (!isHapticsSupported()) return;
  
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.notification({ type: 'ERROR' });
      return;
    }
    
    // Three pulses for error
    navigator.vibrate([30, 50, 30, 50, 30]);
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Trigger warning haptic feedback
 */
export const hapticWarning = () => {
  if (!isHapticsSupported()) return;
  
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      window.Capacitor.Plugins.Haptics.notification({ type: 'WARNING' });
      return;
    }
    
    // Long pulse for warning
    navigator.vibrate([20, 100, 20]);
  } catch (error) {
    console.debug('Haptic feedback not available:', error);
  }
};
