// Hook that turns mic speech into text live via the browser's Web Speech API, while also recording the audio.
import { useCallback, useEffect, useRef, useState } from "react";
const ERROR_MESSAGES = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings and try again.",
  "service-not-allowed": "Speech recognition is disabled in this browser.",
  "audio-capture": "No microphone was found. Plug one in and try again.",
  network: "Speech recognition needs an internet connection. Check your network and try again.",
  "language-not-supported": "This language isn't supported by your browser's speech recognition.",
};
const IGNORED_ERRORS = new Set(["no-speech", "aborted"]);
// Returns the browser's SpeechRecognition constructor, or undefined when it has none (e.g. Firefox).
function getRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}
// Picks a recording format the browser can actually produce (webm in Chrome/Edge, mp4 in Safari).
function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  ) || "";
}
// Exposes start/stop/reset plus the running transcript (final + interim), elapsed seconds and the recorded audio.
export function useLiveTranscription({ lang = "en-IN" } = {}) {
  const supported = Boolean(getRecognitionConstructor());
  const [status, setStatus] = useState("idle");
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const listeningRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  // Stops the timer, the recorder and every mic track, leaving recognition to finish on its own.
  const releaseMedia = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);
  // Folds any words still marked interim into the final text so nothing said just before stopping is lost.
  const flushInterim = useCallback(() => {
    if (interimRef.current.trim()) {
      finalRef.current = `${finalRef.current}${interimRef.current.trim()} `;
      setFinalText(finalRef.current);
    }
    interimRef.current = "";
    setInterimText("");
  }, []);
  // Ends the session because of an error the user has to fix, keeping whatever was transcribed so far.
  const fail = useCallback(
    (message) => {
      listeningRef.current = false;
      recognitionRef.current?.abort?.();
      releaseMedia();
      flushInterim();
      setError(message);
      setStatus(finalRef.current.trim() ? "stopped" : "error");
    },
    [releaseMedia, flushInterim]
  );
  // Builds a recognizer wired to our state; a new one is created for every restart after Chrome ends a session.
  const createRecognition = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalRef.current = `${finalRef.current}${text.trim()} `;
        else interim += text;
      }
      interimRef.current = interim;
      setFinalText(finalRef.current);
      setInterimText(interim);
    };
    recognition.onerror = (event) => {
      if (IGNORED_ERRORS.has(event.error)) return;
      fail(ERROR_MESSAGES[event.error] || "Speech recognition stopped unexpectedly. Please try again.");
    };
    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognitionRef.current = createRecognition();
          recognitionRef.current.start();
        } catch {
          fail("Speech recognition stopped unexpectedly. Please try again.");
        }
        return;
      }
      flushInterim();
    };
    return recognition;
  }, [lang, fail, flushInterim]);
  // Asks for the mic, starts recording the audio and starts live recognition.
  const start = useCallback(async () => {
    if (!supported || listeningRef.current) return;
    setError(null);
    setAudioBlob(null);
    finalRef.current = "";
    interimRef.current = "";
    setFinalText("");
    setInterimText("");
    setElapsed(0);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(ERROR_MESSAGES["not-allowed"]);
      setStatus("error");
      return;
    }
    const mimeType = pickRecorderMimeType();
    if (typeof MediaRecorder !== "undefined") {
      try {
        const chunks = [];
        const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          if (chunks.length) setAudioBlob(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null;
      }
    }
    listeningRef.current = true;
    try {
      recognitionRef.current = createRecognition();
      recognitionRef.current.start();
    } catch {
      fail("Speech recognition couldn't start. Please try again.");
      return;
    }
    startedAtRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 250);
    setStatus("listening");
  }, [supported, createRecognition, fail]);
  // Stops listening and recording; the last interim words are folded in once recognition ends.
  const stop = useCallback(() => {
    if (!listeningRef.current) return;
    listeningRef.current = false;
    setElapsed((Date.now() - startedAtRef.current) / 1000);
    releaseMedia();
    try {
      recognitionRef.current?.stop();
    } catch {
      flushInterim();
    }
    setStatus("stopped");
  }, [releaseMedia, flushInterim]);
  // Throws the current session away and returns to the idle state.
  const reset = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    releaseMedia();
    finalRef.current = "";
    interimRef.current = "";
    setFinalText("");
    setInterimText("");
    setElapsed(0);
    setError(null);
    setAudioBlob(null);
    setStatus("idle");
  }, [releaseMedia]);
  useEffect(
    () => () => {
      listeningRef.current = false;
      recognitionRef.current?.abort?.();
      releaseMedia();
    },
    [releaseMedia]
  );
  return { supported, status, finalText, interimText, error, elapsed, audioBlob, start, stop, reset };
}
