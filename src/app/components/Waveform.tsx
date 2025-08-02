"use client";

import { useEffect, useRef, useState } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
  isListening: boolean;
  isSpeaking?: boolean;
  width?: number;
  height?: number;
  backgroundColor?: string;
  waveColor?: string;
  silenceColor?: string;
  lineWidth?: number;
}

export function Waveform({
  analyser,
  isListening,
  isSpeaking = false,
  width = 800,
  height = 200,
  backgroundColor = "#1a1a1a",
  waveColor = "#00ff88",
  silenceColor = "#444444",
  lineWidth = 2,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isCurrentlySpeaking, setIsCurrentlySpeaking] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Smoothing for transitions
  const smoothingFactor = 0.8;
  const silenceThreshold = 0.01;

  // Handle responsive sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const containerWidth = container.clientWidth;
        // More generous sizing - ensure minimum width and use more of container
        const calculatedWidth = containerWidth * 0.95; // Use 95% of container width
        const minWidth = Math.max(calculatedWidth, 320); // Minimum 320px width
        const finalWidth = Math.min(minWidth, 800); // Maximum 800px width
        const aspectRatio = height / width;
        const responsiveHeight = finalWidth * aspectRatio;

        setCanvasSize({
          width: finalWidth,
          height: Math.min(responsiveHeight, 200), // Cap height at 200px
        });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [width, height]);

  const drawWaveform = () => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get frequency data from the analyser
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    // Calculate volume level for silence detection
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = (dataArray[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / bufferLength);

    // Smooth the volume level
    const currentVolume = rms;
    setVolumeLevel(
      (prev) => prev * smoothingFactor + currentVolume * (1 - smoothingFactor)
    );

    // Determine if currently speaking based on volume
    const speaking = currentVolume > silenceThreshold || isSpeaking;
    setIsCurrentlySpeaking(speaking);

    // Clear the canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (speaking) {
      // Draw active waveform when speaking
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = waveColor;
      ctx.beginPath();

      const sliceWidth = canvasSize.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Convert the audio data (0-255) to a y coordinate
        const v = dataArray[i] / 128.0; // Normalize to 0-2
        const y = (v * canvasSize.height) / 2; // Scale to canvas height

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
    } else {
      // Draw animated flat line when silent
      const centerY = canvasSize.height / 2;
      const time = Date.now() * 0.001; // Convert to seconds
      const pulseIntensity = 0.3 + 0.2 * Math.sin(time * 2); // Gentle pulsing

      ctx.lineWidth = 1;
      ctx.strokeStyle = silenceColor;
      ctx.globalAlpha = pulseIntensity;

      // Draw main flat line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvasSize.width, centerY);
      ctx.stroke();

      // Add subtle dots along the line for visual interest
      ctx.globalAlpha = pulseIntensity * 0.6;
      for (let x = 0; x < canvasSize.width; x += 40) {
        ctx.beginPath();
        ctx.arc(x, centerY, 1, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.globalAlpha = 1; // Reset alpha
    }

    // Continue the animation loop
    if (isListening) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  useEffect(() => {
    if (isListening && analyser) {
      // Start the waveform drawing animation
      drawWaveform();
    } else {
      // Stop the animation and clear the canvas
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Clear canvas when not listening
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

          // Draw a subtle flat line when not listening
          const centerY = canvasSize.height / 2;
          ctx.strokeStyle = silenceColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          ctx.lineTo(canvasSize.width, centerY);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isListening,
    analyser,
    backgroundColor,
    waveColor,
    silenceColor,
    lineWidth,
    canvasSize.width,
    canvasSize.height,
    isSpeaking,
  ]);

  return (
    <div className="flex flex-col items-center w-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`rounded-lg border-2 transition-colors duration-300 max-w-full ${
          isListening
            ? isCurrentlySpeaking
              ? "border-pink-500 shadow-lg shadow-pink-500/20"
              : "border-gray-300"
            : "border-gray-200"
        }`}
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          backgroundColor: backgroundColor,
        }}
      />
    </div>
  );
}
