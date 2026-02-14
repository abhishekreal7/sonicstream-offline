import { useState, useEffect } from 'react';

export const useBluetoothStatus = () => {
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);

  useEffect(() => {
    // Ensure browser API availability
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const checkDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

        // Keywords to identify potential Bluetooth devices in the label
        // Note: Browser privacy may mask labels unless permission is granted, 
        // in which case this safely falls back to false (neutral icon).
        const bluetoothKeywords = [
          'bluetooth',
          'airpods',
          'wireless',
          'headphone',
          'headset',
          'buds',
          'beats',
          'bose',
          'sony',
          'wh-1000', // Common Sony models
          'wf-1000'
        ];

        const isConnected = audioOutputs.some(device => {
          const label = (device.label || '').toLowerCase();
          return bluetoothKeywords.some(keyword => label.includes(keyword));
        });

        setIsBluetoothConnected(isConnected);
      } catch (error) {
        // Fail silently and keep icon neutral
        console.debug('Bluetooth detection skipped:', error);
      }
    };

    // Initial check
    checkDevices();

    // Listen for hardware changes (connecting/disconnecting devices)
    const handleDeviceChange = () => {
      checkDevices();
    };

    try {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    } catch (e) {
      console.debug('Device change listener not supported', e);
    }

    return () => {
      try {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  // ... (keep useEffect for auto-detection) ...

  const toggleOverride = () => {
    setManualOverride(prev => !prev);
  };

  // If manual override is set, use it. Otherwise use auto-detection.
  return [manualOverride !== null ? manualOverride : isBluetoothConnected, toggleOverride] as const;
};