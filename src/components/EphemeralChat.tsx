import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Trash2,
  Lock,
  MessageSquare,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  Link as LinkIcon,
  RefreshCcw,
  AlertTriangle,
  LogIn
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other' | 'system';
  timestamp: Date;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────
const generateRawKey = async (): Promise<string> => {
  const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
};

// Sanitize a base64 key that may have had '+' corrupted to ' ' by URLSearchParams
const sanitizeBase64Key = (b64: string): string => b64.replace(/ /g, '+');

const importRawKey = async (b64: string): Promise<CryptoKey> => {
  const safe = sanitizeBase64Key(b64);
  const bin = atob(safe);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return window.crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

const encrypt = async (key: CryptoKey, text: string): Promise<string> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  const out = new Uint8Array(12 + enc.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(enc), 12);
  return btoa(String.fromCharCode(...out));
};

const decrypt = async (key: CryptoKey, b64: string): Promise<string> => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const dec = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(dec);
};

interface EphemeralChatProps {
  initialRoomId?: string;
  initialKey?: string;
}

export const EphemeralChat = ({ initialRoomId, initialKey }: EphemeralChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [roomId, setRoomId] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const roomIdRef = useRef('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastWipeTime = useRef<number>(0);

  // ── WebSocket connection (with silent auto-retry for cold starts) ─────────
  const openSocket = useCallback((key: CryptoKey, room: string, attempt = 0) => {
    console.log(`[Chat] Opening socket for room: ${room}, attempt: ${attempt + 1}`);
    
    if (socketRef.current) {
      console.log('[Chat] Cleaning up existing socket connection');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (attempt === 0) {
      retryCountRef.current = 0;
      setStatus('connecting');
      setErrorMsg('');
    }

    const socket = io({ 
      query: { room },
      reconnection: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'] // Try WebSocket first, fallback to polling
    });

    timeoutRef.current = setTimeout(() => {
      if (!socket.connected) {
        console.warn('[Chat] Connection timeout, retrying...');
        socket.disconnect();
        handleFailure(key, room, attempt, 'Connection timed out.');
      }
    }, 12000);

    const handleFailure = (k: CryptoKey, r: string, att: number, reason: string) => {
      clearTimeout(timeoutRef.current!);
      retryCountRef.current = att + 1;
      if (att < MAX_RETRIES - 1) {
        const delay = Math.pow(2, att) * 1000;
        console.log(`[Chat] Retrying in ${delay}ms...`);
        timeoutRef.current = setTimeout(() => openSocket(k, r, att + 1), delay);
      } else {
        console.error('[Chat] Max retries reached:', reason);
        setStatus('error');
        setErrorMsg(`${reason} Press Retry.`);
      }
    };

    socket.on('connect', () => {
      console.log('[Chat] Successfully connected to room:', room);
      clearTimeout(timeoutRef.current!);
      retryCountRef.current = 0;
      setStatus('connected');
      setErrorMsg('');
    });

    socket.on('connect_error', (error) => {
      console.error('[Chat] Connection error:', error.message);
    });

    socket.on('chat-message', async (data: string) => {
      try {
        if (!data) return;
        const text = await decrypt(key, data);
        console.log('[Chat] Received message from peer');
        setMessages(prev => [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          text,
          sender: 'other',
          timestamp: new Date()
        }]);
      } catch (err) { 
        console.error('[Chat] Failed to decrypt message:', err);
      }
    });

    socket.on('peer-joined', () => {
      console.log('[Chat] Peer joined the room');
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        text: 'A peer connected',
        sender: 'system',
        timestamp: new Date()
      }]);
    });

    socket.on('peer-wiped', () => {
      console.log('[Chat] Peer wiped their session');
      alert('This room was wiped and permanently destroyed by the peer.');
      setMessages([]);
      history.replaceState(null, '', location.pathname);
      location.reload();
    });

    socket.on('peer-disconnected', () => {
      if (Date.now() - lastWipeTime.current < 2000) return;
      console.log('[Chat] Peer disconnected');
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        text: 'Peer disconnected',
        sender: 'system',
        timestamp: new Date()
      }]);
    });

    socket.on('error', (msg: string) => {
      console.error('[Chat] Server error:', msg);
      setStatus('error');
      setErrorMsg(msg);
      // Clear hash so they don't keep trying to connect to a destroyed room
      history.replaceState(null, '', location.pathname);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Chat] Disconnected:', reason);
      clearTimeout(timeoutRef.current!);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        handleFailure(key, room, attempt, 'Tunnel closed.');
      }
    });

    socketRef.current = socket;
  }, []);

  // ── Room initialisation ───────────────────────────────────────────────────  // ── Room initialisation ───────────────────────────────────────────────────
  const initRoom = useCallback(async (hashOverride?: string) => {
    const hash = (hashOverride ?? window.location.hash).replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const urlRoom = params.get('room');
    const urlKey = params.get('key');

    let room: string;
    let rawKey: string;
    let key: CryptoKey;

    // Priority 1: URL parameters (from pasted link or direct navigation)
    if (urlRoom && urlKey) {
      console.log('[Chat] Joining existing room from URL:', urlRoom);
      room = urlRoom;
      // sanitizeBase64Key fixes '+' → ' ' corruption by URLSearchParams
      rawKey = sanitizeBase64Key(urlKey);
      try {
        key = await importRawKey(rawKey);
        console.log('[Chat] Successfully imported key from URL');
      } catch (err) {
        console.error('[Chat] FATAL: Failed to import key from URL – key is malformed:', err);
        setStatus('error');
        setErrorMsg('Invalid invite link – the encryption key is corrupted. Ask the host to share a fresh link.');
        return;
      }
    } 
    // Priority 2: Props (from parent component)
    else if (initialRoomId && initialKey) {
      console.log('[Chat] Joining room from props:', initialRoomId);
      room = initialRoomId;
      rawKey = sanitizeBase64Key(initialKey);
      try {
        key = await importRawKey(rawKey);
        console.log('[Chat] Successfully imported key from props');
      } catch (err) {
        console.error('[Chat] FATAL: Failed to import key from props – key is malformed:', err);
        setStatus('error');
        setErrorMsg('Invalid room key – the encryption key is corrupted. Ask the host to share a fresh link.');
        return;
      }
    } 
    // Priority 3: Create new room
    else {
      console.log('[Chat] Creating new room');
      room = Math.random().toString(36).substring(2, 8).toUpperCase();
      rawKey = await generateRawKey();
      key = await importRawKey(rawKey);
    }

    // encodeURIComponent ensures '+' and '/' in the base64 key are preserved
    // in the URL hash (URLSearchParams would otherwise decode '+' as a space)
    const newUrl = `${location.origin}${location.pathname}#room=${room}&key=${encodeURIComponent(rawKey)}`;

    keyRef.current = key;
    roomIdRef.current = room;

    setRoomId(room);
    setShareUrl(newUrl);
    setMessages([]);

    // Only update URL if it's different (prevents unnecessary history changes)
    if (window.location.href !== newUrl) {
      history.replaceState(null, '', newUrl);
    }

    openSocket(key, room);
  }, [openSocket, initialRoomId, initialKey]);

  useEffect(() => {
    initRoom();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
    };
  }, [initRoom]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !keyRef.current || !socketRef.current) return;

    if (!socketRef.current.connected) {
      setErrorMsg('Not connected. Retrying.');
      openSocket(keyRef.current, roomIdRef.current);
      return;
    }

    setInputText('');
    try {
      const ciphertext = await encrypt(keyRef.current, text);
      socketRef.current.emit('sendMessage', { roomId: roomIdRef.current, data: ciphertext });
      setMessages(prev => [...prev, { id: `${Date.now()}`, text, sender: 'me', timestamp: new Date() }]);
    } catch (err) {
      console.error('encrypt failed', err);
    }
  };

  // ── Join via pasted invite link ───────────────────────────────────────────
  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinInput.trim();
    if (!raw) return;

    // Extract hash from full URL or use as-is if it's just the hash
    let hash = '';
    
    try {
      // Try parsing as full URL
      if (raw.includes('://')) {
        const url = new URL(raw);
        hash = url.hash.replace(/^#/, '');
      } else if (raw.includes('#')) {
        // Extract hash from partial URL
        hash = raw.split('#')[1];
      } else {
        // Assume it's just the hash parameters
        hash = raw;
      }
    } catch (err) {
      console.error('[Chat] Failed to parse join URL:', err);
      setErrorMsg('Invalid invite link format. Please paste the full URL.');
      return;
    }

    // Validate hash contains required parameters
    if (!hash || !hash.includes('room=') || !hash.includes('key=')) {
      setErrorMsg('Invalid invite link. Missing room or key parameters.');
      return;
    }

    console.log('[Chat] Joining room via pasted link:', hash);
    
    setJoinInput('');
    setShowJoin(false);
    setErrorMsg(''); // Clear any previous errors
    
    // Disconnect current socket before joining new room
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }
    
    // Initialize with the new room parameters
    initRoom(`#${hash}`);
  };

  // ── Self-destruct ─────────────────────────────────────────────────────────
  const wipeSession = () => {
    if (!confirm('Wipe all messages and close this session?')) return;
    socketRef.current?.emit('wipe-session');
    socketRef.current?.disconnect();
    setMessages([]);
    history.replaceState(null, '', location.pathname);
    location.reload();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setJoinInput(text);
    } catch {
      /* clipboard unavailable */
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── Connecting state ──────────────────────────────────────────────────────
  if (status === 'connecting') {
    return (
      <section className="relative pt-32 pb-20 px-6 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-5"
        >
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-xl animate-pulse" />
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin relative z-10" />
          </div>
          <div>
            <div className="text-white font-bold tracking-tight">Establishing secure tunnel</div>
            <div className="text-zinc-500 text-xs mt-1">Negotiating end-to-end keys.</div>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="relative pt-24 pb-4 px-4 sm:px-6" style={{ minHeight: '100dvh' }}>
      <div className="max-w-4xl w-full mx-auto flex flex-col" style={{ height: 'calc(100dvh - 7rem)' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-cyan-400" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Secure room
                </h1>
                <span className="text-zinc-600 font-mono text-sm">#{roomId}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                />
              </div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-black mt-0.5">
                {status === 'connected' ? 'AES-256-GCM · zero-log relay' : 'Disconnected'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowJoin(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors ${showJoin
                  ? 'bg-zinc-800 border-zinc-700 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Join
            </button>

            <button
              onClick={copyLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors ${isCopied
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Copied' : 'Invite'}
            </button>

            <button
              onClick={wipeSession}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-red-500/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wipe
            </button>
          </div>
        </motion.div>

        {/* Join form */}
        <AnimatePresence>
          {showJoin && (
            <motion.form
              key="join"
              onSubmit={joinRoom}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3 shrink-0"
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={joinInput}
                    onChange={e => setJoinInput(e.target.value)}
                    placeholder="Paste invite URL"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-20 py-3 text-zinc-200 font-mono text-xs focus:border-cyan-500/50 outline-none transition-colors placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors"
                  >
                    Paste
                  </button>
                </div>
                <button
                  type="submit"
                  className="bg-white text-black px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-colors shrink-0"
                >
                  Join
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Status banner */}
        <AnimatePresence mode="wait">
          {errorMsg ? (
            <motion.div
              key="err"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300 truncate">{errorMsg}</p>
                </div>
                <button
                  onClick={() => {
                    setErrorMsg('');
                    if (keyRef.current) openSocket(keyRef.current, roomIdRef.current);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest transition-colors shrink-0"
                >
                  <RefreshCcw className="w-3 h-3" /> Retry
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Chat area — grows to fill remaining space, scrolls internally */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-[2rem] overflow-hidden relative"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="h-full overflow-y-scroll custom-scrollbar">
            <div className="p-4 sm:p-6 pr-3 sm:pr-4 h-full">
            {/* Empty state */}
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                  <MessageSquare className="w-6 h-6 text-zinc-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-bold tracking-tight mb-1">Encrypted tunnel open</h3>
                <p className="text-zinc-500 text-xs mb-6 max-w-xs">
                  Send a message or share the invite link with your peer to start.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? 'Copied' : 'Copy invite'}
                  </button>
                  {!showJoin && (
                    <button
                      onClick={() => setShowJoin(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      <LogIn className="w-3 h-3" /> Join other room
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 w-full">
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex w-full ${msg.sender === 'system'
                        ? 'justify-center'
                        : msg.sender === 'me'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                  >
                    {msg.sender === 'system' ? (
                      <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] uppercase tracking-widest font-black text-zinc-500">
                        {msg.text}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[75%] flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'
                          }`}
                      >
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${msg.sender === 'me'
                              ? 'bg-white text-black rounded-br-md'
                              : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-md'
                            }`}
                        >
                          {msg.text}
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-zinc-700 font-black mt-1 px-1">
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Input bar */}
        <form onSubmit={sendMessage} className="mt-4 shrink-0">
          <div className="relative flex bg-zinc-950 border border-zinc-800 focus-within:border-cyan-500/40 rounded-2xl p-1.5 transition-colors">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                status === 'connected' ? 'Type an encrypted message…' : 'Connecting…'
              }
              disabled={status !== 'connected'}
              className="flex-grow bg-transparent pl-11 pr-3 py-3 text-zinc-200 focus:outline-none text-sm disabled:opacity-40 placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={status !== 'connected' || !inputText.trim()}
              className="bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black px-5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 text-[10px] uppercase tracking-widest text-zinc-700 font-black">
            <Lock className="w-3 h-3" />
            Messages are encrypted on this device. We see only ciphertext.
          </div>
        </form>
      </div>
    </section>
  );
};
