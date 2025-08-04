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
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Silence threshold for detection
  const silenceThreshold = 0.01;

  // Handle responsive sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const containerWidth = container.clientWidth;
        const calculatedWidth = containerWidth * 0.95;
        const minWidth = Math.max(calculatedWidth, 320);
        const finalWidth = Math.min(minWidth, 800);
        const aspectRatio = height / width;
        const responsiveHeight = finalWidth * aspectRatio;

        setCanvasSize({
          width: finalWidth,
          height: Math.min(responsiveHeight, 200),
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

    // Get frequency data from the analyser for detection (background logic)
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

    // Use current volume for speaking detection
    const currentVolume = rms;

    // Determine if currently speaking based on volume
    const speaking = currentVolume > silenceThreshold || isSpeaking;

    // Clear the canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // VISUAL OVERLAY - This is what the user sees
    if (speaking && currentVolume > silenceThreshold) {
      // Draw clean animated sine wave overlay only when actually speaking
      const centerY = canvasSize.height / 2;
      const amplitude = canvasSize.height / 2 - 10; // Full height minus small padding
      const frequency = 0.02; // Wave frequency
      const speed = 2; // Animation speed
      const now = Date.now();
      const time = (now / 1000) * speed;

      // First draw the pink center line
      ctx.strokeStyle = "#ec4899"; // Pink color
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvasSize.width, centerY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Then draw the animated sine wave on top
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = waveColor;
      ctx.beginPath();

      for (let x = 0; x < canvasSize.width; x++) {
        const y = centerY + amplitude * Math.sin(x * frequency + time);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    } else {
      // Draw flat line when silent
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

    if (isListening) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  useEffect(() => {
    if (isListening) {
      drawWaveform();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

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

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isListening,
    backgroundColor,
    waveColor,
    silenceColor,
    lineWidth,
    canvasSize,
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
            ? isSpeaking
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
