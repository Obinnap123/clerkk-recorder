"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useMicrophone } from "@/lib/useMicrophone";
import { Waveform } from "./Waveform";

export default function RecorderApp() {
  const [isLightMode, setIsLightMode] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0); // Time in seconds
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Microphone hook
  const {
    isListening,
    isSpeaking,
    hasPermission,
    audioLevel,
    analyser,
    startListening,
    stopListening,
    error,
  } = useMicrophone();

  // Timer effect - runs when recording and not paused
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording && isListening && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, isListening, isPaused]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle start/stop/pause recording
  const handleRecordingToggle = async () => {
    if (!isRecording && !isPaused) {
      // Start recording
      await startListening();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0); // Reset timer
    } else if (isRecording && !isPaused) {
      // Pause recording
      stopListening();
      setIsPaused(true);
    } else if (isPaused) {
      // Resume recording
      await startListening();
      setIsPaused(false);
    }
  };

  // Handle stop recording (complete stop)
  const handleStopRecording = () => {
    stopListening();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-start px-4 py-6 transition-colors duration-300 ${
        isLightMode ? "bg-white text-black" : "bg-[#161618] text-white"
      }`}
    >
      {/* Header */}
      <header className="w-full flex justify-between items-center max-w-5xl">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/assets/img/logo.png"
            alt="Clerkk Logo"
            width={120}
            height={40}
            priority
          />
        </div>

        {/* Theme Toggle - Sliding Switch */}
        <div
          className="relative w-24 h-8 bg-gray-200 rounded-full shadow-inner cursor-pointer transition-colors duration-300"
          onClick={() => setIsLightMode(!isLightMode)}
        >
          {/* Sliding Pink Circle */}
          <div
            className={`absolute top-1 w-6 h-6 bg-pink-600 rounded-full shadow-md transition-transform duration-300 ease-in-out ${
              isLightMode ? "translate-x-1" : "translate-x-16"
            }`}
          />

          {/* Light Mode - Left Side */}
          <div
            className={`absolute left-1 top-0 h-full flex items-center space-x-1 px-1 transition-opacity duration-300 ${
              isLightMode ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-xs text-pink-600">☀️</span>
            <span className="text-xs font-medium text-pink-600">Light</span>
          </div>

          {/* Dark Mode - Right Side */}
          <div
            className={`absolute right-1 top-0 h-full flex items-center space-x-1 px-1 transition-opacity duration-300 ${
              !isLightMode ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-xs text-pink-600">🌙</span>
            <span className="text-xs font-medium text-pink-600">Dark</span>
          </div>
        </div>
      </header>

      {/* Title */}
      <h1 className="text-2xl font-semibold mt-16">Recorder</h1>

      {/* Waveform Container */}
      <div className="relative mt-10 w-full max-w-4xl px-6 md:px-8 py-4 flex flex-col items-center justify-center">
        {/* Time Badge - Positioned at the top line of waveform */}
        <span
          className={`absolute top-1 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-sm rounded border z-10 transition-colors duration-300 ${
            isLightMode
              ? "bg-white text-black border-pink-600"
              : "bg-[#161618] text-white border-pink-600"
          } ${isRecording && !isPaused ? "animate-pulse" : ""}`}
        >
          {formatTime(recordingTime)}
        </span>

        {/* Waveform Component */}
        <Waveform
          analyser={analyser}
          isListening={isListening}
          isSpeaking={isSpeaking}
          width={800}
          height={160}
          backgroundColor={isLightMode ? "#ffffff" : "#1a1a1a"}
          waveColor="#ec4899"
          silenceColor={isLightMode ? "#d1d5db" : "#6b7280"}
          lineWidth={2}
        />
      </div>

      {/* Recording Buttons - Truly Centered */}
      <div className="flex items-center justify-center gap-8 mt-8">
        {/* Dynamic Recording Button */}
        <button
          className="bg-transparent border-none p-0 transition-transform duration-200 hover:scale-105 active:scale-95"
          onClick={handleRecordingToggle}
        >
          {!isRecording && !isPaused ? (
            // Start Recording Button
            <Image
              src="/assets/img/start-start-record.png"
              alt="Start Recording"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20"
            />
          ) : isPaused ? (
            // Play/Resume Button when paused
            <Image
              src="/assets/img/play-icon.svg"
              alt="Resume Recording"
              width={56}
              height={56}
              className="w-12 h-12 sm:w-14 sm:h-14"
            />
          ) : (
            // Pause Button when recording
            <Image
              src="/assets/img/pause-record.svg"
              alt="Pause Recording"
              width={56}
              height={56}
              className="w-12 h-12 sm:w-14 sm:h-14"
            />
          )}
        </button>

        {/* Stop Recording Button */}
        <button
          className="bg-transparent border-none p-0 transition-transform duration-200 hover:scale-105 active:scale-95"
          onClick={handleStopRecording}
        >
          <Image
            src="/assets/img/stop-record.svg"
            alt="Stop Recording"
            width={56}
            height={56}
            className="w-12 h-12 sm:w-14 sm:h-14"
          />
        </button>
      </div>

      {/* Download Button - Responsive positioning */}
      <div className="w-full flex justify-center sm:justify-end max-w-5xl mt-6 sm:mt-8 px-4 sm:px-0">
        <button className="bg-white shadow-lg border border-gray-300 px-4 py-2 sm:px-6 sm:py-3 rounded-lg flex items-center space-x-2 text-sm sm:text-base">
          <Image
            src="/assets/img/download-icon.svg"
            alt="Download"
            width={20}
            height={20}
            className="w-4 h-4 sm:w-5 sm:h-5"
          />
          <span className="text-pink-600 font-bold">Download</span>
        </button>
      </div>
    </div>
  );
}
