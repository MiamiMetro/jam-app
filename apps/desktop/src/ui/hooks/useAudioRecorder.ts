import {
  useState,
  useRef,
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

export interface RecordedAudio {
  blob: Blob;
  url: string;
  duration: number;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(
    null,
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wavChunksRef = useRef<Float32Array[]>([]);
  const wavSampleRateRef = useRef(48000);
  const wavSampleCountRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getCompatibleMediaRecorderType();
      if (!mimeType) {
        startWavRecording(stream, {
          audioContextRef,
          processorRef,
          wavChunksRef,
          wavSampleCountRef,
          wavSampleRateRef,
        });
        setIsRecording(true);
        startTimeRef.current = Date.now();
        startTimer(setRecordingTime, startTimeRef, timerRef);
        return;
      }

      const options: MediaRecorderOptions = { mimeType };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        setRecordedAudioFromBlob(
          audioBlob,
          setRecordedAudio,
          startTimeRef.current,
        );
        stopStream(streamRef);
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      startTimer(setRecordingTime, startTimeRef, timerRef);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      stopTimer(timerRef);
      return;
    }

    if (audioContextRef.current && isRecording) {
      const audioBlob = finalizeWavRecording(
        audioContextRef,
        processorRef,
        wavChunksRef,
        wavSampleRateRef.current,
        wavSampleCountRef.current,
      );
      setRecordedAudioFromBlob(
        audioBlob,
        setRecordedAudio,
        startTimeRef.current,
      );
      stopStream(streamRef);
      setIsRecording(false);
      stopTimer(timerRef);
    }
  }, [isRecording]);

  const deleteRecording = useCallback(() => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
    setRecordingTime(0);

    // Clean up any ongoing recording
    if (isRecording) {
      stopRecording();
    }

    stopStream(streamRef);
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    processorRef.current = null;
  }, [recordedAudio, isRecording, stopRecording]);

  const getAudioFile = useCallback((): File | null => {
    if (!recordedAudio) return null;

    const mimeType = recordedAudio.blob.type || "audio/wav";
    let extension = "wav";
    if (mimeType.includes("mp4")) extension = "mp4";
    else if (mimeType.includes("aac")) extension = "aac";
    else if (mimeType.includes("ogg")) extension = "ogg";
    else if (mimeType.includes("mpeg")) extension = "mp3";
    else if (mimeType.includes("wav")) extension = "wav";

    // Convert blob to File while preserving the detected MIME type.
    const file = new File(
      [recordedAudio.blob],
      `recording-${Date.now()}.${extension}`,
      {
        type: mimeType,
      },
    );

    return file;
  }, [recordedAudio]);

  return {
    isRecording,
    recordedAudio,
    recordingTime,
    startRecording,
    stopRecording,
    deleteRecording,
    getAudioFile,
  };
}

function getCompatibleMediaRecorderType() {
  const candidates = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/aac"];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function startWavRecording(
  stream: MediaStream,
  refs: {
    audioContextRef: MutableRefObject<AudioContext | null>;
    processorRef: MutableRefObject<ScriptProcessorNode | null>;
    wavChunksRef: MutableRefObject<Float32Array[]>;
    wavSampleCountRef: MutableRefObject<number>;
    wavSampleRateRef: MutableRefObject<number>;
  },
) {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("AudioContext is not available.");
  }

  const audioContext = new AudioContextClass();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;

  refs.wavChunksRef.current = [];
  refs.wavSampleCountRef.current = 0;
  refs.wavSampleRateRef.current = audioContext.sampleRate;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const chunk = new Float32Array(input.length);
    chunk.set(input);
    refs.wavChunksRef.current.push(chunk);
    refs.wavSampleCountRef.current += chunk.length;
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  refs.audioContextRef.current = audioContext;
  refs.processorRef.current = processor;
}

function finalizeWavRecording(
  audioContextRef: MutableRefObject<AudioContext | null>,
  processorRef: MutableRefObject<ScriptProcessorNode | null>,
  wavChunksRef: MutableRefObject<Float32Array[]>,
  sampleRate: number,
  sampleCount: number,
) {
  if (processorRef.current) {
    processorRef.current.onaudioprocess = null;
    processorRef.current.disconnect();
    processorRef.current = null;
  }

  void audioContextRef.current?.close();
  audioContextRef.current = null;

  const wav = encodeMonoPcm16Wav(wavChunksRef.current, sampleRate, sampleCount);
  wavChunksRef.current = [];
  return new Blob([wav], { type: "audio/wav" });
}

function encodeMonoPcm16Wav(
  chunks: Float32Array[],
  sampleRate: number,
  sampleCount: number,
) {
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += bytesPerSample;
    }
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function setRecordedAudioFromBlob(
  audioBlob: Blob,
  setRecordedAudio: Dispatch<SetStateAction<RecordedAudio | null>>,
  startedAt: number,
) {
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  const setFallbackRecording = () => {
    const fallbackDuration = Math.round((Date.now() - startedAt) / 1000);
    setRecordedAudio(
      (prev) =>
        prev ?? {
          blob: audioBlob,
          url: audioUrl,
          duration: fallbackDuration,
        },
    );
  };

  const cleanup = () => {
    audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    audio.removeEventListener("error", handleError);
    audio.removeEventListener("canplay", handleCanPlay);
  };

  const setFromMetadata = () => {
    if (
      audio.duration &&
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      setRecordedAudio({
        blob: audioBlob,
        url: audioUrl,
        duration: Math.round(audio.duration),
      });
      cleanup();
      return true;
    }
    return false;
  };

  const handleLoadedMetadata = () => {
    if (!setFromMetadata()) setFallbackRecording();
    cleanup();
  };

  const handleError = (error: ErrorEvent) => {
    console.error("Error loading recorded audio metadata:", error);
    setFallbackRecording();
    cleanup();
  };

  const handleCanPlay = () => {
    setFromMetadata();
  };

  audio.addEventListener("loadedmetadata", handleLoadedMetadata);
  audio.addEventListener("error", handleError);
  audio.addEventListener("canplay", handleCanPlay);

  try {
    audio.load();
  } catch (error) {
    console.error("Error loading audio:", error);
    setFallbackRecording();
    cleanup();
  }

  window.setTimeout(setFallbackRecording, 1000);
}

function startTimer(
  setRecordingTime: Dispatch<SetStateAction<number>>,
  startTimeRef: MutableRefObject<number>,
  timerRef: MutableRefObject<number | null>,
) {
  stopTimer(timerRef);
  timerRef.current = window.setInterval(() => {
    setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
  }, 100);
}

function stopTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current !== null) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function stopStream(streamRef: MutableRefObject<MediaStream | null>) {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
}
