"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioControllerProps {
  isSpinning: boolean;
  prizeLevel: number;
  hasResult: boolean;
  isMuted: boolean;
}

/** 滚动音效总时长（sweep + 鼓点 + riser 3.6s + 欢呼），用于自动停表 */
export const SPINNING_SOUND_MS = 3600;
/** 提前进入「即将揭晓」减速的时间，保证减速结束正好卡在音乐停 */
export const SPINNING_DECEL_LEAD_MS = 1700;

export function useAudioController({ isSpinning, prizeLevel, hasResult, isMuted }: AudioControllerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);
  const bgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Generate procedural BGM beat
  const playBGM = useCallback(async () => {
    if (bgmSourceRef.current) return; // Only play if not already playing

    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Create master gain
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.08;
      masterGain.connect(ctx.destination);
      bgmGainRef.current = masterGain;

      // 动感电子背景音乐 - 使用振荡器生成
      const playBeat = () => {
        const now = ctx.currentTime;

        // Bass kick (低音鼓)
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.connect(kickGain);
        kickGain.connect(masterGain);
        kickOsc.frequency.setValueAtTime(150, now);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
        kickGain.gain.setValueAtTime(1, now);
        kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        kickOsc.start(now);
        kickOsc.stop(now + 0.5);

        // Hi-hat (镲片)
        const hihat = ctx.createOscillator();
        const hihatGain = ctx.createGain();
        hihat.connect(hihatGain);
        hihatGain.connect(masterGain);
        hihat.type = 'square';
        hihat.frequency.value = 10000;
        hihatGain.gain.setValueAtTime(0.3, now + 0.25);
        hihatGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        hihat.start(now + 0.25);
        hihat.stop(now + 0.35);

        // Synth pad (合成器音垫)
        const notes = [261.63, 329.63, 392.00]; // C-E-G chord
        notes.forEach((freq, i) => {
          const synth = ctx.createOscillator();
          const synthGain = ctx.createGain();
          synth.connect(synthGain);
          synthGain.connect(masterGain);
          synth.type = 'sawtooth';
          synth.frequency.value = freq;
          synthGain.gain.setValueAtTime(0.15, now + i * 0.1);
          synthGain.gain.linearRampToValueAtTime(0.05, now + 0.8);
          synth.start(now + i * 0.1);
          synth.stop(now + 1);
        });
      };

      // 循环播放节拍
      const beatInterval = setInterval(() => {
        if (!bgmGainRef.current) {
          clearInterval(beatInterval);
          return;
        }
        playBeat();
      }, 1000); // 每秒一拍

      // 存储interval以便清理
      (bgmGainRef.current as GainNode & { beatInterval?: NodeJS.Timeout }).beatInterval = beatInterval;

      setIsPlaying(true);

    } catch (error) {
      console.error("Error playing BGM:", error);
    }
  }, [getAudioContext]);

  // Stop BGM
  const stopBGM = useCallback(() => {
    if (bgmSourceRef.current) {
      try {
        bgmSourceRef.current.stop();
        bgmSourceRef.current = null; // Clear the reference
      } catch (error) {
        console.error("Error stopping BGM source:", error);
      }
    }
    if (bgmGainRef.current) {
      try {
        // 清理节拍循环
        const beatInterval = (bgmGainRef.current as GainNode & { beatInterval?: NodeJS.Timeout }).beatInterval;
        if (beatInterval) {
          clearInterval(beatInterval);
        }
        bgmGainRef.current.disconnect();
        bgmGainRef.current = null;
      } catch (error) {
        console.error("Error disconnecting BGM gain:", error);
      }
    }
    setIsPlaying(false);
  }, []);

  // Spinning sound effects - enhanced
  const playSpinningSound = useCallback(() => {
    if (isMuted) return;
    
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Short, intense sweep sound
      const sweep = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweep.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweep.type = "sawtooth";
      sweep.frequency.setValueAtTime(50, now);
      sweep.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
      sweepGain.gain.setValueAtTime(0.2, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      sweep.start(now);
      sweep.stop(now + 0.65);

      // Intense drum roll with more variation
      for (let i = 0; i < 35; i++) {
        const delay = i * (0.1 - i * 0.002);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 80 + i * 25 + Math.random() * 50; // More frequency variation
        osc.type = "triangle";
        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.07);
        osc.start(now + delay);
        osc.stop(now + delay + 0.09);
      }

      // Rising tension sound - longer and more dramatic
      const riser = ctx.createOscillator();
      const riserGain = ctx.createGain();
      riser.connect(riserGain);
      riserGain.connect(ctx.destination);
      riser.type = "sawtooth";
      riser.frequency.setValueAtTime(150, now);
      riser.frequency.exponentialRampToValueAtTime(1000, now + 3);
      riserGain.gain.setValueAtTime(0.08, now);
      riserGain.gain.linearRampToValueAtTime(0.2, now + 2.5);
      riserGain.gain.linearRampToValueAtTime(0, now + 3.5);
      riser.start(now);
      riser.stop(now + 3.6);

      // Short white noise burst for futuristic feel
      const noise = ctx.createBufferSource();
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      noise.buffer = noiseBuffer;

      const noiseGain = ctx.createGain();
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.1, now + 0.4); // Start after sweep
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      noise.start(now + 0.4);
      noise.stop(now + 0.9);

      // Crowd cheering simulation
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (!audioContextRef.current) return;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.frequency.value = 300 + Math.random() * 200;
          osc2.frequency.value = 400 + Math.random() * 200;
          osc1.type = "sawtooth";
          osc2.type = "triangle";
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 0.35);
          osc2.stop(ctx.currentTime + 0.35);
        }, i * 500);
      }
    } catch (error) {
      console.error("Error playing spinning sound:", error);
      // Audio not supported
    }
  }, [isMuted, getAudioContext]);

  // Victory sounds - enhanced with more celebration
  const playVictorySound = useCallback((level: number) => {
    if (isMuted) return;

    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      if (level === 1) {
        // 🏆 超级华丽的一等奖音效
        // 震撼开场音
        const impact = ctx.createOscillator();
        const impactGain = ctx.createGain();
        impact.connect(impactGain);
        impactGain.connect(ctx.destination);
        impact.frequency.setValueAtTime(80, now);
        impact.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        impact.type = "sine";
        impactGain.gain.setValueAtTime(0.6, now);
        impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        impact.start(now);
        impact.stop(now + 0.45);

        // 华丽上升音阶
        const victoryNotes = [
          { freq: 523.25, time: 0.15 },  // C5
          { freq: 659.25, time: 0.25 },  // E5
          { freq: 783.99, time: 0.35 },  // G5
          { freq: 1046.50, time: 0.45 }, // C6
          { freq: 1318.51, time: 0.6 },  // E6
          { freq: 1568.00, time: 0.75 }, // G6
          { freq: 2093.00, time: 0.9 },  // C7
        ];

        victoryNotes.forEach(({ freq, time }, i) => {
          // 主音符
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.35, now + time);
          gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.4);
          osc.start(now + time);
          osc.stop(now + time + 0.45);

          // 和声（增加厚度）
          const harmony = ctx.createOscillator();
          const harmonyGain = ctx.createGain();
          harmony.connect(harmonyGain);
          harmonyGain.connect(ctx.destination);
          harmony.frequency.value = freq * 1.5; // 五度音
          harmony.type = "sine";
          harmonyGain.gain.setValueAtTime(0.2, now + time);
          harmonyGain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.35);
          harmony.start(now + time);
          harmony.stop(now + time + 0.4);
        });

        // 璀璨星光效果（大量闪烁音）
        for (let i = 0; i < 20; i++) {
          const sparkle = ctx.createOscillator();
          const sparkleGain = ctx.createGain();
          sparkle.connect(sparkleGain);
          sparkleGain.connect(ctx.destination);
          sparkle.frequency.value = 2000 + Math.random() * 3000;
          sparkle.type = "sine";
          const startTime = now + 0.8 + i * 0.08;
          sparkleGain.gain.setValueAtTime(0.12, startTime);
          sparkleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
          sparkle.start(startTime);
          sparkle.stop(startTime + 0.2);
        }

        // 持续的庆祝和弦
        const celebrationChord = [1046.50, 1318.51, 1568.00]; // C-E-G
        celebrationChord.forEach((freq, i) => {
          const chord = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chord.connect(chordGain);
          chordGain.connect(ctx.destination);
          chord.frequency.value = freq;
          chord.type = "triangle";
          chordGain.gain.setValueAtTime(0.15, now + 1.2);
          chordGain.gain.linearRampToValueAtTime(0, now + 2.5);
          chord.start(now + 1.2);
          chord.stop(now + 2.6);
        });

      } else if (level === 2) {
        // 🥈 欢快的二等奖音效
        // 快乐上升音阶
        const happyNotes = [
          { freq: 392.00, time: 0 },     // G4
          { freq: 493.88, time: 0.1 },   // B4
          { freq: 587.33, time: 0.2 },   // D5
          { freq: 783.99, time: 0.3 },   // G5
          { freq: 987.77, time: 0.45 },  // B5
          { freq: 1174.66, time: 0.6 },  // D6
        ];

        happyNotes.forEach(({ freq, time }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.28, now + time);
          gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.3);
          osc.start(now + time);
          osc.stop(now + time + 0.35);
        });

        // 清脆的铃声效果
        for (let i = 0; i < 8; i++) {
          const bell = ctx.createOscillator();
          const bellGain = ctx.createGain();
          bell.connect(bellGain);
          bellGain.connect(ctx.destination);
          bell.frequency.value = 1500 + Math.random() * 1500;
          bell.type = "sine";
          const startTime = now + 0.7 + i * 0.08;
          bellGain.gain.setValueAtTime(0.1, startTime);
          bellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
          bell.start(startTime);
          bell.stop(startTime + 0.25);
        }

        // 结束和弦
        const endChord = [783.99, 987.77]; // G-B
        endChord.forEach((freq) => {
          const chord = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chord.connect(chordGain);
          chordGain.connect(ctx.destination);
          chord.frequency.value = freq;
          chord.type = "triangle";
          chordGain.gain.setValueAtTime(0.12, now + 0.9);
          chordGain.gain.linearRampToValueAtTime(0, now + 1.8);
          chord.start(now + 0.9);
          chord.stop(now + 1.9);
        });

      } else {
        // 🥉 愉快的三等奖音效
        // 明快的四音符旋律
        const cheerfulNotes = [
          { freq: 523.25, time: 0 },    // C5
          { freq: 659.25, time: 0.12 }, // E5
          { freq: 783.99, time: 0.24 }, // G5
          { freq: 1046.50, time: 0.36 }, // C6
        ];

        cheerfulNotes.forEach(({ freq, time }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.25, now + time);
          gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.25);
          osc.start(now + time);
          osc.stop(now + time + 0.3);
        });

        // 轻快的闪烁效果
        for (let i = 0; i < 5; i++) {
          const twinkle = ctx.createOscillator();
          const twinkleGain = ctx.createGain();
          twinkle.connect(twinkleGain);
          twinkleGain.connect(ctx.destination);
          twinkle.frequency.value = 1800 + Math.random() * 1200;
          twinkle.type = "sine";
          const startTime = now + 0.5 + i * 0.1;
          twinkleGain.gain.setValueAtTime(0.08, startTime);
          twinkleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
          twinkle.start(startTime);
          twinkle.stop(startTime + 0.2);
        }
      }

      // 所有奖项通用：欢呼人群效果
      for (let i = 0; i < 5; i++) {
        const cheer = ctx.createOscillator();
        const cheerGain = ctx.createGain();
        cheer.connect(cheerGain);
        cheerGain.connect(ctx.destination);
        cheer.frequency.setValueAtTime(250 + Math.random() * 150, now + 0.3 + i * 0.12);
        cheer.frequency.linearRampToValueAtTime(450 + Math.random() * 250, now + 0.4 + i * 0.12);
        cheer.type = "sawtooth";
        cheerGain.gain.setValueAtTime(0.06, now + 0.3 + i * 0.12);
        cheerGain.gain.linearRampToValueAtTime(0, now + 0.6 + i * 0.12);
        cheer.start(now + 0.3 + i * 0.12);
        cheer.stop(now + 0.65 + i * 0.12);
      }
    } catch {
      // Audio not supported
    }
  }, [isMuted, getAudioContext]);

  // Master effect for BGM playback and volume control
  useEffect(() => {
    // 背景音乐已禁用 - 保留代码结构但不播放
    // if (!isMuted) {
    //   playBGM();
    // } else {
    //   stopBGM();
    // }

    return () => {
      stopBGM();
    };
  }, [isMuted, isSpinning, stopBGM]);

  // Handle spinning sound effects separately
  useEffect(() => {
    if (isSpinning && !isMuted) {
      playSpinningSound();
    }
  }, [isSpinning, isMuted, playSpinningSound]);

  // Handle result - with debounce to prevent duplicate plays
  const lastPlayedRef = useRef<{ hasResult: boolean; prizeLevel: number } | null>(null);

  useEffect(() => {
    // 只在结果从无到有时播放，且奖品等级有效
    if (hasResult && prizeLevel > 0) {
      const lastPlayed = lastPlayedRef.current;

      // 防止重复播放：检查是否是同一个结果
      if (!lastPlayed || !lastPlayed.hasResult) {
        // 延迟播放，确保抽奖音效已经结束
        setTimeout(() => {
          playVictorySound(prizeLevel);
        }, 100);

        lastPlayedRef.current = { hasResult: true, prizeLevel };
      }
    } else if (!hasResult) {
      // 重置状态，准备下次播放
      lastPlayedRef.current = null;
    }
  }, [hasResult, prizeLevel, playVictorySound]);

  return {
    playBGM,
    stopBGM,
    playSpinningSound,
    playVictorySound,
    isPlaying,
  };
}
