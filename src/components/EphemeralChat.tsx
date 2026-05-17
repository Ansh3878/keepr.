import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Trash2, Lock, MessageSquare, ShieldCheck, Loader2, Copy, Link as LinkIcon, RefreshCcw, AlertTriangle, LogIn } from 'lucide-react';
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

const importRawKey = async (b64: string): Promise<CryptoKey> => {
  const bin = atob(b64);
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

  // ── WebSocket connection (with silent auto-retry for cold starts) ─────────
  const openSocket = useCallback((key: CryptoKey, room: string, attempt = 0) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (attempt === 0) {
      retryCountRef.current = 0;
      setStatus('connecting');
      setErrorMsg('');
    }

    const socket = io({ query: { room } });

    // 12-second per-attempt timeout
    timeoutRef.current = setTimeout(() => {
      if (!socket.connected) {
        socket.disconnect();
        handleFailure(key, room, attempt, 'Connection timed out.');
      }
    }, 12000);

    const handleFailure = (k: CryptoKey, r: string, att: number, reason: string) => {
      clearTimeout(timeoutRef.current!);
      retryCountRef.current = att + 1;
      if (att < MAX_RETRIES - 1) {
        const delay = Math.pow(2, att) * 1000;
        console.log(`[WS] retrying in ${delay}ms (attempt ${att + 2}/${MAX_RETRIES})…`);
        timeoutRef.current = setTimeout(() => openSocket(k, r, att + 1), delay);
      } else {
        setStatus('error');
        setErrorMsg(`${reason} Press Retry.`);
      }
    };

    socket.on('connect', () => {
      clearTimeout(timeoutRef.current!);
      console.log('[WS] connected to room:', room);
      retryCountRef.current = 0;
      setStatus('connected');
      setErrorMsg('');
    });

    socket.on('chat-message', async (data: string) => {
      try {
        if (!data) return;
        const text = await decrypt(key, data);
        setMessages(prev => [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          text,
          sender: 'other',
          timestamp: new Date()
        }]);
      } catch { /* wrong key or corrupt message – ignore */ }
    });

    socket.on('peer-disconnected', () => {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        text: '⚠️ Peer has disconnected and wiped their session.',
        sender: 'system',
        timestamp: new Date()
      }]);
    });

    socket.on('disconnect', (reason) => {
      clearTimeout(timeoutRef.current!);
      console.log('[WS] disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        handleFailure(key, room, attempt, `Tunnel closed.`);
      }
    });

    socketRef.current = socket;
  }, []);

  // ── Room initialisation ───────────────────────────────────────────────────
  const initRoom = useCallback(async (hashOverride?: string) => {
    const hash = (hashOverride ?? window.location.hash).replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const urlRoom = params.get('room');
    const urlKey  = params.get('key');

    let room: string;
    let rawKey: string;
    let key: CryptoKey;

    // PRIORITY 1: Explicit URL/Hash override (Crucial for joining a new room while already in one)
    if (urlRoom && urlKey) {
      room   = urlRoom;
      rawKey = urlKey;
      try {
        key = await importRawKey(urlKey);
      } catch {
        // bad key – create fresh session
        room   = Math.random().toString(36).substring(2, 8).toUpperCase();
        rawKey = await generateRawKey();
        key    = await importRawKey(rawKey);
      }
    } 
    // PRIORITY 2: Props from parent (e.g. joining from Vault link)
    else if (initialRoomId && initialKey) {
      room = initialRoomId;
      rawKey = initialKey;
      try {
        key = await importRawKey(initialKey);
      } catch {
        room = Math.random().toString(36).substring(2, 8).toUpperCase();
        rawKey = await generateRawKey();
        key = await importRawKey(rawKey);
      }
    } 
    // PRIORITY 3: Fresh Random Room
    else {
      room   = Math.random().toString(36).substring(2, 8).toUpperCase();
      rawKey = await generateRawKey();
      key    = await importRawKey(rawKey);
    }

    const newUrl = `${location.origin}${location.pathname}#room=${room}&key=${rawKey}`;

    keyRef.current   = key;
    roomIdRef.current = room;

    setRoomId(room);
    setShareUrl(newUrl);
    setMessages([]);

    // Update URL without page reload or pushState spam
    history.replaceState(null, '', newUrl);

    openSocket(key, room);
  }, [openSocket]);

  useEffect(() => {
    initRoom();
    return () => {
      clearTimeout(timeoutRef.current!);
      socketRef.current?.disconnect();
    };
  }, [initRoom]);

  useEffect(() => {
    // Scroll only the inner chat div — never the whole page
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !keyRef.current || !socketRef.current) return;

    if (!socketRef.current.connected) {
      setErrorMsg('Not connected – retrying…');
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

  // ── Join via pasted link or URL fragment ──────────────────────────────────
  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinInput.trim();
    if (!raw) return;

    // Extract the hash portion whether user pasted full URL or just the fragment
    let hash = raw.includes('#') ? raw.split('#')[1] : raw;
    // Allow "room=X&key=Y" without leading #
    if (!hash.includes('room=') || !hash.includes('key=')) {
      setErrorMsg('Invalid invite link. Make sure you pasted the full URL.');
      return;
    }

    setJoinInput('');
    setShowJoin(false);
    initRoom(`#${hash}`);
  };

  // ── Self-destruct ─────────────────────────────────────────────────────────
  const wipeSession = () => {
    if (!confirm('Wipe all messages and close this session?')) return;
    socketRef.current?.disconnect();
    setMessages([]);
    history.replaceState(null, '', location.pathname);
    location.reload();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin relative z-10" />
          </div>
          <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase animate-pulse">Establishing Secure Tunnel…</p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative pt-44 pb-20 px-6 min-h-screen bg-zinc-950 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-cyan-500/[0.02] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto flex flex-col h-[80vh] relative z-10">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-500" />
              <h2 className="text-white font-black uppercase tracking-tighter text-2xl">
                Secure Room <span className="text-zinc-600">#{roomId}</span>
              </h2>
              <span className={`ml-2 w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            </div>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-[0.2em]">End-to-End Encrypted · AES-256-GCM</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Join button */}
            <button
              onClick={() => setShowJoin(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${showJoin ? 'bg-white text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
            >
              <LogIn className="w-3.5 h-3.5" /> Join
            </button>

            {/* Copy invite link */}
            <button
              onClick={copyLink}
              className={`flex-grow md:flex-grow-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
            >
              <Copy className="w-3.5 h-3.5" /> {isCopied ? 'Copied!' : 'Invite'}
            </button>

            {/* Wipe */}
            <button
              onClick={wipeSession}
              className="group flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded-xl transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-400 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-red-400 transition-colors">Wipe</span>
            </button>
          </div>
        </div>

        {/* ── Join input ── */}
        <AnimatePresence>
          {showJoin && (
            <motion.form
              key="join"
              onSubmit={joinRoom}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden flex bg-zinc-900 border border-cyan-500/30 rounded-2xl p-2 gap-2"
            >
              <LinkIcon className="w-4 h-4 text-cyan-500 self-center ml-3 shrink-0" />
              <input
                autoFocus
                type="text"
                value={joinInput}
                onChange={e => setJoinInput(e.target.value)}
                placeholder="Paste the full invite URL here…"
                className="flex-grow bg-transparent py-2 text-zinc-300 focus:outline-none text-xs"
              />
              <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shrink-0">
                Join Room
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ── Error / Info banner ── */}
        <AnimatePresence>
          {errorMsg ? (
            <motion.div
              key="err"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-[11px] text-red-200/80">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setErrorMsg(''); openSocket(keyRef.current!, roomIdRef.current); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 text-[9px] font-black uppercase tracking-widest transition-all"
              >
                <RefreshCcw className="w-3 h-3" /> Retry
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="info"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 mb-4 flex items-center gap-3"
            >
              <Lock className="w-4 h-4 text-cyan-500 shrink-0" />
              <p className="text-[11px] text-cyan-200/50">
                Zero-knowledge relay · Messages are never stored or logged · Key lives only in your browser
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat area ── */}
        <div ref={chatContainerRef} className="flex-grow bg-zinc-900/30 border border-zinc-900 rounded-[2.5rem] p-8 overflow-y-auto mb-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-8">
              <div className="opacity-30 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center border border-zinc-800">
                  <MessageSquare className="w-8 h-8 text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-tight uppercase text-sm">No Signal</h3>
                  <p className="text-zinc-500 text-xs italic font-serif mt-1">Encrypted tunnel open. Waiting for transmission.</p>
                </div>
              </div>
              {!showJoin && (
                <div className="w-full max-w-xs border-t border-zinc-800/50 pt-8">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-black mb-3">Joining someone's room?</p>
                  <button
                    onClick={() => setShowJoin(true)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3 text-[10px] text-zinc-400 font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-3 h-3" /> Paste Invite Link
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-5">
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.sender === 'system' ? 'justify-center' : msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'system' ? (
                  <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[10px] uppercase tracking-widest font-bold my-2">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-[78%] space-y-1">
                    <div className={`px-5 py-3 rounded-2xl text-sm font-medium ${msg.sender === 'me'
                        ? 'bg-cyan-500 text-black rounded-tr-none'
                        : 'bg-zinc-800 text-zinc-200 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                    <p className={`text-[9px] font-mono uppercase tracking-tight text-zinc-600 ${msg.sender === 'me' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp.toLocaleTimeString()} · AES-256-GCM
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <form onSubmit={sendMessage} className="relative group">
          <div className="absolute -inset-1 bg-cyan-500 rounded-3xl blur opacity-0 group-focus-within:opacity-10 transition duration-500" />
          <div className="relative flex bg-zinc-950 border border-zinc-900 rounded-2xl p-2 gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={status === 'connected' ? 'Type an encrypted message…' : 'Connecting…'}
              disabled={status !== 'connected'}
              className="flex-grow bg-transparent px-6 py-4 text-zinc-300 focus:outline-none text-sm disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={status !== 'connected' || !inputText.trim()}
              className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-black px-4 sm:px-8 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Transmit</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
