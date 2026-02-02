import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { HandResults, Direction } from './types';
import { detectGesture, getDirectionFromFingers } from './GestureLogic';
import { SnakeGame } from './SnakeGame';

// Types for MediaPipe globals (available via script tags in index.html)
declare const Hands: any;
declare const Camera: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const HAND_CONNECTIONS: any;

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [results, setResults] = useState<HandResults | null>(null);
  const [mode, setMode] = useState<'recognition' | 'game'>('recognition');
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Buffer for smoothing results
  const gestureHistory = useRef<string[]>([]);

  const onResults = useCallback((mediaPipeResults: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (mediaPipeResults.multiHandLandmarks && mediaPipeResults.multiHandLandmarks.length > 0) {
      const landmarks = mediaPipeResults.multiHandLandmarks[0];
      const handedness = mediaPipeResults.multiHandedness[0].label; // 'Left' or 'Right'

      const gesture = detectGesture(landmarks, handedness);

      // Aesthetic Rendering of the hand
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: '#22d3ee',
        lineWidth: 4,
      });
      drawLandmarks(canvasCtx, landmarks, {
        color: '#f43f5e',
        lineWidth: 1,
        radius: (data: any) => {
          return data.index === 4 || data.index === 8 || data.index === 12 || data.index === 16 || data.index === 20 ? 6 : 3;
        },
        fillColor: '#ffffff'
      });

      // Update local state for UI
      setResults({
        landmarks,
        gesture,
        fps: 0, // Calculated by MediaPipe or manually
        handedness: handedness as 'Left' | 'Right'
      });
    } else {
      setResults(null);
    }
    canvasCtx.restore();
  }, []);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480,
      });
      camera.start().then(() => setIsCameraLoading(false));
    }
  }, [onResults]);

  const analyzeWithAI = async () => {
    if (!results?.gesture) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Interpret the current hand gesture: ${results.gesture.name}. 
      It is described as "${results.gesture.description}". 
      Give a short, cool cyberpunk-themed analysis of what this gesture might mean in a neural interface context. 
      Keep it under 30 words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiInsight(response.text || 'No neural signal decoded.');
    } catch (err) {
      console.error(err);
      setAiInsight('Error decoding synaptic link.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentDir = results?.gesture ? getDirectionFromFingers(results.gesture.fingerCount) : Direction.NONE;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-cyan-500/30 pb-4">
        <div>
          <h1 className="text-4xl font-black orbitron neon-text tracking-tighter">NEURAL NEXUS</h1>
          <p className="text-[10px] text-cyan-400/60 uppercase tracking-widest">v2.5 // GESTURE INTERFACE</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('recognition')}
            className={`px-4 py-1 orbitron text-xs transition-all ${mode === 'recognition' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-transparent border border-cyan-900 text-cyan-900 hover:border-cyan-500 hover:text-cyan-500'}`}
          >
            RECOGNIZE
          </button>
          <button
            onClick={() => setMode('game')}
            className={`px-4 py-1 orbitron text-xs transition-all ${mode === 'game' ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-transparent border border-rose-900 text-rose-900 hover:border-rose-500 hover:text-rose-500'}`}
          >
            GAME
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Feed */}
        <section className="flex flex-col space-y-4">
          <div className="relative neon-border bg-black rounded-xl aspect-[4/3] overflow-hidden group">
            <div className="scanline"></div>
            {isCameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 z-20 bg-slate-900/90">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="orbitron text-xs animate-pulse">INITIATING CAMERA LINK...</p>
              </div>
            )}
            <video ref={videoRef} className="hidden" playsInline muted></video>
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
            ></canvas>

            {/* UI Overlay on Video */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
              <div className="bg-cyan-500/20 backdrop-blur-md px-3 py-1 rounded border border-cyan-500/50">
                <p className="text-[10px] orbitron text-cyan-400">STATUS: {results ? 'TRACKED' : 'SCANNING'}</p>
              </div>
            </div>

            {results && (
              <div className="absolute bottom-4 right-4 z-10 pointer-events-none text-right">
                <p className="text-4xl orbitron text-white">{results.gesture?.emoji}</p>
                <p className="text-xs orbitron text-cyan-400 font-bold">{results.gesture?.name.toUpperCase()}</p>
              </div>
            )}
          </div>

          <div className="glass p-4 rounded-xl space-y-2">
            <h3 className="orbitron text-xs text-cyan-400/80 uppercase">Telemetry Analysis</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/40 p-2 rounded border border-cyan-500/10">
                <p className="text-[8px] uppercase text-gray-500">Handedness</p>
                <p className="text-sm orbitron">{results?.handedness || '---'}</p>
              </div>
              <div className="bg-black/40 p-2 rounded border border-cyan-500/10">
                <p className="text-[8px] uppercase text-gray-500">Fingers</p>
                <p className="text-sm orbitron text-cyan-400">{results?.gesture?.fingerCount ?? '--'}</p>
              </div>
              <div className="bg-black/40 p-2 rounded border border-cyan-500/10">
                <p className="text-[8px] uppercase text-gray-500">Confidence</p>
                <p className="text-sm orbitron text-emerald-400">{(results?.gesture?.confidence ?? 0) * 100}%</p>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Mode Content */}
        <section className="flex flex-col space-y-6">
          {mode === 'recognition' ? (
            <>
              <div className="glass p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-6 flex-1 min-h-[300px]">
                {!results ? (
                  <>
                    <div className="w-24 h-24 border border-dashed border-cyan-500/30 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-4xl">👋</span>
                    </div>
                    <p className="orbitron text-gray-400 max-w-xs">Position your hand within the frame to begin neural synchronization.</p>
                  </>
                ) : (
                  <>
                    <div className="text-8xl animate-bounce">{results.gesture?.emoji}</div>
                    <div>
                      <h2 className="text-3xl font-black orbitron text-white">{results.gesture?.name}</h2>
                      <p className="text-cyan-400/80 mt-2 italic font-medium">"{results.gesture?.description}"</p>
                    </div>

                    <button
                      onClick={analyzeWithAI}
                      disabled={isAnalyzing}
                      className="group relative px-6 py-2 orbitron text-xs overflow-hidden rounded bg-cyan-900/30 border border-cyan-500 hover:bg-cyan-500 hover:text-black transition-all"
                    >
                      {isAnalyzing ? 'SYNCHRONIZING...' : 'AI INTERPRETATION'}
                    </button>

                    {aiInsight && (
                      <div className="mt-4 p-4 border-l-2 border-cyan-500 bg-cyan-500/5 text-left w-full">
                        <p className="text-[10px] orbitron text-cyan-400 mb-1">GEMINI NEURAL DECODER // OUTPUT:</p>
                        <p className="text-xs leading-relaxed text-gray-300 font-medium">{aiInsight}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                  <h4 className="text-[10px] orbitron text-cyan-500 mb-2">GESTURES IDENTIFIED</h4>
                  <ul className="text-[10px] space-y-1 text-gray-400 font-bold">
                    <li>👍 THUMBS UP</li>
                    <li>✌️ PEACE</li>
                    <li>👌 OK SIGN</li>
                    <li>🤘 ROCK ON</li>
                    <li>☝️ POINTING</li>
                    <li>✊ FIST</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                  <h4 className="text-[10px] orbitron text-cyan-500 mb-2">SYSTEM SPECS</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px]">
                      <span className="text-gray-500">LATENCY</span>
                      <span className="text-emerald-500">LOW</span>
                    </div>
                    <div className="flex justify-between text-[8px]">
                      <span className="text-gray-500">PRECISION</span>
                      <span className="text-cyan-500">95%</span>
                    </div>
                    <div className="flex justify-between text-[8px]">
                      <span className="text-gray-500">AI ENGINE</span>
                      <span className="text-rose-500">GEMINI FLASH</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="glass p-6 rounded-xl flex-1 flex flex-col justify-center">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black orbitron text-white">SNAKE PROTOCOL</h2>
                <div className="flex justify-center space-x-4 mt-2">
                  <div className={`text-[10px] px-2 py-0.5 rounded border ${currentDir === Direction.UP ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-transparent text-gray-600 border-gray-800'}`}>UP (1)</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded border ${currentDir === Direction.DOWN ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-transparent text-gray-600 border-gray-800'}`}>DOWN (2)</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded border ${currentDir === Direction.LEFT ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-transparent text-gray-600 border-gray-800'}`}>LEFT (4)</div>
                  <div className={`text-[10px] px-2 py-0.5 rounded border ${currentDir === Direction.RIGHT ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-transparent text-gray-600 border-gray-800'}`}>RIGHT (3)</div>
                </div>
              </div>
              <SnakeGame
                currentDirection={currentDir}
                isPaused={results?.gesture?.name === 'Fist'}
              />
            </div>
          )}
        </section>
      </main>

      <footer className="mt-auto pt-8 w-full max-w-6xl flex justify-between items-center text-[8px] text-gray-600 orbitron border-t border-slate-900 mt-12">
        <p>© 2025 NEURAL NEXUS // PROJECT SEED</p>
        <div className="flex space-x-4">
          <span>DECRYPTED</span>
          <span className="text-cyan-800">ENCRYPTED</span>
          <span>SECURED</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
