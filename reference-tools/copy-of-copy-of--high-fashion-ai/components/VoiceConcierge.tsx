
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TranscriptionEntry } from '../types';
import { decode, decodeAudioData, encode } from '../utils/audio';
import { MicIcon } from './icons';

type SessionStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'DONE' | 'ERROR';

const VoiceConcierge: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>('IDLE');
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<TranscriptionEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopConversation = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if(scriptProcessorRef.current){
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current){
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    setStatus('IDLE');
  }, []);

  const startConversation = async () => {
    setStatus('CONNECTING');
    setError(null);
    setTranscriptionHistory([]);
    setCurrentTranscription(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are a high-fashion concierge. Be chic, concise, and helpful.'
        },
        callbacks: {
          onopen: () => {
            setStatus('ACTIVE');
// FIX: Cast window to any to support webkitAudioContext for Safari compatibility
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
// FIX: Cast window to any to support webkitAudioContext for Safari compatibility
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              setCurrentTranscription({ speaker: 'user', text: currentInputTranscriptionRef.current });
            }
            if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                setCurrentTranscription({ speaker: 'model', text: currentOutputTranscriptionRef.current });
            }
            if(message.serverContent?.turnComplete) {
                const fullInput = currentInputTranscriptionRef.current;
                const fullOutput = currentOutputTranscriptionRef.current;
                
                setTranscriptionHistory(prev => {
                    const newHistory = [...prev];
                    if (fullInput.trim()) newHistory.push({ speaker: 'user', text: fullInput });
                    if (fullOutput.trim()) newHistory.push({ speaker: 'model', text: fullOutput });
                    return newHistory;
                });

                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                setCurrentTranscription(null);
            }
            
            // Handle audio playback
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const outputCtx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }

            if(message.serverContent?.interrupted){
                sourcesRef.current.forEach(source => source.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            setError(`Session error: ${e.message}`);
            setStatus('ERROR');
            stopConversation();
          },
          onclose: () => {
            setStatus('DONE');
            stopConversation();
          },
        },
      });
    } catch (e: any) {
      setError(`Failed to start session: ${e.message}`);
      setStatus('ERROR');
    }
  };

  useEffect(() => {
    return () => stopConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buttonState = {
    IDLE: { text: 'Start Conversation', action: startConversation, color: 'bg-gray-200 text-black', iconColor: 'text-black' },
    CONNECTING: { text: 'Connecting...', action: () => {}, color: 'bg-gray-700 text-gray-300', iconColor: 'text-gray-300 animate-pulse' },
    ACTIVE: { text: 'End Conversation', action: stopConversation, color: 'bg-red-600 text-white', iconColor: 'text-white animate-pulse' },
    DONE: { text: 'Start New Conversation', action: startConversation, color: 'bg-gray-200 text-black', iconColor: 'text-black' },
    ERROR: { text: 'Retry Conversation', action: startConversation, color: 'bg-yellow-500 text-black', iconColor: 'text-black' },
  };
  
  const currentButton = buttonState[status];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <button
          onClick={currentButton.action}
          disabled={status === 'CONNECTING'}
          className={`flex items-center justify-center gap-3 w-full md:w-auto px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 ${currentButton.color}`}
        >
          <MicIcon className={`w-6 h-6 ${currentButton.iconColor}`} />
          {currentButton.text}
        </button>
        {error && <p className="mt-4 text-red-400">{error}</p>}
      </div>
      <div className="mt-8 min-h-[40vh] bg-gray-900 rounded-lg p-4 space-y-4">
        {transcriptionHistory.map((entry, index) => (
            <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-md p-3 rounded-lg ${entry.speaker === 'user' ? 'bg-gray-700 text-right' : 'bg-gray-800'}`}>
                    {entry.text}
                </p>
            </div>
        ))}
        {currentTranscription && (
            <div className={`flex ${currentTranscription.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-md p-3 rounded-lg opacity-70 ${currentTranscription.speaker === 'user' ? 'bg-gray-700 text-right' : 'bg-gray-800'}`}>
                    {currentTranscription.text}
                </p>
            </div>
        )}
        {status === 'IDLE' && <p className="text-gray-500 text-center pt-16">Press "Start Conversation" to begin.</p>}
        {status === 'CONNECTING' && <p className="text-gray-500 text-center pt-16">Connecting to your concierge...</p>}
      </div>
    </div>
  );
};

export default VoiceConcierge;
