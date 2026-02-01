import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubtitleEntry {
  id: number;
  text: string;
  timestamp: number;
}

export function useRealtimeSubtitles(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitleHistory, setSubtitleHistory] = useState<SubtitleEntry[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subtitleIdRef = useRef(0);

  // Convert Float32Array to WAV base64
  const floatTo16BitPCM = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }, []);

  const createWavBlob = useCallback((samples: Int16Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    // Audio data
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true);
    }

    return new Blob([buffer], { type: "audio/wav" });
  }, []);

  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }, []);

  const processAudioChunk = useCallback(async () => {
    if (audioBufferRef.current.length === 0 || isProcessing) return;

    setIsProcessing(true);

    try {
      // Combine all buffered audio
      const totalLength = audioBufferRef.current.reduce((acc, arr) => acc + arr.length, 0);
      const combined = new Float32Array(totalLength);
      let offset = 0;
      for (const arr of audioBufferRef.current) {
        combined.set(arr, offset);
        offset += arr.length;
      }
      audioBufferRef.current = [];

      // Convert to WAV
      const pcm = floatTo16BitPCM(combined);
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const wavBlob = createWavBlob(pcm, sampleRate);
      const arrayBuffer = await wavBlob.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);

      // Send to edge function
      const { data, error } = await supabase.functions.invoke("realtime-subtitles", {
        body: { audioBase64: base64, targetLanguage: "es" },
      });

      if (error) {
        console.error("Subtitle API error:", error);
        return;
      }

      if (data?.subtitle && data.subtitle.trim()) {
        const newSubtitle: SubtitleEntry = {
          id: subtitleIdRef.current++,
          text: data.subtitle,
          timestamp: Date.now(),
        };
        setCurrentSubtitle(data.subtitle);
        setSubtitleHistory((prev) => [...prev.slice(-4), newSubtitle]);

        // Clear subtitle after 5 seconds
        setTimeout(() => {
          setCurrentSubtitle((curr) => (curr === data.subtitle ? "" : curr));
        }, 5000);
      }
    } catch (err) {
      console.error("Error processing audio:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, floatTo16BitPCM, createWavBlob, arrayBufferToBase64]);

  const startSubtitles = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      toast.error("No hay video disponible");
      return;
    }

    try {
      // Create audio context
      audioContextRef.current = new AudioContext();
      
      // Connect video to audio context
      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(video);
        sourceRef.current.connect(audioContextRef.current.destination);
      }

      // Create processor for capturing audio
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBufferRef.current.push(new Float32Array(inputData));
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Process audio every 4 seconds
      processingIntervalRef.current = setInterval(processAudioChunk, 4000);

      setIsEnabled(true);
      toast.success("Subtítulos IA activados");
    } catch (err) {
      console.error("Error starting subtitles:", err);
      toast.error("Error al activar subtítulos. El video debe estar reproduciéndose.");
    }
  }, [videoRef, processAudioChunk]);

  const stopSubtitles = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    audioBufferRef.current = [];
    setIsEnabled(false);
    setCurrentSubtitle("");
    setSubtitleHistory([]);
    toast.info("Subtítulos desactivados");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
    };
  }, []);

  return {
    isEnabled,
    currentSubtitle,
    isProcessing,
    subtitleHistory,
    startSubtitles,
    stopSubtitles,
    toggleSubtitles: isEnabled ? stopSubtitles : startSubtitles,
  };
}
