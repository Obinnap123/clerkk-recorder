"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseMicrophoneReturn {
  isListening: boolean;
  isSpeaking: boolean;
  hasPermission: boolean | null;
  audioLevel: number;
  analyser: AnalyserNode | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
}

export function useMicrophone(): UseMicrophoneReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Enhanced silence detection
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeHistoryRef = useRef<number[]>([]);
  const lastSpeakingTimeRef = useRef<number>(0);

  const SILENCE_THRESHOLD = 0.005;
  const SILENCE_DELAY = 800; // ms to wait before marking as silent
  const VOLUME_HISTORY_SIZE = 10; // frames to keep in history
  const MIN_SPEAKING_DURATION = 200; // minimum ms to be considered speaking

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255;
    setAudioLevel(normalizedLevel);

    // Add to volume history for smoothing
    volumeHistoryRef.current.push(normalizedLevel);
    if (volumeHistoryRef.current.length > VOLUME_HISTORY_SIZE) {
      volumeHistoryRef.current.shift();
    }

    // Calculate smoothed average from recent history
    const smoothedLevel =
      volumeHistoryRef.current.reduce((a, b) => a + b, 0) /
      volumeHistoryRef.current.length;
    const currentTime = Date.now();
    const isCurrentlyAboveThreshold = smoothedLevel > SILENCE_THRESHOLD;

    if (isCurrentlyAboveThreshold) {
      // User is speaking - clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Only mark as speaking if we're not already speaking or enough time has passed
      if (!isSpeaking) {
        lastSpeakingTimeRef.current = currentTime;
        setIsSpeaking(true);
        console.log("🎤 User started speaking...");
      }
    } else {
      // Volume is below threshold
      if (isSpeaking && !silenceTimeoutRef.current) {
        // User was speaking but volume dropped - start silence timer
        silenceTimeoutRef.current = setTimeout(() => {
          const speakingDuration = Date.now() - lastSpeakingTimeRef.current;

          // Only mark as silent if they were speaking for a minimum duration
          if (speakingDuration >= MIN_SPEAKING_DURATION) {
            setIsSpeaking(false);
            console.log("🔇 User silent");
          }

          silenceTimeoutRef.current = null;
        }, SILENCE_DELAY);
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [isSpeaking]);

  const stopListening = useCallback((): void => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    volumeHistoryRef.current = [];
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    console.log("🛑 Stopped listening to microphone");
  }, []);

  const startListening = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);
      setIsListening(true);

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      analyzeAudio();
      console.log("🎉 Microphone access granted! Listening for sound...");
    } catch (err) {
      console.error("❌ Microphone access denied:", err);
      setError(
        "Microphone access denied. Please allow microphone permissions."
      );
      setHasPermission(false);
    }
  }, [analyzeAudio]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isSpeaking,
    hasPermission,
    audioLevel,
    analyser: analyserRef.current,
    startListening,
    stopListening,
    error,
  };
}
