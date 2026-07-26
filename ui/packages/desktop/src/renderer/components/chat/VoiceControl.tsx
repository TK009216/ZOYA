import { ipcBridge } from '@/common';
import { Button, Dropdown, Menu, Message } from '@arco-design/web-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

type VoiceMode = 'off' | 'voice-message' | 'voice-mode';
type TurnState = 'idle' | 'listening' | 'processing' | 'speaking';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionConstructor { new (): SpeechRecognition }
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

const API = window.SpeechRecognition || window.webkitSpeechRecognition;

// en-US first → outputs Roman Urdu for Urdu/Hindi speech
// Falls back to Urdu/Hindi locales if en-US fails
const LANGUAGES = ['en-US', 'ur-PK', 'ur', 'hi-IN'];

interface Props {
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onLiveTranscript?: (text: string | null) => void;
  onSendMessage?: (text: string) => void;
}

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v3" />
  </svg>
);
const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
);

const Wave: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`voice-wave ${active ? 'voice-wave--active' : ''}`}>
    {[8, 18, 24, 16, 10].map((h, i) => (
      <span key={i} className="voice-wave__bar" style={{ height: active ? h : 4, animationDelay: `${i * 0.12}s` }} />
    ))}
  </div>
);

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const prio = ['Google UK English Female', 'Google US English Female', 'Microsoft Hazel', 'Microsoft Zira', 'Samantha', 'Karen', 'Moira', 'Tessa', 'Microsoft Susan', 'Google हिन्दी', 'Google Hindi'];
  for (const name of prio) {
    const f = voices.find((v) => v.name.includes(name));
    if (f) return f;
  }
  // Fallback: try to find a female voice by gender property
  const femaleVoice = voices.find((v) => (v.gender && v.gender.toLowerCase() === 'female'));
  if (femaleVoice) return femaleVoice;
  // Next: voice with name containing Female/Woman/Girl
  const femaleLike = voices.find((v) => /female|woman|girl/i.test(v.name));
  if (femaleLike) return femaleLike;
  // Finally: prefer en/hi/ur voices
  return voices.find((v) => v.lang.startsWith('en') || v.lang.startsWith('hi') || v.lang.startsWith('ur')) || voices[0] || null;
}

function stripForTTS(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~#>|]/g, ' ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

const VoiceControl: React.FC<Props> = ({ disabled, onTranscript, onLiveTranscript, onSendMessage }) => {
  const { t } = useTranslation();
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('off');
  const [sttActive, setSttActive] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [activeLang, setActiveLang] = useState('');
  const [turnState, setTurnState] = useState<TurnState>('idle');

  const recRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const vmRef = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const bufRef = useRef('');
  const speakingRef = useRef(false);
  const langIdxRef = useRef(0);
  const turnRef = useRef<TurnState>('idle');
  const ttsBufferRef = useRef('');
  const ttsFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    const poll = () => {
      const v = synthRef.current?.getVoices() || [];
      if (v.length) { voiceRef.current = pickVoice(v); return true; }
      return false;
    };
    if (!poll()) {
      const iv = setInterval(() => { if (poll()) clearInterval(iv); }, 200);
      if (synthRef.current) synthRef.current.onvoiceschanged = () => poll();
      return () => { clearInterval(iv); if (synthRef.current) synthRef.current.onvoiceschanged = null; };
    }
  }, []);

  const speakTTS = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth || !text.trim()) return;
    const clean = stripForTTS(text);
    if (!clean) return;
    speakingRef.current = true;
    setSpeaking(true);
    turnRef.current = 'speaking';
    setTurnState('speaking');
    const u = new SpeechSynthesisUtterance(clean);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 0.95;
    u.pitch = 1.15;
    u.volume = 1;
    const hasUrdu = /[\u0600-\u06FF]/.test(clean);
    const hasHindi = /[\u0900-\u097F]/.test(clean);
    if (hasUrdu) u.lang = 'ur-PK';
    else if (hasHindi) u.lang = 'hi-IN';
    else u.lang = 'en-US';
    u.onstart = () => {
      speakingRef.current = true;
      setSpeaking(true);
      turnRef.current = 'speaking';
      setTurnState('speaking');
    };
    u.onend = () => {
      if (!synth.pending) {
        speakingRef.current = false;
        setSpeaking(false);
        if (vmRef.current) {
          turnRef.current = 'listening';
          setTurnState('listening');
        }
      }
    };
    u.onerror = () => {
      if (!synth.pending) {
        speakingRef.current = false;
        setSpeaking(false);
        if (vmRef.current) {
          turnRef.current = 'listening';
          setTurnState('listening');
        }
      }
    };
    synth.speak(u);
  }, []);

  const stopRec = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.abort(); recRef.current.stop(); } catch { }
      recRef.current = null;
    }
    setSttActive(false);
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
  }, []);

  const bargeIn = useCallback(() => {
    // Immediately cancel TTS when user starts speaking (barge-in)
    if (synthRef.current && speakingRef.current) {
      synthRef.current.cancel();
      speakingRef.current = false;
      setSpeaking(false);
    }
    ttsBufferRef.current = '';
    if (ttsFlushTimerRef.current) {
      clearTimeout(ttsFlushTimerRef.current);
      ttsFlushTimerRef.current = null;
    }
  }, []);

  const flushTTS = useCallback(() => {
    if (ttsFlushTimerRef.current) {
      clearTimeout(ttsFlushTimerRef.current);
      ttsFlushTimerRef.current = null;
    }
    const text = ttsBufferRef.current.trim();
    if (text) {
      ttsBufferRef.current = '';
      speakTTS(text);
    }
  }, [speakTTS]);

  const addToTTSBuffer = useCallback((text: string) => {
    ttsBufferRef.current += text;
    const sentences = ttsBufferRef.current.match(/[^.!?\n]+[.!?\n]+/g);
    if (sentences && sentences.length > 0) {
      const complete = sentences.join('');
      ttsBufferRef.current = ttsBufferRef.current.slice(complete.length);
      speakTTS(complete.trim());
    }
    if (ttsFlushTimerRef.current) clearTimeout(ttsFlushTimerRef.current);
    ttsFlushTimerRef.current = setTimeout(flushTTS, 2000);
  }, [speakTTS, flushTTS]);

  const startRec = useCallback((mode: 'voice-message' | 'voice-mode', langIdx = 0) => {
    if (!API) { Message.warning('Speech recognition not available'); return; }
    if (langIdx >= LANGUAGES.length) return;
    stopRec();
    const r = new API();
    r.lang = LANGUAGES[langIdx];
    r.continuous = mode === 'voice-mode';
    r.interimResults = true;
    r.maxAlternatives = 3;
    recRef.current = r;
    langIdxRef.current = langIdx;
    bufRef.current = '';
    turnRef.current = 'listening';
    setTurnState('listening');
    setActiveLang(LANGUAGES[langIdx]);

    r.onstart = () => { setSttActive(true); };

    r.onresult = (e: any) => {
      // BARGE-IN: if ZOYA was speaking, stop her immediately
      if (speakingRef.current) bargeIn();

      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) {
        // English recognition may output partial words — keep raw text
        bufRef.current += final;
        setLiveText((p) => p + final);
      }
      const display = bufRef.current + interim;
      setLiveText(display);

      if (mode === 'voice-message') {
        onLiveTranscript?.(display.trim() || null);
      }

      if (mode === 'voice-mode' && final.trim()) {
        if (silenceRef.current) clearTimeout(silenceRef.current);
        silenceRef.current = setTimeout(() => {
          const send = bufRef.current.trim();
          if (send) {
            turnRef.current = 'processing';
            setTurnState('processing');
            onTranscript(send);
            onSendMessage?.(send);
            bufRef.current = '';
            setLiveText('');
          }
        }, 800);
      }
    };

    r.onerror = (ev: any) => {
      if (ev.error === 'aborted') return;
      if (ev.error === 'no-speech' && mode === 'voice-mode') return;
      if (ev.error === 'language-not-supported') {
        startRec(mode, langIdx + 1);
        return;
      }
      if (mode === 'voice-mode') {
        setTimeout(() => { if (vmRef.current) startRec('voice-mode'); }, 300);
      }
    };

    r.onend = () => {
      if (vmRef.current && mode === 'voice-mode') {
        setTimeout(() => { if (vmRef.current) startRec('voice-mode'); }, 100);
        return;
      }
      setSttActive(false);
    };

    try { r.start(); setSttActive(true); } catch { }
  }, [stopRec, bargeIn, onLiveTranscript, onTranscript, onSendMessage]);

  const startVM = useCallback(() => {
    setVoiceMode('voice-message');
    setLiveText('');
    startRec('voice-message');
  }, [startRec]);

  const startFull = useCallback(() => {
    setVoiceMode('voice-mode');
    setLiveText('');
    vmRef.current = true;
    ttsBufferRef.current = '';
    turnRef.current = 'listening';
    setTurnState('listening');
    startRec('voice-mode');
    const unsub = ipcBridge.acpConversation.responseStream.on((msg: any) => {
      if (!vmRef.current) return;
      if (msg.type === 'finish') {
        flushTTS();
        return;
      }
      if (msg.type === 'text' || msg.type === 'content') {
        const content = typeof msg.data === 'string' ? msg.data : msg.data?.content || '';
        if (content.trim()) addToTTSBuffer(content);
        return;
      }
      if (msg.replace) {
        ttsBufferRef.current = '';
        bargeIn();
      }
    });
    unsubRef.current = unsub;
  }, [startRec, flushTTS, addToTTSBuffer, bargeIn]);

  const stopAll = useCallback(() => {
    vmRef.current = false;
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    stopRec();
    if (synthRef.current) synthRef.current.cancel();
    speakingRef.current = false;
    setSpeaking(false);
    ttsBufferRef.current = '';
    if (ttsFlushTimerRef.current) {
      clearTimeout(ttsFlushTimerRef.current);
      ttsFlushTimerRef.current = null;
    }
    turnRef.current = 'idle';
    setTurnState('idle');
    const final = bufRef.current.trim();
    if (final) onTranscript(final);
    bufRef.current = '';
    setVoiceMode('off');
    setLiveText('');
    setActiveLang('');
    onLiveTranscript?.(null);
  }, [stopRec, onTranscript, onLiveTranscript]);

  const handleMenu = useCallback((key: string) => {
    if (voiceMode !== 'off') stopAll();
    if (key === 'voice-message') startVM();
    else if (key === 'voice-mode') startFull();
  }, [voiceMode, stopAll, startVM, startFull]);

  const isActive = voiceMode !== 'off';

  const dropdown = (
    <Menu onClickMenuItem={handleMenu}>
      <Menu.Item key="voice-message" style={{ height: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MicIcon />
          <div>
            <div style={{ fontSize: 13 }}>Voice Message 🎤</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Bolo → Roman Urdu text likh jaye ga</div>
          </div>
        </div>
      </Menu.Item>
      <Menu.Item key="voice-mode" style={{ height: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎧</span>
          <div>
            <div style={{ fontSize: 13 }}>Voice Mode 🎧</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Bolo, ZOYA Roman Urdu mein reply kare gi</div>
          </div>
        </div>
      </Menu.Item>
    </Menu>
  );

  const stateLabel = turnState === 'listening' ? '🎧 Listening' : turnState === 'processing' ? '⏳ Processing...' : turnState === 'speaking' ? '🔊 Speaking...' : '⏸ Paused';
  const placeholder = !sttActive ? '⏸ Paused' : !liveText.trim() ? 'Sun rahi hoon... bolo ji! 🎤' : '';

  const msgPanel = voiceMode === 'voice-message' ? createPortal(
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10000, background: '#1e1b4b', border: '1px solid #6366f1',
      borderRadius: 12, padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, maxWidth: 400,
    }}>
      <Wave active={sttActive} />
      <span style={{ color: '#e0e0e0', fontSize: 13, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {liveText || 'Bol rahe hain...'}
      </span>
      <Button type="text" shape="circle" style={{ color: '#f87171', flexShrink: 0 }} onClick={stopAll} icon={<StopIcon />} />
    </div>,
    document.body
  ) : null;

  const fullPanel = voiceMode === 'voice-mode' ? createPortal(
    <div style={{
      position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10000, background: 'linear-gradient(135deg, #6366f1, #a855f7)',
      borderRadius: 16, padding: '14px 20px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
      display: 'flex', alignItems: 'center', gap: 14, minWidth: 300, maxWidth: 480,
    }}>
      <Wave active={sttActive || speaking} />
      <div style={{ flex: 1, color: '#fff', minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          {stateLabel}
          {activeLang && <span style={{ fontSize: 11, opacity: 0.7, background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: 8 }}>{activeLang}</span>}
        </div>
        <div style={{ fontSize: 14, opacity: 0.9, minHeight: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {liveText || placeholder}
        </div>
      </div>
      <Button type="text" shape="circle" style={{ color: '#fff', fontSize: 20, flexShrink: 0 }} onClick={stopAll} icon={<StopIcon />} />
    </div>,
    document.body
  ) : null;

  return (
    <>
      <Dropdown droplist={dropdown} position="top" trigger="click">
        <Button
          type="text" size="small" shape="circle" disabled={disabled}
          className={`voice-control-btn ${isActive ? 'voice-control-btn--active' : ''}`}
          aria-label="Voice controls"
          icon={isActive ? <StopIcon /> : <MicIcon />}
        />
      </Dropdown>
      {msgPanel}
      {fullPanel}
    </>
  );
};

export default VoiceControl;
