"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  ArrowUp,
  FileText,
  ImageIcon,
  Mic,
  Paperclip,
  Send,
  Square,
  StopCircle,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type SpeechRecognitionInstance = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type BrowserWindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type BrowserWindowWithAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export type AiPromptAttachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  sizeLabel: string;
  previewUrl?: string;
};

export type AiPromptSlashCommand = {
  id: string;
  label: string;
  description: string;
};

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={1}
    className={cn(
      "flex max-h-[240px] min-h-[44px] w-full resize-none rounded-md border-none bg-transparent px-3 py-2.5 text-base leading-6 text-gray-100 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50",
      "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#444444] hover:scrollbar-thumb-[#555555]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-[#333333] bg-[#1f2023] px-3 py-1.5 text-sm text-white shadow-md",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-[#333333] bg-[#1f2023] p-0 shadow-xl md:max-w-[800px]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2e3033]/80 p-2 transition hover:bg-[#2e3033]">
        <X className="h-5 w-5 text-gray-200" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-100", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-white text-black hover:bg-white/80",
      outline: "border border-[#444444] bg-transparent hover:bg-[#3a3a40]",
      ghost: "bg-transparent hover:bg-[#3a3a40]",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "aspect-square h-8 w-8 rounded-full",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

type VoiceRecorderProps = {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  errorMessage: string | null;
  levels: number[];
  onStopDictation: () => void;
  onTranscribeAndSend: () => void;
  visualizerBars?: number;
};

function VoiceRecorder({
  isRecording,
  transcript,
  interimTranscript,
  errorMessage,
  levels,
  onStopDictation,
  onTranscribeAndSend,
  visualizerBars = 32,
}: VoiceRecorderProps) {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const displayTranscript = [transcript, interimTranscript].filter(Boolean).join(" ").trim();

  React.useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    setTime(0);
    timerRef.current = setInterval(() => setTime((current) => current + 1), 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const formattedTime = `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${(time % 60).toString().padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center py-4 transition-all duration-300",
        isRecording ? "min-h-[104px] opacity-100" : "h-0 overflow-hidden opacity-0",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse" />
        <span className="font-mono text-sm text-white/80">{formattedTime}</span>
      </div>
      <div
        data-slot="hermes-voice-waveform"
        className="flex h-12 w-full items-center justify-center gap-[3px] overflow-hidden rounded-2xl bg-white/[0.03] px-4"
        aria-hidden="true"
      >
        {Array.from({ length: visualizerBars }, (_, index) => {
          const level = levels[index] ?? 0.08;
          const scale = Math.max(0.08, Math.min(1, level));

          return (
          <div
            key={index}
            className="hermes-voice-bar h-full w-[3px] rounded-full bg-gradient-to-b from-red-300 via-white/75 to-red-400/80"
            style={
              {
                transform: `scaleY(${scale})`,
                opacity: 0.4 + scale * 0.6,
              } as React.CSSProperties
            }
          />
          );
        })}
      </div>
      <p
        data-slot="hermes-voice-transcript"
        className="mt-3 min-h-6 w-full px-3 text-center text-sm leading-6 text-white/75"
      >
        {errorMessage ?? displayTranscript ?? "Listening..."}
      </p>
      <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          data-slot="hermes-stop-dictation"
          onClick={onStopDictation}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 text-sm text-white/80 transition hover:bg-white/[0.08] hover:text-white"
        >
          <StopCircle className="h-4 w-4 text-red-400" />
          Stop dictation
        </button>
        <button
          type="button"
          data-slot="hermes-transcribe-send"
          onClick={onTranscribeAndSend}
          disabled={!displayTranscript}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-[#1f2023] transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send className="h-4 w-4" />
          Transcribe and send
        </button>
      </div>
    </div>
  );
}

function ImageViewDialog({ imageUrl, onClose }: { imageUrl: string | null; onClose: () => void }) {
  if (!imageUrl) {
    return null;
  }

  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-[#1f2023] shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Full preview" className="max-h-[80vh] w-full rounded-2xl object-contain" />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function PromptInputAction({
  tooltip,
  children,
  side = "top",
}: {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export type PromptInputBoxProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  attachments?: AiPromptAttachment[];
  slashCommands?: AiPromptSlashCommand[];
  onAttachClick?: () => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onSlashCommandSelect?: (command: AiPromptSlashCommand) => void;
  onPaste?: React.ClipboardEventHandler<HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onFilesDrop?: (files: File[]) => void;
  onVoiceMessage?: (message: string) => void;
};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as BrowserWindowWithSpeechRecognition;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function mergePromptValue(currentValue: string, transcript: string) {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) {
    return currentValue;
  }

  const trimmedValue = currentValue.trimEnd();
  return trimmedValue ? `${trimmedValue} ${trimmedTranscript}` : trimmedTranscript;
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  (
    {
      value,
      onValueChange,
      onSubmit,
      isLoading = false,
      placeholder = "Type your message here...",
      className,
      attachments = [],
      slashCommands = [],
      onAttachClick,
      onRemoveAttachment,
      onSlashCommandSelect,
      onPaste,
      onKeyDown,
      onFilesDrop,
      onVoiceMessage,
    },
    ref,
  ) => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [voiceTranscript, setVoiceTranscript] = React.useState("");
    const [interimVoiceTranscript, setInterimVoiceTranscript] = React.useState("");
    const [voiceError, setVoiceError] = React.useState<string | null>(null);
    const [voiceLevels, setVoiceLevels] = React.useState<number[]>(() => Array.from({ length: 32 }, () => 0.08));
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
    const mediaStreamRef = React.useRef<MediaStream | null>(null);
    const audioContextRef = React.useRef<AudioContext | null>(null);
    const animationFrameRef = React.useRef<number | null>(null);
    const shouldRestartRecognitionRef = React.useRef(false);
    const finalTranscriptRef = React.useRef("");
    const interimTranscriptRef = React.useRef("");
    const canSend = value.trim().length > 0 || attachments.length > 0;

    const stopMicrophone = React.useCallback(() => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      setVoiceLevels(Array.from({ length: 32 }, () => 0.08));
    }, []);

    const stopRecognition = React.useCallback(() => {
      shouldRestartRecognitionRef.current = false;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        try {
          recognition.stop();
        } catch {
          recognition.abort();
        }
      }
    }, []);

    const stopDictationSession = React.useCallback(() => {
      stopRecognition();
      stopMicrophone();
      setIsRecording(false);
    }, [stopMicrophone, stopRecognition]);

    const getCurrentVoiceTranscript = React.useCallback(
      () => [finalTranscriptRef.current, interimTranscriptRef.current].filter(Boolean).join(" ").trim(),
      [],
    );

    const commitDictationToDraft = React.useCallback(() => {
      const transcript = getCurrentVoiceTranscript();
      stopDictationSession();
      if (transcript) {
        onValueChange(mergePromptValue(value, transcript));
      }
      setInterimVoiceTranscript("");
    }, [getCurrentVoiceTranscript, onValueChange, stopDictationSession, value]);

    const transcribeAndSend = React.useCallback(() => {
      const transcript = getCurrentVoiceTranscript();
      stopDictationSession();
      setInterimVoiceTranscript("");

      if (transcript) {
        onVoiceMessage?.(mergePromptValue(value, transcript).trim());
      }
    }, [getCurrentVoiceTranscript, onVoiceMessage, stopDictationSession, value]);

    const startMicrophoneVisualizer = React.useCallback(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceError("Microphone access is not available in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextConstructor = window.AudioContext ?? (window as BrowserWindowWithAudioContext).webkitAudioContext;
        const audioContext = new AudioContextConstructor();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        mediaStreamRef.current = stream;
        audioContextRef.current = audioContext;

        const updateLevels = () => {
          analyser.getByteFrequencyData(frequencyData);
          const barCount = 32;
          const bucketSize = Math.max(1, Math.floor(frequencyData.length / barCount));
          const nextLevels = Array.from({ length: barCount }, (_, index) => {
            const start = index * bucketSize;
            const bucket = frequencyData.slice(start, start + bucketSize);
            const average = bucket.reduce((sum, level) => sum + level, 0) / Math.max(1, bucket.length);
            return 0.08 + Math.min(0.92, average / 180);
          });

          setVoiceLevels(nextLevels);
          animationFrameRef.current = window.requestAnimationFrame(updateLevels);
        };

        updateLevels();
      } catch {
        setVoiceError("Microphone permission was blocked.");
      }
    }, []);

    const startSpeechRecognition = React.useCallback(() => {
      const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
      if (!SpeechRecognitionConstructor) {
        setVoiceError("Speech transcription is not available in this browser.");
        return;
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.onresult = (event) => {
        let interimTranscript = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript ?? "";

          if (result.isFinal) {
            finalTranscriptRef.current = [finalTranscriptRef.current, transcript].filter(Boolean).join(" ").trim();
          } else {
            interimTranscript = [interimTranscript, transcript].filter(Boolean).join(" ").trim();
          }
        }

        interimTranscriptRef.current = interimTranscript;
        setVoiceTranscript(finalTranscriptRef.current);
        setInterimVoiceTranscript(interimTranscript);
      };
      recognition.onerror = (event) => {
        if (event.error === "no-speech") {
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          shouldRestartRecognitionRef.current = false;
        }

        setVoiceError(event.error === "not-allowed" ? "Microphone permission was blocked." : `Dictation stopped: ${event.error}.`);
      };
      recognition.onend = () => {
        if (shouldRestartRecognitionRef.current) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      shouldRestartRecognitionRef.current = true;
      try {
        recognition.start();
      } catch {
        setVoiceError("Dictation could not start.");
      }
    }, []);

    const startDictationSession = React.useCallback(() => {
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      setVoiceTranscript("");
      setInterimVoiceTranscript("");
      setVoiceError(null);
      setIsRecording(true);
      void startMicrophoneVisualizer();
      startSpeechRecognition();
    }, [startMicrophoneVisualizer, startSpeechRecognition]);

    React.useEffect(() => stopDictationSession, [stopDictationSession]);

    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    }, [value]);

    const handleDrop = React.useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!onFilesDrop) {
          return;
        }

        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length === 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onFilesDrop(files);
      },
      [onFilesDrop],
    );

    return (
      <TooltipProvider>
        <style>
          {`
            textarea::-webkit-scrollbar { width: 6px; }
            textarea::-webkit-scrollbar-track { background: transparent; }
            textarea::-webkit-scrollbar-thumb { background-color: #444444; border-radius: 3px; }
            textarea::-webkit-scrollbar-thumb:hover { background-color: #555555; }
            .hermes-voice-bar {
              transform-origin: center;
              transition: transform 90ms linear, opacity 90ms linear;
            }
          `}
        </style>
        <div
          ref={ref}
          data-slot="hermes-composer"
          className={cn(
            "rounded-3xl border border-[#444444] bg-[#1f2023] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
            isRecording && "border-red-500/70",
            isLoading && "border-white/25",
            className,
          )}
          onDragOver={(event) => {
            if (onFilesDrop) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onDragLeave={(event) => {
            if (onFilesDrop) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onDrop={handleDrop}
        >
          {attachments.length > 0 && !isRecording ? (
            <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  data-slot="hermes-pending-attachment"
                  className="group relative inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[#d7d9dd]"
                >
                  {attachment.kind === "image" && attachment.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => setSelectedImage(attachment.previewUrl ?? null)}
                      className="-ml-1 h-8 w-8 overflow-hidden rounded-xl"
                      aria-label={`Preview ${attachment.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={attachment.previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
                    </button>
                  ) : attachment.kind === "image" ? (
                    <ImageIcon className="h-3.5 w-3.5 text-white/60" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-white/60" />
                  )}
                  <span className="max-w-[180px] truncate">{attachment.name}</span>
                  <span className="text-[#8b8e95]">{attachment.sizeLabel}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment?.(attachment.id)}
                    className="rounded-full p-0.5 text-white/55 transition hover:bg-white/[0.05] hover:text-white"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className={cn("transition-all duration-300", isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100")}>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
                onKeyDown?.(event);
              }}
              onPaste={onPaste}
              disabled={isLoading || isRecording}
              placeholder={placeholder}
            />
          </div>

          {isRecording ? (
            <VoiceRecorder
              isRecording={isRecording}
              transcript={voiceTranscript}
              interimTranscript={interimVoiceTranscript}
              errorMessage={voiceError}
              levels={voiceLevels}
              onStopDictation={commitDictationToDraft}
              onTranscribeAndSend={transcribeAndSend}
            />
          ) : null}

          {slashCommands.length > 0 && !isRecording ? (
            <div
              data-slot="hermes-slash-menu"
              className="mt-2 max-h-[320px] overflow-y-auto rounded-[18px] border border-white/[0.08] bg-[#0d0f11] p-2"
            >
              {slashCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  onClick={() => onSlashCommandSelect?.(command)}
                  className="flex w-full items-start justify-between gap-3 rounded-[14px] px-3 py-2 text-left transition hover:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#f5f5f6]">{command.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#8b8e95]">{command.description}</p>
                  </div>
                  <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-[#7b7f87]">
                    Built in
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 p-0 pt-2">
            <div className={cn("flex items-center gap-1 transition-opacity duration-300", isRecording ? "invisible h-0 opacity-0" : "visible opacity-100")}>
              <PromptInputAction tooltip="Upload file">
                <button
                  data-slot="hermes-composer-attach"
                  type="button"
                  onClick={onAttachClick}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-gray-600/30 hover:text-[#d1d5db]"
                  disabled={isLoading || isRecording}
                  aria-label="Attach files"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              </PromptInputAction>
            </div>

            <PromptInputAction
              tooltip={
                isLoading
                  ? "Sending"
                  : isRecording
                    ? "Stop recording"
                    : canSend
                      ? "Send message"
                      : "Voice message"
              }
            >
              <Button
                data-slot="hermes-composer-send"
                variant="default"
                size="icon"
                type={canSend ? "submit" : "button"}
                className={cn(
                  "h-8 w-8 rounded-full transition-all duration-200",
                  isRecording
                    ? "bg-transparent text-red-500 hover:bg-gray-600/30 hover:text-red-400"
                    : canSend
                      ? "bg-white text-[#1f2023] hover:bg-white/80"
                      : "bg-transparent text-[#9ca3af] hover:bg-gray-600/30 hover:text-[#d1d5db]",
                )}
                onClick={(event) => {
                  if (isRecording) {
                    event.preventDefault();
                    commitDictationToDraft();
                    return;
                  }

                  if (!canSend) {
                    event.preventDefault();
                    startDictationSession();
                  }
                }}
                disabled={isLoading}
                aria-label={isRecording ? "Stop recording" : canSend ? "Send message" : "Record voice message"}
              >
                {isLoading ? (
                  <Square className="h-4 w-4 fill-[#1f2023] motion-safe:animate-pulse" />
                ) : isRecording ? (
                  <StopCircle className="h-5 w-5 text-red-500" />
                ) : canSend ? (
                  <ArrowUp className="h-4 w-4 text-[#1f2023]" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </PromptInputAction>
          </div>
        </div>

        <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </TooltipProvider>
    );
  },
);
PromptInputBox.displayName = "PromptInputBox";
