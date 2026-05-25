import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useUser, useAuth } from '@clerk/clerk-react';
import JSZip from 'jszip';
import { 
  Folder, 
  FileText, 
  Video, 
  Music, 
  Image as ImageIcon, 
  File, 
  SlidersHorizontal, 
  Key, 
  ShieldAlert, 
  Clock, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  MoreVertical,
  Search, 
  Grid, 
  List, 
  Sparkles, 
  Check, 
  Mail, 
  ArrowRight, 
  AlertTriangle,
  FolderLock,
  Lock,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  FolderUp,
  X,
  FileSpreadsheet,
  Copy
} from 'lucide-react';

// ==========================================
// PRE-DEFINED MOCK FILES (Finder Assets)
// ==========================================
interface S3File {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'audio' | 'image' | 'archive' | 'text' | 'spreadsheet' | 'misc';
  size: string;
  bytes: number;
  date: string;
  encrypted: boolean;
}

const INITIAL_FILES: S3File[] = [
  { id: '1', name: 'security_handover_v1', type: 'video', size: '48.1 MB', bytes: 50436505, date: '2026-05-20', encrypted: true },
  { id: '2', name: 'family_photo_archive', type: 'archive', size: '124.7 MB', bytes: 130754150, date: '2026-04-12', encrypted: true },
  { id: '3', name: 'autonomous_credentials', type: 'text', size: '12 KB', bytes: 12288, date: '2026-05-21', encrypted: true },
  { id: '4', name: 'offshore_entity_report', type: 'pdf', size: '4.8 MB', bytes: 5033164, date: '2026-05-15', encrypted: true },
  { id: '5', name: 'vault_access_logs', type: 'text', size: '115 KB', bytes: 117760, date: '2026-05-21', encrypted: true }
];

// Room backgrounds
const BACKGROUNDS = [
  { id: 'dark-slate', name: 'Slate Void', class: 'bg-zinc-950 text-zinc-400' },
  { id: 'neon-cyber', name: 'Cyber Blue', class: 'bg-slate-950 bg-gradient-to-tr from-cyan-950/20 via-zinc-950 to-zinc-950 text-cyan-400/90' },
  { id: 'aurora-dark', name: 'Sleek Obsidian', class: 'bg-zinc-950 text-zinc-300' },
  { id: 'crimson-deep', name: 'Deep Crimson', class: 'bg-zinc-950 bg-gradient-to-b from-red-950/20 to-zinc-950 text-zinc-300' },
  { id: 'monochrome', name: 'Void Deep', class: 'bg-black text-white/85' }
];

// File Type Helper
const getFileIcon = (type: S3File['type']) => {
  switch (type) {
    case 'pdf': return <FileText className="w-12 h-12 text-rose-400 shrink-0" />;
    case 'video': return <Video className="w-12 h-12 text-indigo-400 shrink-0" />;
    case 'audio': return <Music className="w-12 h-12 text-emerald-400 shrink-0" />;
    case 'image': return <ImageIcon className="w-12 h-12 text-amber-400 shrink-0" />;
    case 'archive': return <FolderLock className="w-12 h-12 text-cyan-400 shrink-0" />;
    case 'text': return <FileText className="w-12 h-12 text-zinc-400 shrink-0" />;
    case 'spreadsheet': return <FileSpreadsheet className="w-12 h-12 text-emerald-500 shrink-0" />;
    default: return <File className="w-12 h-12 text-zinc-500 shrink-0" />;
  }
};

export interface SecureRoom {
  id: string;
  name: string;
  pin: string;
  encryptionKeyHash: string;
  safetyStrategy: 'purge' | 'migration';
  inactivityDays: number;
  transferEmail: string;
  files: S3File[];
  createdAt: string;
}

// Derive a secure CryptoKey from the local Vault passphrase/hash for use with Web Crypto API
const getCryptoKey = async (passphrase: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const rawKey = enc.encode(passphrase || 'fallback-secret-gcm-key');
  const hash = await window.crypto.subtle.digest('SHA-256', rawKey);
  return await window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
};

// Compute a SHA-256 hash of a string to use as a blind identifier
const hashStringSHA256 = async (str: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export function SecureStorageRoom() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const userName = user?.firstName || 'Secure Vault';

  const SECURE_ROOM_API_ENDPOINT = import.meta.env.VITE_SECURE_ROOM_API_ENDPOINT || '';

  // Multi-Room State Management
  const [rooms, setRooms] = useState<SecureRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Fetch Rooms from AWS DynamoDB via REST API
  const fetchRoomsFromBackend = async () => {
    if (!SECURE_ROOM_API_ENDPOINT || SECURE_ROOM_API_ENDPOINT.includes('REPLACE_WITH_YOUR_API_ID')) {
      console.warn("REST API endpoint not configured yet. Fallback to offline mode.");
      return;
    }
    setIsLoadingRooms(true);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`${SECURE_ROOM_API_ENDPOINT}/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedRooms: SecureRoom[] = (data.rooms || []).map((r: any) => ({
          id: r.roomId,
          name: r.name,
          pin: r.pin,
          encryptionKeyHash: r.encryptionKey || r.passkey || '',
          safetyStrategy: r.safetyStrategy,
          inactivityDays: r.inactivityDays,
          transferEmail: r.transferEmail,
          files: [], // we will fetch files when a room is unlocked/selected
          createdAt: r.createdAt.substring(0, 10),
        }));
        setRooms(mappedRooms);
      } else {
        console.error("Failed to fetch rooms from backend:", response.statusText);
      }
    } catch (e) {
      console.error("Error fetching rooms:", e);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  // Fetch files in a room from S3 via AWS REST API
  const fetchRoomFiles = async (roomId: string): Promise<S3File[]> => {
    let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
      const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
      if (match && match[1]) {
        apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
      }
    }
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      console.warn("REST API endpoint not configured yet. Fallback to mock files.");
      return INITIAL_FILES;
    }
    try {
      const token = await getToken();
      if (!token) return [];
      const response = await fetch(`${apiEndpoint}/rooms/${roomId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedFiles: S3File[] = (data.files || []).map((f: any) => {
          const sizeInBytes = f.size || 0;
          const sizeString = sizeInBytes > 1024 * 1024 
            ? `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
            : `${(sizeInBytes / 1024).toFixed(0)} KB`;
            
          const fileExtension = f.fileName?.split('.').pop()?.toLowerCase() || '';
          const fileTypeMapping: Record<string, S3File['type']> = {
            'pdf': 'pdf',
            'mp4': 'video',
            'mov': 'video',
            'avi': 'video',
            'mkv': 'video',
            'mp3': 'audio',
            'wav': 'audio',
            'ogg': 'audio',
            'png': 'image',
            'jpg': 'image',
            'jpeg': 'image',
            'gif': 'image',
            'zip': 'archive',
            'tar': 'archive',
            'gz': 'archive',
            'rar': 'archive',
            '7z': 'archive',
            'txt': 'text',
            'md': 'text',
            'json': 'text',
            'csv': 'spreadsheet',
            'xlsx': 'spreadsheet',
            'xls': 'spreadsheet'
          };
          const mappedType = fileTypeMapping[fileExtension] || 'misc';
          return {
            id: f.key || Math.random().toString(),
            name: f.fileName || 'unidentified_file',
            type: mappedType,
            size: sizeString,
            bytes: sizeInBytes,
            date: f.lastModified ? f.lastModified.substring(0, 10) : new Date().toISOString().substring(0, 10),
            encrypted: true
          };
        });
        return mappedFiles;
      } else {
        console.error("Failed to fetch room files:", response.statusText);
      }
    } catch (e) {
      console.error("Error fetching room files:", e);
    }
    return [];
  };

  useEffect(() => {
    if (user) {
      fetchRoomsFromBackend();
    }
  }, [user]);

  // Active Selected Room and Unlock Flags
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedRoomToUnlock, setSelectedRoomToUnlock] = useState<SecureRoom | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [matchedUrlRoomId, setMatchedUrlRoomId] = useState<string | null>(null);
  
  // Create Room Wizard state
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPin, setNewRoomPin] = useState('');
  const [newRoomStrategy, setNewRoomStrategy] = useState<'purge' | 'migration'>('purge');
  const [newRoomTransferEmail, setNewRoomTransferEmail] = useState('');
  const [newRoomKey, setNewRoomKey] = useState('');
  const [newRoomInactivityDays, setNewRoomInactivityDays] = useState(30);
  const [wizardError, setWizardError] = useState('');
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);
  const [wizardKeyCopied, setWizardKeyCopied] = useState(false);

  // Editing names in room list
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomNameInput, setEditRoomNameInput] = useState('');

  // Authentication input state
  const [enteredPasskey, setEnteredPasskey] = useState('');
  const [enteredVaultKey, setEnteredVaultKey] = useState('');
  const [showVaultKey, setShowVaultKey] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [vaultKey, setVaultKey] = useState('');
  
  // Finder Explorer State (mounted from active room)
  const [files, setFiles] = useState<S3File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [roomName, setRoomName] = useState('');
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [currentBg, setCurrentBg] = useState(BACKGROUNDS[1]); // Neon Cyber
  
  // File Action Modal/Inputs
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeFileMenuId, setActiveFileMenuId] = useState<string | null>(null);

  // Room Deletion Security confirmation states
  const [roomToPurge, setRoomToPurge] = useState<SecureRoom | null>(null);
  const [deleteRoomPinInput, setDeleteRoomPinInput] = useState('');
  const [deleteRoomPinError, setDeleteRoomPinError] = useState('');

  // Auto-Destruct & Dead Man's Switch State
  const [showSettings, setShowSettings] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState('2026-05-21 12:00:27 UTC');
  const [inactivityDays, setInactivityDays] = useState(30);
  const [autoDestructEnabled, setAutoDestructEnabled] = useState(true);
  const [safeTransferEnabled, setSafeTransferEnabled] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [activeRoomStrategy, setActiveRoomStrategy] = useState<'purge' | 'migration' | 'handoff_unlocked'>('purge');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Manage body scroll lock when modal is open
  const isAnyModalOpen = !!(showSettings || isRenameOpen || isDeleteConfirmOpen || !!roomToPurge);
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      setActiveFileMenuId(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (!activeFileMenuId) return;

    const closeMenu = () => setActiveFileMenuId(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [activeFileMenuId]);

  // Drag and Drop ordering state
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFileId, setDragOverFileId] = useState<string | null>(null);
  const cancelNextClick = useRef(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedFileId(id);
    cancelNextClick.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedFileId !== targetId) {
      setDragOverFileId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverFileId(null);
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
    setDragOverFileId(null);
    setTimeout(() => {
      cancelNextClick.current = false;
    }, 150);
  };

  // Helper to persist files changes inside active room files state array
  const handleUpdateActiveRoomFiles = (updatedFiles: S3File[]) => {
    setFiles(updatedFiles);
    if (activeRoomId) {
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, files: updatedFiles } : r));
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverFileId(null);
    
    const dragId = e.dataTransfer.getData('text/plain') || draggedFileId;
    if (!dragId || dragId === targetId) return;

    const draggedIndex = files.findIndex(f => f.id === dragId);
    const targetIndex = files.findIndex(f => f.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const reorderedFiles = [...files];
    const [removed] = reorderedFiles.splice(draggedIndex, 1);
    reorderedFiles.splice(targetIndex, 0, removed);

    handleUpdateActiveRoomFiles(reorderedFiles);
    setDraggedFileId(null);

    setFeedbackMsg('Vault items rearranged successfully.');
    setTimeout(() => setFeedbackMsg(''), 2500);
    handleUpdateActivity();

    setTimeout(() => {
      cancelNextClick.current = false;
    }, 150);
  };

  // Ref for context menu container and modals
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Generate Unique Cryptographic key
  const generateNewKey = () => {
    const chars = 'abcdef0123456789';
    let result = 'keepr-key-';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Launch Cryptographic key generation when step becomes 3 in wizard
  useEffect(() => {
    if (showCreateWizard && wizardStep === 3 && !newRoomKey) {
      setNewRoomKey(generateNewKey());
    }
  }, [wizardStep, showCreateWizard, newRoomKey]);

  // Pull URL hash if available upon mount or room list load
  useEffect(() => {
    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    if (hash) {
      const checkHashMatch = async () => {
        const hashed = await hashStringSHA256(hash);
        const matchedRoom = rooms.find(r => r.encryptionKeyHash === hashed);
        if (matchedRoom) {
          setSelectedRoomToUnlock(matchedRoom);
          setEnteredVaultKey(hash); // Pre-fill the key
          setMatchedUrlRoomId(matchedRoom.id);
        }
      };
      checkHashMatch();
    } else {
      setMatchedUrlRoomId(null);
    }
  }, [rooms]);

  // Auto-open room unlock modal if ?roomId=... is in the URL
  useEffect(() => {
    if (rooms.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetRoomId = params.get('roomId');
      if (targetRoomId) {
        const matchedRoom = rooms.find(r => r.id === targetRoomId);
        if (matchedRoom) {
          setSelectedRoomToUnlock(matchedRoom);
          
          // Clear query parameters from URL so it is clean on reload
          const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    }
  }, [rooms]);



  // Update Activity Timestamp on any click action in the safe room
  const handleUpdateActivity = () => {
    const now = new Date();
    setLastActiveAt(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
  };

  const executeFallbackCopy = (text: string, successMessage: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setFeedbackMsg(successMessage);
      } else {
        setFeedbackMsg('Copy command failed.');
      }
    } catch (err) {
      console.error('Fallback copy error:', err);
      setFeedbackMsg('Unable to copy.');
    }
    document.body.removeChild(textArea);
    setTimeout(() => setFeedbackMsg(''), 2000);
  };

  const handleCopyText = (text: string, successMessage: string = 'Copied to clipboard!') => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setFeedbackMsg(successMessage);
          setTimeout(() => setFeedbackMsg(''), 2000);
        })
        .catch(err => {
          console.warn('Failed to copy text with modern API, using fallback:', err);
          executeFallbackCopy(text, successMessage);
        });
    } else {
      executeFallbackCopy(text, successMessage);
    }
  };

  // Unlock and Mount individual room
  const handleUnlockRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomToUnlock) return;

    const enteredKeyHash = await hashStringSHA256(enteredVaultKey);

    if (
      enteredPasskey === selectedRoomToUnlock.pin &&
      enteredKeyHash === selectedRoomToUnlock.encryptionKeyHash
    ) {
      // Mount Room Details
      setActiveRoomId(selectedRoomToUnlock.id);
      setRoomName(selectedRoomToUnlock.name);
      setVaultKey(enteredVaultKey);
      
      // Auto-set settings options based on strategy
      setAutoDestructEnabled(selectedRoomToUnlock.safetyStrategy === 'purge');
      setSafeTransferEnabled(selectedRoomToUnlock.safetyStrategy === 'migration');
      setActiveRoomStrategy(selectedRoomToUnlock.safetyStrategy);
      setTransferEmail(selectedRoomToUnlock.transferEmail);
      setInactivityDays(selectedRoomToUnlock.inactivityDays);

      setIsLoadingRooms(true);
      const fetchedFiles = await fetchRoomFiles(selectedRoomToUnlock.id);
      setFiles(fetchedFiles);
      setRooms(prev => prev.map(r => r.id === selectedRoomToUnlock.id ? { ...r, files: fetchedFiles } : r));
      setIsLoadingRooms(false);

      // Set state to unlocked and embed key
      setIsUnlocked(true);
      setPasskeyError('');
      window.location.hash = enteredVaultKey;
      setMatchedUrlRoomId(selectedRoomToUnlock.id);
      handleUpdateActivity();
      setFeedbackMsg(`Vault mounted correctly. Decrypted with E2E safe keys.`);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } else {
      setPasskeyError('Verification unsuccessful. Please verify PIN and Vault Key credentials.');
    }
  };

  // Dismantle/Exit Room
  const handleExitRoom = () => {
    setActiveRoomId(null);
    setSelectedRoomToUnlock(null);
    setIsUnlocked(false);
    setEnteredPasskey('');
    setEnteredVaultKey('');
    setPasskeyError('');
    setVaultKey('');
    window.location.hash = ''; // clear key parameter
    setMatchedUrlRoomId(null);
    setFeedbackMsg('Active vault dismantled safely. Local buffers cleared.');
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  // Create new security room initialization
  const handleCreateRoomWizardComplete = async () => {
    if (isCreatingRoom) return;
    if (!newRoomName.trim()) {
      setWizardError('Provide a Room label.');
      return;
    }
    if (newRoomPin.length < 4) {
      setWizardError('PIN code must contain at least 4 digits.');
      return;
    }

    setIsCreatingRoom(true);
    setWizardError('');

    const roomKey = newRoomKey || generateNewKey();
    const roomKeyHash = await hashStringSHA256(roomKey);
    
    let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
      const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
      if (match && match[1]) {
        apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
      }
    }

    let createdRoomId = 'room-' + Date.now();
    let hasBackendSuccess = false;

    if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      try {
        const token = await getToken();
        if (token) {
          const response = await fetch(`${apiEndpoint}/rooms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: newRoomName.trim(),
              pin: newRoomPin,
              encryptionKey: roomKeyHash,
              rawVaultKey: newRoomStrategy === 'migration' ? roomKey : undefined,
              safetyStrategy: newRoomStrategy,
              inactivityDays: newRoomInactivityDays,
              transferEmail: newRoomTransferEmail,
            })
          });
          if (response.ok) {
            const data = await response.json();
            createdRoomId = data.roomId;
            hasBackendSuccess = true;

            // Trigger Next.js email API route for room creation using Gmail SMTP
            try {
              await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'create',
                  userEmail: user?.primaryEmailAddress?.emailAddress || import.meta.env.VITE_EMAIL_USER || '',
                  roomDetails: {
                    roomId: createdRoomId,
                    name: newRoomName.trim(),
                    safetyStrategy: newRoomStrategy,
                    inactivityDays: newRoomInactivityDays,
                    transferEmail: newRoomTransferEmail,
                    rawVaultKey: newRoomStrategy === 'migration' ? roomKey : undefined,
                  }
                })
              });
            } catch (err) {
              console.error("Failed to trigger creation email notification:", err);
            }
          } else {
            const errText = await response.text();
            throw new Error(errText || response.statusText);
          }
        }
      } catch (e: any) {
        console.error("Error creating room in backend:", e);
        setWizardError(e.message || "Failed to create room on server.");
        setIsCreatingRoom(false);
        return; // Abort creation!
      }
    }

    const newRoom: SecureRoom = {
      id: createdRoomId,
      name: newRoomName.trim(),
      pin: newRoomPin,
      encryptionKeyHash: roomKeyHash,
      safetyStrategy: newRoomStrategy,
      inactivityDays: newRoomInactivityDays,
      transferEmail: newRoomTransferEmail,
      files: [],
      createdAt: new Date().toISOString().substring(0, 10),
    };

    // Save of rooms list
    if (hasBackendSuccess) {
      await fetchRoomsFromBackend();
    }

    // Embed current key
    window.location.hash = roomKey;
    setMatchedUrlRoomId(newRoom.id);

    // Immediately Mount/Unlock this newly created Room
    setSelectedRoomToUnlock(newRoom);
    setActiveRoomId(newRoom.id);
    setFiles(newRoom.files);
    setRoomName(newRoom.name);
    setVaultKey(roomKey);
    setAutoDestructEnabled(newRoom.safetyStrategy === 'purge');
    setSafeTransferEnabled(newRoom.safetyStrategy === 'migration');
    setTransferEmail(newRoom.transferEmail);
    setInactivityDays(newRoomInactivityDays);
    setActiveRoomStrategy(newRoom.safetyStrategy);
    setIsUnlocked(true);

    // Reset wizard input variables
    setNewRoomName('');
    setNewRoomPin('');
    setNewRoomKey('');
    setNewRoomStrategy('purge');
    setNewRoomTransferEmail('');
    setNewRoomInactivityDays(30);
    setWizardStep(1);
    setShowCreateWizard(false);
    setWizardError('');

    setFeedbackMsg(`Room [${newRoom.name}] generated and automatically mounted via hash-seed.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
    handleUpdateActivity();
    setIsCreatingRoom(false);
  };

  // Inline rename existing room name on the manager dashboard
  const handleStartRenameRoom = (room: SecureRoom) => {
    setEditingRoomId(room.id);
    setEditRoomNameInput(room.name);
  };

  const handleSaveRoomRename = async (roomId: string) => {
    if (editRoomNameInput.trim() !== '') {
      let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
      if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
        const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
        const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
        if (match && match[1]) {
          apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
        }
      }

      let hasBackendSuccess = false;
      if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
        try {
          const token = await getToken();
          if (token) {
            const response = await fetch(`${apiEndpoint}/rooms/${roomId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                name: editRoomNameInput.trim()
              })
            });
            if (response.ok) {
              hasBackendSuccess = true;
            }
          }
        } catch (e) {
          console.error("Error renaming room:", e);
        }
      }

      if (hasBackendSuccess) {
        await fetchRoomsFromBackend();
      } else {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, name: editRoomNameInput.trim() } : r));
      }
      
      setEditingRoomId(null);
      setFeedbackMsg('Vault resource identifier updated successfully.');
      setTimeout(() => setFeedbackMsg(''), 2500);
    }
  };

  // Delete/Purge entire room completely (triggered via trash icon)
  const handlePurgeRoom = (roomId: string) => {
    const r = rooms.find(room => room.id === roomId);
    if (r) {
      setRoomToPurge(r);
      setDeleteRoomPinInput('');
      setDeleteRoomPinError('');
    }
  };

  const handleConfirmPurgeRoom = async () => {
    if (!roomToPurge) return;
    if (deleteRoomPinInput !== roomToPurge.pin) {
      setDeleteRoomPinError('Incorrect room PIN. Authentication failed.');
      return;
    }
    
    // Correct PIN! Proceed to purge/delete room
    const roomId = roomToPurge.id;

    let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
      const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
      if (match && match[1]) {
        apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
      }
    }

    let hasBackendSuccess = false;
    if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      try {
        const token = await getToken();
        if (token) {
          const response = await fetch(`${apiEndpoint}/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            hasBackendSuccess = true;
          }
        }
      } catch (e) {
        console.error("Error purging room from backend:", e);
      }
    }

    if (hasBackendSuccess) {
      await fetchRoomsFromBackend();
    } else {
      setRooms(prev => prev.filter(r => r.id !== roomId));
    }

    if (selectedRoomToUnlock?.id === roomId) {
      setSelectedRoomToUnlock(null);
    }
    setRoomToPurge(null);
    setDeleteRoomPinInput('');
    setDeleteRoomPinError('');
    setFeedbackMsg('Vault room and associated records permanently shredded.');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Real secure file upload flow:
  // 1. Get presigned upload URL from backend API (POST /rooms/{roomId}/upload-url)
  // 2. Read file as ArrayBuffer and encrypt using AES-GCM client-side.
  // 3. Concatenate the 12-byte IV to the front of the ciphertext.
  // 4. PUT the combined binary payload to S3 directly via presigned URL.
  // 5. Refresh room files list.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    const originalFile = fileList[0];
    setIsUploading(true);
    setUploadProgress(10);
    handleUpdateActivity();

    let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
      const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
      if (match && match[1]) {
        apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
      }
    }

    try {
      // 1. Gather raw ArrayBuffer of the file
      const fileBuffer = await originalFile.arrayBuffer();
      setUploadProgress(25);

      // 2. Generate random initialization vector (IV) - 12 bytes for AES-GCM
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // 3. Derive or import the CryptoKey based on the custom user Vault key
      const cryptoKey = await getCryptoKey(vaultKey);
      setUploadProgress(40);

      // 4. Encrypt the file data using the browser's crypto engine
      const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, 
        cryptoKey, 
        fileBuffer
      );
      setUploadProgress(60);

      // 5. Package IV + Ciphertext
      const combinedBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
      combinedBuffer.set(iv, 0);
      combinedBuffer.set(new Uint8Array(encryptedData), iv.length);
      setUploadProgress(70);

      let uploadUrl = '';
      let s3Key = '';

      if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID') && activeRoomId) {
        // Request presigned URL from backend
        const token = await getToken();
        if (!token) throw new Error("Authentication failed");

        const presignResponse = await fetch(`${apiEndpoint}/rooms/${activeRoomId}/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: originalFile.name,
            contentType: originalFile.type || "application/octet-stream"
          })
        });

        if (!presignResponse.ok) {
          throw new Error(`Failed to generate upload URL: ${presignResponse.statusText}`);
        }

        const presignData = await presignResponse.json();
        uploadUrl = presignData.uploadUrl;
        s3Key = presignData.s3Key;
      }

      setUploadProgress(80);

      if (uploadUrl) {
        // Direct upload to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": originalFile.type || "application/octet-stream" },
          body: combinedBuffer,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Cloud storage node rejected secure payload with status ${uploadResponse.status}`);
        }
      } else {
        // Mock offline fallback
        const uploadResponse = await fetch('/api/secure-upload-mock', {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: combinedBuffer,
        });
        if (!uploadResponse.ok) {
          throw new Error(`Cloud server rejected secure payload with status ${uploadResponse.status}`);
        }
      }

      setUploadProgress(100);

      // Refresh the listed files in active room
      if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID') && activeRoomId) {
        const refreshedFiles = await fetchRoomFiles(activeRoomId);
        handleUpdateActiveRoomFiles(refreshedFiles);
      } else {
        // Fallback offline mock listing
        const fileTypeMapping: Record<string, S3File['type']> = {
          'application/pdf': 'pdf',
          'video/mp4': 'video',
          'audio/mpeg': 'audio',
          'audio/mp3': 'audio',
          'image/png': 'image',
          'image/jpeg': 'image',
          'image/gif': 'image',
          'application/zip': 'archive',
          'text/plain': 'text'
        };
        const mappedType = fileTypeMapping[originalFile.type] || 'misc';
        const sizeString = originalFile.size > 1024 * 1024 
          ? `${(originalFile.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(originalFile.size / 1024).toFixed(0)} KB`;

        const newFile: S3File = {
          id: s3Key || Math.random().toString(),
          name: originalFile.name,
          type: mappedType,
          size: sizeString,
          bytes: originalFile.size,
          date: new Date().toISOString().substring(0, 10),
          encrypted: true
        };
        const updatedFilesList = [newFile, ...files];
        handleUpdateActiveRoomFiles(updatedFilesList);
      }

      setIsUploading(false);
      setUploadProgress(0);
      setFeedbackMsg(`Successfully encrypted with AES-GCM and committed to secure off-grid S3 node.`);
      setTimeout(() => setFeedbackMsg(''), 3500);

    } catch (err: any) {
      console.error('File packaging error:', err);
      setFeedbackMsg(`Encryption Payload Rejected: ${err.message || 'AES-GCM encryption handshake failed.'}`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Real secure decrypted download flow:
  // 1. Get presigned download URL from backend API (POST /rooms/{roomId}/download-url)
  // 2. Fetch the combined binary payload from S3 (which has 12-byte IV prepended)
  // 3. Extract the 12-byte IV and decrypt the remaining ciphertext client-side using AES-GCM.
  // 4. Save/download decrypted buffer locally in browser.
  const handleDownloadFile = async (fileItem: S3File) => {
    setActiveFileMenuId(null);
    handleUpdateActivity();
    setFeedbackMsg(`Initiating download & clientside decryption for ${fileItem.name}...`);
    setTimeout(() => setFeedbackMsg(''), 3000);

    let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
      const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
      if (match && match[1]) {
        apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
      }
    }

    try {
      let downloadUrl = '';
      if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID') && activeRoomId) {
        const token = await getToken();
        if (!token) throw new Error("Authentication failed");

        const presignResponse = await fetch(`${apiEndpoint}/rooms/${activeRoomId}/download-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: fileItem.name
          })
        });

        if (!presignResponse.ok) {
          throw new Error(`Failed to generate download URL: ${presignResponse.statusText}`);
        }

        const presignData = await presignResponse.json();
        downloadUrl = presignData.downloadUrl;
      }

      if (!downloadUrl) {
        // Fallback or offline mock alert
        console.warn("REST API endpoint not configured. Offline mode bypass download.");
        setFeedbackMsg(`Download bypass: REST API is not fully deployed or configured.`);
        setTimeout(() => setFeedbackMsg(''), 3000);
        return;
      }

      // Fetch the binary combined payload
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to retrieve file from S3: ${response.statusText}`);
      }

      const combinedBuffer = await response.arrayBuffer();

      // Extract the 12-byte IV from the front of the combined buffer
      if (combinedBuffer.byteLength <= 12) {
        throw new Error("Invalid encrypted payload: too small to contain IV");
      }

      const iv = combinedBuffer.slice(0, 12);
      const ciphertext = combinedBuffer.slice(12);

      // Decrypt client-side using user's vault private key
      const cryptoKey = await getCryptoKey(vaultKey);
      const decryptedData = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        cryptoKey,
        ciphertext
      );

      // Trigger standard browser download of decrypted blob
      const mimeTypeMapping: Record<string, string> = {
        'pdf': 'application/pdf',
        'video': 'video/mp4',
        'audio': 'audio/mpeg',
        'image': 'image/png',
        'archive': 'application/zip',
        'text': 'text/plain',
        'spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      const mimeType = mimeTypeMapping[fileItem.type] || 'application/octet-stream';
      const decryptedBlob = new Blob([decryptedData], { type: mimeType });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(decryptedBlob);
      downloadLink.download = fileItem.name;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setFeedbackMsg(`Decrypted & downloaded asset: ${fileItem.name} using vault key.`);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (e: any) {
      console.error("Decryption download failed:", e);
      setFeedbackMsg(`Decryption failed: ${e.message || "Are you using the correct Vault Key?"}`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    }
  };

  // Modal actions
  const triggerRename = (fileItem: S3File) => {
    setActiveFileMenuId(null);
    setSelectedFile(fileItem);
    setRenameInput(fileItem.name);
    setIsRenameOpen(true);
  };

  const handleSaveRename = () => {
    if (selectedFile && renameInput.trim() !== '') {
      const updatedFilesList = files.map(f => f.id === selectedFile.id ? { ...f, name: renameInput.trim() } : f);
      handleUpdateActiveRoomFiles(updatedFilesList);
      setIsRenameOpen(false);
      setSelectedFile(null);
      setFeedbackMsg('Asset identifier updated successfully.');
      setTimeout(() => setFeedbackMsg(''), 3000);
      handleUpdateActivity();
    }
  };

  const triggerDelete = (fileItem: S3File) => {
    setActiveFileMenuId(null);
    setSelectedFile(fileItem);
    setIsDeleteConfirmOpen(true);
  };

  const renderFileActionsMenu = (fileItem: S3File, placement: 'grid' | 'list') => {
    const isMenuOpen = activeFileMenuId === fileItem.id;

    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setActiveFileMenuId(current => current === fileItem.id ? null : fileItem.id);
    };

    const menuShellClass = placement === 'grid'
      ? `absolute top-2 right-2 z-20 ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} transition-opacity duration-200`
      : 'relative z-20 inline-flex justify-end';

    return (
      <div
        className={menuShellClass}
        onClick={(event) => event.stopPropagation()}
        onDragStart={(event) => event.stopPropagation()}
        draggable={false}
      >
        <button
          type="button"
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className={`h-8 w-8 rounded-full border backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
            isMenuOpen
              ? 'bg-white text-black border-white shadow-lg shadow-black/30'
              : 'bg-black/70 text-zinc-300 border-white/10 hover:bg-zinc-900 hover:text-white hover:border-white/20'
          }`}
          title="File actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className={`absolute right-0 ${placement === 'grid' ? 'top-10' : 'top-9'} w-52 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl`}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => handleDownloadFile(fileItem)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-cyan-500/10 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                  <Download className="w-3.5 h-3.5" />
                </span>
                Decrypt Download
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => triggerRename(fileItem)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 text-zinc-200 border border-white/10">
                  <Edit3 className="w-3.5 h-3.5" />
                </span>
                Rename Asset
              </button>
              <div className="h-px bg-white/5" />
              <button
                type="button"
                role="menuitem"
                onClick={() => triggerDelete(fileItem)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-red-300 hover:bg-red-500/10 hover:text-red-100 transition-colors cursor-pointer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/15">
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
                Purge Item
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const handleDeleteAsset = async () => {
    if (selectedFile) {
      let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
      if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
        const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
        const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
        if (match && match[1]) {
          apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
        }
      }

      let hasBackendSuccess = false;
      if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID') && activeRoomId) {
        try {
          const token = await getToken();
          if (token) {
            const response = await fetch(`${apiEndpoint}/rooms/${activeRoomId}/files`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                fileName: selectedFile.name
              })
            });
            if (response.ok) {
              hasBackendSuccess = true;
            } else {
              console.error("Failed to delete file from S3 bucket:", response.statusText);
            }
          }
        } catch (e) {
          console.error("Error purging file:", e);
        }
      }

      if (hasBackendSuccess && activeRoomId) {
        const refreshedFiles = await fetchRoomFiles(activeRoomId);
        handleUpdateActiveRoomFiles(refreshedFiles);
        setFeedbackMsg('Asset purged completely from S3 cluster.');
      } else {
        const updatedFilesList = files.filter(f => f.id !== selectedFile.id);
        handleUpdateActiveRoomFiles(updatedFilesList);
        setFeedbackMsg('Asset purged completely (Local offline mode).');
      }

      setIsDeleteConfirmOpen(false);
      setSelectedFile(null);
      setTimeout(() => setFeedbackMsg(''), 3000);
      handleUpdateActivity();
    }
  };

  const saveSettings = async () => {
    if (isSavingSettings) return;
    setIsSavingSettings(true);

    let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
      const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
      if (match && match[1]) {
        apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
      }
    }

    const safetyStrategy = autoDestructEnabled ? 'purge' : 'migration';
    let hasBackendSuccess = false;

    if (apiEndpoint && !apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID') && activeRoomId) {
      try {
        const token = await getToken();
        if (token) {
          const updatePayload: Record<string, any> = {
            inactivityDays: inactivityDays,
            safetyStrategy: safetyStrategy,
            transferEmail: transferEmail,
          };

          const response = await fetch(`${apiEndpoint}/rooms/${activeRoomId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatePayload)
          });
          if (response.ok) {
            hasBackendSuccess = true;

            // Trigger Next.js email API route for room settings update using Gmail SMTP in background
            fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'update',
                userEmail: user?.primaryEmailAddress?.emailAddress || import.meta.env.VITE_EMAIL_USER || '',
                roomDetails: {
                  roomId: activeRoomId,
                  name: roomName,
                  safetyStrategy: safetyStrategy,
                  inactivityDays: inactivityDays,
                  transferEmail: transferEmail,
                }
              })
            }).catch(err => {
              console.error("Failed to trigger update email notification:", err);
            });
          } else {
            console.error("Failed to update room settings in backend:", response.statusText);
            setFeedbackMsg('Failed to lock parameters into cloud node.');
            setTimeout(() => setFeedbackMsg(''), 3000);
          }
        }
      } catch (e) {
        console.error("Error saving room settings:", e);
        setFeedbackMsg('Connection interrupted. Settings not saved.');
        setTimeout(() => setFeedbackMsg(''), 3000);
      }
    }

    if (activeRoomId) {
      setRooms(prev => prev.map(r => r.id === activeRoomId ? {
        ...r,
        inactivityDays: inactivityDays,
        safetyStrategy: safetyStrategy,
        transferEmail: transferEmail,
      } : r));
    }

    if (hasBackendSuccess) {
      setFeedbackMsg('Automation criteria and inactivity parameters locked into cloud node.');
    } else if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      setFeedbackMsg('Automation criteria and inactivity parameters locked in (Local offline mode).');
    }

    setTimeout(() => setFeedbackMsg(''), 3000);
    setShowSettings(false);
    setIsSavingSettings(false);
    handleUpdateActivity();
  };

  // Immediately trigger cleanup or migration on demand (no waiting for 5-min cron)
  const triggerNow = async () => {
    if (!activeRoomId) return;
    let apiEndpoint = SECURE_ROOM_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || '';
      const match = wsUrl.match(/wss:\/\/([^.]+)\.execute-api/);
      if (match && match[1]) {
        apiEndpoint = `https://${match[1]}.execute-api.ap-south-1.amazonaws.com/dev`;
      }
    }
    if (!apiEndpoint || apiEndpoint.includes('REPLACE_WITH_YOUR_API_ID')) {
      setFeedbackMsg('API endpoint not configured. Cannot trigger remotely.');
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }

    setIsTriggeringNow(true);
    setShowSettings(false);
    const strategy = autoDestructEnabled ? 'purge' : 'migration';

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication failed');

      if (strategy === 'purge') {
        // ── Purge: backend deletes S3 + DynamoDB + sends email ──
        const res = await fetch(`${apiEndpoint}/rooms/${activeRoomId}/trigger-cleanup`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setFeedbackMsg(data.message || 'Purge complete. Room deleted and notification sent.');
          handleExitRoom();
          await fetchRoomsFromBackend();
        } else {
          throw new Error(data.error || res.statusText);
        }
      } else {
        // ── Migration: client-side decrypt → bundle into ZIP → download → then purge ──
        setFeedbackMsg('Listing room files for migration...');

        // 1. List files in this room
        const filesRes = await fetch(`${apiEndpoint}/rooms/${activeRoomId}/files`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!filesRes.ok) {
          const err = await filesRes.json();
          throw new Error(err.error || 'Failed to fetch room files');
        }
        const filesData = await filesRes.json();
        const roomFiles: any[] = filesData.files || [];

        if (roomFiles.length === 0) {
          setFeedbackMsg('No files to migrate. Cleaning up room...');
        } else {
          setFeedbackMsg(`Decrypting & bundling ${roomFiles.length} file(s) into a ZIP archive...`);
        }

        // 2. Initialize JSZip
        const zip = new JSZip();
        const cryptoKey = await getCryptoKey(vaultKey);
        let processedCount = 0;

        for (const file of roomFiles) {
          try {
            setFeedbackMsg(`Downloading & decrypting: ${file.fileName || 'file'} (${processedCount + 1}/${roomFiles.length})`);

            // Get presigned download URL
            const dlRes = await fetch(`${apiEndpoint}/rooms/${activeRoomId}/download-url`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ fileName: file.fileName }),
            });
            if (!dlRes.ok) {
              console.error(`Failed to get download URL for ${file.fileName}`);
              continue;
            }
            const { downloadUrl } = await dlRes.json();

            // Fetch encrypted blob from S3
            const encRes = await fetch(downloadUrl);
            if (!encRes.ok) {
              console.error(`Failed to fetch file payload for ${file.fileName}`);
              continue;
            }
            const encBuf = await encRes.arrayBuffer();

            // Extract IV (first 12 bytes) and decrypt
            let decryptedBuf: ArrayBuffer;
            if (encBuf.byteLength > 12) {
              const iv = new Uint8Array(encBuf.slice(0, 12));
              const ciphertext = encBuf.slice(12);
              try {
                decryptedBuf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
              } catch (decErr) {
                console.warn(`Could not decrypt ${file.fileName}, using original payload`, decErr);
                decryptedBuf = encBuf;
              }
            } else {
              decryptedBuf = encBuf;
            }

            // Add decrypted file to ZIP
            zip.file(file.fileName, new Uint8Array(decryptedBuf));
            processedCount++;
          } catch (fileErr) {
            console.error(`Failed to process ${file.fileName}:`, fileErr);
          }
        }

        if (roomFiles.length > 0 && processedCount === 0) {
          throw new Error('All files failed to download and decrypt. Please verify your Vault Private Key. The room has NOT been deleted.');
        }

        if (processedCount > 0) {
          setFeedbackMsg('Generating ZIP archive...');
          const zipContent = await zip.generateAsync({ type: 'blob' });
          
          const dateStr = new Date().toISOString().slice(0, 10);
          const zipName = `Keepr_Vault_Backup_${roomName}_${dateStr}.zip`;
          
          // Trigger browser download
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(zipContent);
          downloadLink.download = zipName;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          setFeedbackMsg(`ZIP download complete (${processedCount} files). Purging room...`);
        } else {
          setFeedbackMsg('No files were found in the room. Purging empty room...');
        }

        // 3. Purge room from Keepr (delete S3 + DynamoDB + send email)
        const cleanRes = await fetch(`${apiEndpoint}/rooms/${activeRoomId}/trigger-cleanup`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const cleanData = await cleanRes.json();
        if (cleanRes.ok) {
          setFeedbackMsg(`Done! ZIP downloaded & room purged. Check your email.`);
          handleExitRoom();
          await fetchRoomsFromBackend();
        } else {
          throw new Error(cleanData.error || 'Room cleanup failed after migration');
        }
      }
    } catch (err: any) {
      setFeedbackMsg(`Trigger error: ${err.message}`);
    } finally {
      setIsTriggeringNow(false);
      setTimeout(() => setFeedbackMsg(''), 8000);
    }
  };

  // Filter Files based on Query
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-black text-zinc-200 pt-32 pb-24 px-4 md:px-8 transition-all relative font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: rgba(9, 9, 11, 0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          border-color: rgba(6, 182, 212, 0.3);
          box-shadow: 0 0 24px rgba(6, 182, 212, 0.12);
          transform: translateY(-2px);
        }
        .status-glow {
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #000000;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.22);
          border-radius: 10px;
        }
      `}} />

      <div className="absolute top-1/2 left-1/2 -z-0 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.03] blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        <header className="relative overflow-hidden rounded-[2.5rem] border border-zinc-900 bg-zinc-950/50 p-6 md:p-10 shadow-2xl" data-purpose="workspace-header">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex flex-col">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] w-fit mb-4">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Keepr Secure Storage
            </div>
            <div className="space-y-2 mb-3">
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter">
                Personal <span className="font-serif italic font-extralight text-zinc-500">Vault.</span>
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-zinc-600 uppercase tracking-widest font-black">Signed in as {userName}</span>
                <span className="flex items-center px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-wider border border-cyan-500/20">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-1.5 status-glow"></span>
                  Fully Encrypted
                </span>
              </div>
            </div>
            
            {activeRoomId && isUnlocked ? (
              <div className="space-y-2 mt-1">
                <p className="text-sm text-zinc-500 max-w-xl">
                  Advanced Clientside Memory Pipeline. Your data is decrypted locally and never persists on our infrastructure in a readable state.
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">Active Vault: <span className="text-white">{roomName}</span></span>
                  <button 
                    onClick={() => {
                      handleCopyText(vaultKey, 'Vault Key copied to clipboard!');
                    }}
                    className="ml-2 px-2.5 py-1 rounded-full bg-black/50 text-[9px] text-cyan-400 border border-white/10 hover:border-cyan-500/40 font-mono flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    title="Copy Vault Private Key"
                  >
                    <span>Key: {vaultKey.substring(0, 10)}...</span>
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg text-zinc-500 max-w-xl font-light leading-relaxed">
                Zero-Knowledge Cryptographic Lockboxes. Design, unlock, and manage unlimited rooms locally.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap md:justify-end">
            {activeRoomId && isUnlocked ? (
              <>
                {activeRoomStrategy !== 'handoff_unlocked' && (
                  <>
                    <div 
                      onClick={() => setShowSettings(true)}
                      className="flex items-center px-4 py-2 bg-zinc-900/70 border border-zinc-800 hover:border-cyan-500/30 rounded-2xl space-x-3 text-zinc-300 text-xs font-bold cursor-pointer transition-all"
                    >
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{inactivityDays} Days Inactivity Lock</span>
                    </div>
                    <button 
                      onClick={() => setShowSettings(true)}
                      className="p-2.5 rounded-2xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Configure Parameters"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button 
                  onClick={handleExitRoom}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Exit Room</span>
                </button>
              </>
            ) : selectedRoomToUnlock ? (
              <button
                onClick={() => {
                  setSelectedRoomToUnlock(null);
                  setEnteredPasskey('');
                  setPasskeyError('');
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 rounded-2xl transition-all cursor-pointer text-xs uppercase font-black tracking-widest"
              >
                <span>← Back to Vaults</span>
              </button>
            ) : !showCreateWizard ? (
              <button
                onClick={() => {
                  setNewRoomName('');
                  setNewRoomPin('');
                  setNewRoomKey('');
                  setNewRoomStrategy('purge');
                  setWizardStep(1);
                  setWizardError('');
                  setShowCreateWizard(true);
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 font-black rounded-2xl transition-colors shadow-[0_0_20px_rgba(255,255,255,0.12)] cursor-pointer text-[10px] uppercase tracking-widest"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>Create New Room</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowCreateWizard(false);
                  setWizardStep(1);
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 rounded-2xl transition-all cursor-pointer text-xs uppercase font-black tracking-widest"
              >
                <span>Cancel Creation</span>
              </button>
            )}
          </div>
          </div>
        </header>

        {/* FEEDBACK TOAST BANNER */}
        <AnimatePresence>
          {feedbackMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-zinc-900 border border-zinc-800 text-cyan-400 rounded-xl text-center text-xs font-mono font-medium"
            >
              🔒 {feedbackMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PAGE CONTENT SWITCHBOARD */}
        {!activeRoomId ? (
          
          showCreateWizard ? (
            
            /* ROOM CREATION MULTI-STEP WIZARD */
            <div className="max-w-xl mx-auto my-6 bg-zinc-950/70 border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Create Cryptographic Vault</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-0.5">Step {wizardStep} of 4</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {[1, 2, 3, 4].map(idx => (
                    <div 
                      key={idx} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${idx <= wizardStep ? 'bg-cyan-400 w-3' : 'bg-zinc-700'}`} 
                    />
                  ))}
                </div>
              </div>

              {wizardError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-sans text-center">
                  ⚠️ {wizardError}
                </div>
              )}

              {/* Wizard Cards rendering based on step */}
              <AnimatePresence mode="wait">
                {wizardStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white">Give Your Secure Room a Label</h3>
                      <p className="text-xs text-zinc-500">
                        This designation separates your offline decryption channels and will be listed in your Sovereign Management dashboard.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">Room Name</label>
                      <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => {
                          setNewRoomName(e.target.value);
                          setWizardError('');
                        }}
                        placeholder="e.g. Confidential Offshore Records"
                        className="w-full bg-black/50 border border-zinc-800 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none transition-colors font-sans"
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white">Define Pin Protection</h3>
                      <p className="text-xs text-zinc-500">
                        Only requested on first-time room creation. Security passcodes process locally in secure sandboxed sandbox nodes.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">4-6 Digit Room PIN</label>
                      <input
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        value={newRoomPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setNewRoomPin(val);
                          setWizardError('');
                        }}
                        placeholder="••••"
                        className="w-full bg-black/50 border border-zinc-800 focus:border-cyan-500/50 rounded-2xl px-4 py-3 text-center text-white tracking-[0.5em] font-mono text-lg outline-none transition-colors"
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}

                {wizardStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white">Sovereign Vault Key Generation</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Your zero-knowledge Vault Key has been generated in-browser. Only **you** in the entire world will possess this key. It is strictly required alongside your PIN to unlock your vault in the future.
                      </p>
                    </div>
                    
                    <div className="bg-zinc-950/70 p-5 rounded-2xl border border-zinc-800/80 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.05)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-2xl rounded-full pointer-events-none" />
                      
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-500 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-cyan-400" />
                          Vault Private Key
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 text-[9px] font-mono border border-cyan-500/25">
                            Client-Side Generated
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              let success = false;
                              if (navigator.clipboard && window.isSecureContext) {
                                navigator.clipboard.writeText(newRoomKey).then(() => {
                                  setWizardKeyCopied(true);
                                  setTimeout(() => setWizardKeyCopied(false), 2000);
                                }).catch((err) => {
                                  console.error("Clipboard API failed:", err);
                                  try {
                                    const ta = document.createElement('textarea');
                                    ta.value = newRoomKey;
                                    ta.style.position = 'fixed';
                                    ta.style.opacity = '0';
                                    document.body.appendChild(ta);
                                    ta.select();
                                    success = document.execCommand('copy');
                                    document.body.removeChild(ta);
                                    if (success) {
                                      setWizardKeyCopied(true);
                                      setTimeout(() => setWizardKeyCopied(false), 2000);
                                    } else {
                                      alert("Copy failed. Please select the text and copy manually.");
                                    }
                                  } catch (e) {
                                    alert("Copy failed. Please select the text and copy manually.");
                                  }
                                });
                              } else {
                                try {
                                  const ta = document.createElement('textarea');
                                  ta.value = newRoomKey;
                                  ta.style.position = 'fixed';
                                  ta.style.opacity = '0';
                                  document.body.appendChild(ta);
                                  ta.select();
                                  success = document.execCommand('copy');
                                  document.body.removeChild(ta);
                                  if (success) {
                                    setWizardKeyCopied(true);
                                    setTimeout(() => setWizardKeyCopied(false), 2000);
                                  } else {
                                    alert("Copy failed. Please select the text and copy manually.");
                                  }
                                } catch (e) {
                                  alert("Copy failed. Please select the text and copy manually.");
                                }
                              }
                            }}
                            className={`p-1 px-2.5 border rounded-xl text-[10px] font-mono flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 duration-200 ${
                              wizardKeyCopied
                                ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'
                                : 'bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 border-zinc-800 text-zinc-300 hover:text-white'
                            }`}
                          >
                            {wizardKeyCopied ? (
                              <><Check className="w-3.5 h-3.5" /> Copied!</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Copy Key</>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/10 font-mono text-sm text-cyan-400 select-all font-bold break-all leading-relaxed tracking-wider text-center shadow-inner">
                        {newRoomKey}
                      </div>

                      <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-0.5">
                          <h4 className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Crucial Security Alert</h4>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">
                            This key is **never** sent to our database. Without it, your locked chamber cannot be decrypted. Store this key in a physical safe notebook or a secure password manager immediately.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {wizardStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white">Safety Switch Setup</h3>
                      <p className="text-xs text-zinc-400">
                        Choose the emergency trigger strategy that fires if you choose not to log in for more than 30 consecutive days.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      {/* Shred and Purge */}
                      <button
                        type="button"
                        onClick={() => setNewRoomStrategy('purge')}
                        className={`text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-0 ${newRoomStrategy === 'purge' ? 'bg-red-500/5 border-red-500 ring-2 ring-red-500/20' : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-semibold text-white">Emergency Shred</span>
                          </div>
                          {/* Dot Selector */}
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${newRoomStrategy === 'purge' ? 'border-red-500 bg-red-500' : 'border-zinc-700'}`}>
                            {newRoomStrategy === 'purge' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          Permanently wipe data metadata from local memory and delete folders upon trigger timeout.
                        </p>
                      </button>

                      {/* Email Handoff */}
                      <button
                        type="button"
                        onClick={() => setNewRoomStrategy('migration')}
                        className={`text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-0 ${newRoomStrategy === 'migration' ? 'bg-emerald-500/5 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-semibold text-white">Email Handoff</span>
                          </div>
                          {/* Dot Selector */}
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${newRoomStrategy === 'migration' ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700'}`}>
                            {newRoomStrategy === 'migration' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          Securely email a Vault Key to a designated receiver today, and send the unlock link upon timeout.
                        </p>
                      </button>
                    </div>

                    {newRoomStrategy === 'migration' && (
                      <div className="space-y-3 pt-1">
                        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold block">Backup Receiver Email</label>
                        <input
                          type="email"
                          value={newRoomTransferEmail}
                          onChange={(e) => setNewRoomTransferEmail(e.target.value)}
                          placeholder="receiver@example.com"
                          className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 transition-all outline-none"
                        />
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          We will instantly send an email containing the Vault Key to this address so they can keep it safe. The server will not store this key. When the timeout expires, we will send them a second email with the link to unlock the vault.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Wizard Nav strip */}
              <div className="flex gap-3 pt-4 border-t border-zinc-900">
                {wizardStep > 1 ? (
                  <button
                    onClick={() => {
                      setWizardError('');
                      setWizardStep(prev => prev - 1);
                    }}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium border border-zinc-800 transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateWizard(false)}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-medium border border-zinc-800 transition-colors"
                  >
                    Rescind Creation
                  </button>
                )}

                {wizardStep < 4 ? (
                  <button
                    onClick={() => {
                      if (wizardStep === 1 && !newRoomName.trim()) {
                        setWizardError('Please give your Room identification label.');
                        return;
                      }
                      if (wizardStep === 2 && newRoomPin.length < 4) {
                        setWizardError('PIN authentication passkey must be at least 4 digits.');
                        return;
                      }
                      setWizardError('');
                      setWizardStep(prev => prev + 1);
                    }}
                    className="flex-1 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-all font-sans text-center flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Proceed Forward</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    disabled={isCreatingRoom}
                    onClick={handleCreateRoomWizardComplete}
                    className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition-all font-sans text-center flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-cyan-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingRoom ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isCreatingRoom ? "Initializing..." : "Initialize and Launch Room"}</span>
                  </button>
                )}
              </div>
            </div>
          ) : selectedRoomToUnlock ? (
            
            /* PIN & KEY ENTRY LOCK SCREEN (Unlock selected chamber) */
            <div className="max-w-md mx-auto my-12 bg-zinc-950/70 border border-zinc-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[70px] pointer-events-none" />
              <div className="text-center space-y-6">
                <div className="relative w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto border border-zinc-800 shadow-md">
                  <Key className="w-6 h-6 text-cyan-400" />
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase text-cyan-400 font-black tracking-widest border border-cyan-500/20 px-3 py-1 rounded-full bg-cyan-500/10">
                    🔐 Access Gate
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-white font-sans mt-2">
                    Unlock <span className="font-serif italic font-light text-zinc-500">{selectedRoomToUnlock.name}</span>
                  </h2>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed font-sans">
                    Sovereign Vault is only accessible via its unique browser Vault Key, and unlocked locally by providing its PIN protection.
                  </p>
                </div>

                <form onSubmit={handleUnlockRoom} className="space-y-4 text-left">
                  {/* Security PIN Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-extrabold block pl-1">
                      Security PIN Passcode
                    </label>
                    <input
                      type="password"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={enteredPasskey}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setEnteredPasskey(val);
                        setPasskeyError('');
                      }}
                      placeholder="••••"
                      className="w-full bg-black/50 border border-zinc-800 focus:border-cyan-500/55 rounded-2xl px-5 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none placeholder:text-zinc-800 text-white transition-all font-semibold"
                      autoFocus
                    />
                  </div>

                  {/* Vault Private Key Input */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-extrabold block pl-1">
                      Vault Private Key
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">
                        <Key className="w-4 h-4" />
                      </span>
                      <input
                        type={showVaultKey ? 'text' : 'password'}
                        value={enteredVaultKey}
                        onChange={(e) => {
                          setEnteredVaultKey(e.target.value);
                          setPasskeyError('');
                        }}
                        placeholder="keeper-key-xxxxxxxxxxxxxxxx"
                        className="w-full bg-black/50 border border-zinc-800 focus:border-cyan-500/55 rounded-2xl py-3 pl-11 pr-12 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 font-mono transition-all animate-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowVaultKey(!showVaultKey)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer text-xs font-semibold"
                      >
                        {showVaultKey ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  {passkeyError && (
                    <p className="text-red-400 font-medium text-xs text-center mt-2">
                      ⚠️ {passkeyError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomToUnlock(null);
                        setEnteredPasskey('');
                        setEnteredVaultKey('');
                        setPasskeyError('');
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold py-3 rounded-2xl transition-all text-xs uppercase tracking-widest cursor-pointer text-center"
                    >
                      Rescind
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] text-xs uppercase tracking-widest cursor-pointer text-center"
                    >
                      Verify & Decrypt
                    </button>
                  </div>
                </form>

                <div className="text-[10px] text-zinc-500 pt-4 border-t border-white/5 font-mono flex items-center justify-center gap-1.5 text-center">
                  <span className="text-zinc-500">🔒 Only the user holds the unique Vault Key for this room.</span>
                </div>
              </div>
            </div>
          ) : (
            
            /* ROOM MANAGEMENT DASHBOARD LIST */
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white tracking-tighter">Active Vaults</h2>
                  <p className="text-sm text-zinc-500 font-light font-sans">Select any configured cipher box below to trigger memory decipher nodes.</p>
                </div>
                
                <span className="text-[10px] uppercase text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/15 font-black tracking-widest">
                  {rooms.length} Configured Locked Chamber{rooms.length > 1 ? 's' : ''}
                </span>
              </div>

              {rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 bg-zinc-950/50 border border-zinc-900 rounded-[2.5rem] h-80 space-y-5">
                  <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
                    <FolderLock className="w-8 h-8 text-zinc-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white">No Active Encryption Rooms Detected</h3>
                    <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                      All descriptors were either shredded or none have been established locally on this browser terminal. Create one to begin.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNewRoomName('');
                      setNewRoomPin('');
                      setNewRoomKey('');
                      setNewRoomStrategy('purge');
                      setWizardStep(1);
                      setWizardError('');
                      setShowCreateWizard(true);
                    }}
                    className="flex items-center gap-1.5 bg-white hover:bg-zinc-200 text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First Room</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rooms.map((room) => {
                    const isHashMatched = matchedUrlRoomId === room.id;
                    const isNameEditing = editingRoomId === room.id;
                    return (
                      <div
                        key={room.id}
                        className={`group bg-zinc-900/40 border rounded-[2rem] p-6 transition-all duration-300 flex flex-col justify-between space-y-5 relative cursor-pointer active:scale-[0.98] select-none ${
                          isHashMatched 
                            ? 'border-cyan-500/50 ring-2 ring-cyan-500/10 shadow-lg bg-zinc-900/80' 
                            : 'border-zinc-800 hover:border-cyan-500/30 shadow-md hover:-translate-y-0.5 hover:bg-zinc-900/60'
                        }`}
                        onClick={() => setSelectedRoomToUnlock(room)}
                      >
                        <div className="space-y-3.5">
                          <div className="space-y-1.5">
                            {isNameEditing ? (
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editRoomNameInput}
                                  onChange={(e) => setEditRoomNameInput(e.target.value)}
                                  className="bg-black/40 border border-cyan-500/40 outline-none rounded-xl px-2.5 py-1 text-xs text-white"
                                  autoFocus
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRoomRename(room.id)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRoomRename(room.id)}
                                  className="p-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/25 rounded-xl border border-cyan-500/20 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <h3 className="text-white text-sm md:text-md font-semibold tracking-tight transition-colors flex items-center justify-between gap-2 w-full">
                                <span className="truncate flex-1 text-left">{room.name}</span>
                                <span className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRenameRoom(room);
                                    }}
                                    className="p-1.5 bg-black/30 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white cursor-pointer border border-white/5 transition-all active:scale-95 flex items-center justify-center"
                                    title="Edit Room Name"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePurgeRoom(room.id);
                                    }}
                                    className="p-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg text-red-400 cursor-pointer transition-all active:scale-95 flex items-center justify-center shadow-lg"
                                    title="Dismantle Entire Room"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              </h3>
                            )}
                            
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[10px] font-mono text-zinc-400 font-sans">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${room.safetyStrategy === 'purge' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'}`}>
                            {room.safetyStrategy === 'purge' ? 'Auto-Shred' : 'Drive Delegate'}
                          </span>
                          <span>{room.files.length} Saved Buffers</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : activeRoomStrategy === 'handoff_unlocked' ? (
          /* EMERGENCY DATA HANDOFF PANEL (LOCKED) */
          <div className="max-w-2xl mx-auto my-6 bg-zinc-950/80 border border-red-500/30 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-red-500/5 blur-[100px] pointer-events-none" />
            
            <div className="text-center space-y-8 animate-fade-in">
              <div className="relative w-20 h-20 bg-red-950/30 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse">
                <ShieldAlert className="w-10 h-10 text-red-400" />
              </div>
              
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/25">
                  ⚠️ Emergency Vault Unlock
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
                  Migrate Data from <span className="font-serif italic font-light text-red-400">{roomName}</span>
                </h2>
                <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed font-sans">
                  This secure room has timed out due to inactivity and is scheduled for **permanent destruction** in less than 3 days. To safeguard your zero-knowledge data, all standard operations (uploading, renaming, deleting) have been permanently locked.
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto font-mono">
                  You are permitted to perform a single **Emergency Decrypt & Download** of your files.
                </p>
              </div>

              {/* Status parameters card */}
              <div className="bg-zinc-900/60 p-5 rounded-2xl border border-white/5 space-y-3 max-w-md mx-auto text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase tracking-widest font-black text-[9px]">Status</span>
                  <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    Locked for Handoff
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase tracking-widest font-black text-[9px]">Time Limit Remaining</span>
                  <span className="text-zinc-300 font-mono font-bold">Within 72 Hours</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500 uppercase tracking-widest font-black text-[9px]">Encrypted Payload Size</span>
                  <span className="text-cyan-400 font-bold">{files.length} Secure Buffers</span>
                </div>
              </div>

              {/* Warning strip */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl max-w-md mx-auto flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Irreversible Action Warning</h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Once the ZIP compilation completes and downloads to your device, this room and all associated cloud buffers on Keeper servers will be **instantly and permanently destroyed**. This action is completely irreversible.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2 max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={handleExitRoom}
                  className="w-full sm:flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-xs uppercase font-black tracking-widest border border-zinc-800 transition-all cursor-pointer"
                >
                  Exit Chamber
                </button>
                <button
                  type="button"
                  onClick={triggerNow}
                  disabled={isTriggeringNow}
                  className="w-full sm:flex-[2] py-3.5 bg-red-500 hover:bg-red-400 disabled:bg-red-500/50 text-white rounded-2xl text-xs uppercase font-black tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
                >
                  {isTriggeringNow ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Compiling ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download ZIP & Destroy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FILE EXPLORER MAIN MODULE (Active Selected chamber is unlocked) */
          <div className="bg-zinc-950/50 border border-zinc-900 rounded-[2.5rem] p-5 md:p-6 shadow-2xl space-y-6">
            
            {/* EXPLORER ACTIONS STRIP */}
            <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
              
              {/* Elegant Search Container */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-600">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-5 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/60 placeholder:text-zinc-700 transition-all font-sans"
                  placeholder="Filter decrypted safe items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* View mode toggle with responsive sizing */}
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                
                {/* Visual View-Mode Selection buttons */}
                <div className="flex items-center bg-black/40 border border-zinc-800 rounded-2xl p-1 gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    title="Grid layout"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    title="Detailed list layout"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* S3 Store Upload Trigger */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.12)]"
                >
                  <FolderUp className="w-3.5 h-3.5" />
                  Upload Secure Buffer
                </button>
              </div>
            </div>

            {/* PROGRESS BAR FOR ACTIVE LOCAL STORAGE SIMULATION */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-black/40 p-4 rounded-2xl border border-zinc-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span className="text-xs font-mono font-medium text-cyan-400">Performing Clientside Cryptographical Packaging...</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">{uploadProgress}% Packaged</span>
                  </div>
                  <div className="w-full bg-black rounded-full h-1 overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rearrange Tip */}
            {viewMode === 'grid' && filteredFiles.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/5 border border-cyan-500/15 rounded-full text-[11px] text-cyan-400 font-mono w-fit shadow-inner select-none font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>💡 Tip: Drag and drop files in grid view to manually rearrange their storage order.</span>
              </div>
            )}

            {/* SECURED FILE VIEWER CASES */}
            {filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 h-80 space-y-3">
                <Folder className="w-10 h-10 text-zinc-700" />
                <p className="text-sm font-sans italic">No safe items match this search filter.</p>
              </div>
            ) : viewMode === 'grid' ? (
              
              /* PREMIER GRID DISPLAY */
              <div id="macos-grid" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5 bg-black/30 border border-zinc-900 p-4 md:p-6 rounded-[2rem] backdrop-blur-md shadow-inner">
                {filteredFiles.map((fileItem) => {
                  return (
                    <div
                      key={fileItem.id}
                      id={`file-${fileItem.id}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, fileItem.id)}
                      onDragOver={(e) => handleDragOver(e, fileItem.id)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, fileItem.id)}
                      onClick={(e) => {
                        if (cancelNextClick.current) {
                          e.stopPropagation();
                          return;
                        }
                        handleDownloadFile(fileItem);
                      }}
                      className={`flex flex-col items-center p-5 md:p-6 rounded-[1.75rem] transition-all duration-300 cursor-grab active:cursor-grabbing group relative border select-none ${
                        draggedFileId === fileItem.id 
                          ? 'opacity-30 border-white/5 scale-[0.97]' 
                          : dragOverFileId === fileItem.id
                            ? 'border-cyan-500/80 ring-2 ring-cyan-500/20 scale-[1.03] bg-zinc-900/80'
                            : 'bg-zinc-900/45 hover:bg-zinc-900/80 border-zinc-800 hover:border-cyan-500/25 shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {renderFileActionsMenu(fileItem, 'grid')}

                      {/* File Icon */}
                      <div className="mb-2 group-hover:scale-105 transition-transform duration-200 pointer-events-none select-none">
                        {getFileIcon(fileItem.type)}
                      </div>

                      {/* File Name */}
                      <span className="text-sm font-semibold text-zinc-100 truncate w-full text-center group-hover:text-cyan-400 transition-colors pointer-events-none select-none font-sans" title={fileItem.name}>
                        {fileItem.name}
                      </span>

                      {/* Size */}
                      <div className="mt-1 text-[9px] text-cyan-400 font-mono font-medium bg-cyan-500/10 px-1.5 py-0.5 rounded-full border border-cyan-500/15 pointer-events-none select-none">
                        {fileItem.size}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              
              /* PREMIER DETAILED LIST DISPLAY */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300 font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-600 font-bold">
                      <th className="py-3 px-4">Workspace Resource</th>
                      <th className="py-3 px-4 flex-1">Size</th>
                      <th className="py-3 px-4">Secure Cryptogard</th>
                      <th className="py-3 px-4">Date Committed</th>
                      <th className="py-3 px-4 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((fileItem) => (
                      <tr
                        key={fileItem.id}
                        className="group border-b border-white/5 hover:bg-zinc-900/50 text-zinc-300 transition-colors cursor-pointer"
                        onClick={() => handleDownloadFile(fileItem)}
                      >
                        <td className="py-3.5 px-4 flex items-center gap-3 max-w-sm">
                          <div className="shrink-0 p-1.5 bg-zinc-900 rounded-lg border border-white/5">
                            {getFileIcon(fileItem.type)}
                          </div>
                          <span className="font-semibold text-zinc-100 hover:text-cyan-400 transition-colors truncate block" title={fileItem.name}>
                            {fileItem.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">{fileItem.size}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 text-[10px] font-mono">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            AES-256-GCM
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 font-mono">{fileItem.date}</td>
                        <td className="py-3.5 px-4 text-right">
                          {renderFileActionsMenu(fileItem, 'list')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PRISTINE CONFIGURATION MODAL (Dead Man switch setup) */}
        {createPortal(
          <AnimatePresence>
            {showSettings && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 md:py-8 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 my-auto max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-md font-bold text-white tracking-tight">
                        Configure Automation switch
                      </h2>
                      <p className="text-xs text-zinc-400">Zero-Knowledge inactivity trigger thresholds & automated safety handlers</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  
                  {/* Activity parameter check card */}
                  <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
                    <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-500 block">Pulse Activity Auditor</span>
                    <span className="text-white font-mono text-xs mt-1 block">{lastActiveAt}</span>
                    <span className="text-[10px] text-zinc-400 leading-relaxed block mt-1.5">
                      Your presence update gets automatically updated on secure browser logons, actions, or file interactions.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Limit threshold select card */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 block">Inactivity Limit</label>
                      <div className="relative">
                        <select
                           value={inactivityDays}
                           onChange={(e) => setInactivityDays(Number(e.target.value))}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-10 py-3 text-xs text-zinc-200 focus:border-cyan-500/50 outline-none transition-colors appearance-none cursor-pointer"
                        >
                          <option value={0}>⚡ 1 Min — Test Mode</option>
                          <option value={15}>15 Days Inactive</option>
                          <option value={30}>30 Days Inactive</option>
                          <option value={60}>60 Days Inactive</option>
                          <option value={90}>90 Days Inactive</option>
                          <option value={180}>180 Days Inactive</option>
                        </select>
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Backup Receiver Email Configuration Card */}
                    {safeTransferEnabled && (
                      <div className="space-y-3 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                        <label className="text-[9px] uppercase font-mono tracking-wider font-bold text-zinc-500 block">Backup Receiver Email</label>
                        <input
                          type="email"
                          value={transferEmail}
                          onChange={(e) => setTransferEmail(e.target.value)}
                          placeholder="receiver@example.com"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-800 outline-none transition-colors"
                        />
                        <p className="text-[10px] text-zinc-500 leading-relaxed block mt-1">
                          When the inactivity timeout is reached, an emergency warning email containing the secure vault unlock handoff link will be delivered to this address so they can download the ZIP backup.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Options container without nested scrolls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    
                    {/* Shred Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setAutoDestructEnabled(true);
                        setSafeTransferEnabled(false);
                      }}
                      className={`text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-0 ${autoDestructEnabled ? "bg-red-500/5 border-red-500 ring-2 ring-red-500/20" : "bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-semibold text-white">Shred and Purge</span>
                        </div>
                        {/* Dot Selector */}
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${autoDestructEnabled ? 'border-red-500 bg-red-500' : 'border-zinc-700'}`}>
                          {autoDestructEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                        Irreversibly delete files from active secure cloud buffers the moment the inactivity duration triggers.
                      </p>
                    </button>

                    {/* Transfer Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSafeTransferEnabled(true);
                        setAutoDestructEnabled(false);
                      }}
                      className={`text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-0 ${safeTransferEnabled ? "bg-emerald-500/5 border-emerald-500 ring-2 ring-emerald-500/20" : "bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-semibold text-white">Emergency Handoff</span>
                        </div>
                        {/* Dot Selector */}
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${safeTransferEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700'}`}>
                          {safeTransferEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                        Email a secure handoff link to download all vault files as a ZIP archive upon inactivity trigger.
                      </p>
                    </button>
                    
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-zinc-900">
                    <button
                      type="button"
                      disabled={isSavingSettings}
                      onClick={() => setShowSettings(false)}
                      className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Rescind
                    </button>
                    <button
                      type="button"
                      disabled={isSavingSettings}
                      onClick={saveSettings}
                      className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSavingSettings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Locking...
                        </>
                      ) : (
                        'Commit Switch parameters'
                      )}
                    </button>
                  </div>

                  {/* Trigger Now — immediate lifecycle execution */}
                  <div className="pt-2">
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider font-bold">Manual Trigger</p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                        {autoDestructEnabled
                          ? 'Immediately purge all files and delete this room from Keeper. A notification email will be sent.'
                          : 'Immediately decrypt and download all files as a single ZIP archive, then delete this room from Keeper. A notification email will be sent.'}
                      </p>
                      <button
                        type="button"
                        onClick={triggerNow}
                        disabled={isTriggeringNow}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          autoDestructEnabled
                            ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isTriggeringNow ? (
                          <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executing…</>
                        ) : autoDestructEnabled ? (
                          <><Trash2 className="w-3.5 h-3.5" /> Trigger Purge Now</>
                        ) : (
                          <><Download className="w-3.5 h-3.5" /> Decrypt & Download ZIP Now</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

        {/* RE-USABLE MODAL: METADATA ASSET RENAME */}
        {createPortal(
          <AnimatePresence>
            {isRenameOpen && selectedFile && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 md:py-8">
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 my-auto"
              >
                <h3 className="text-base font-bold text-white mb-1.5 font-sans">Update Storage identifier</h3>
                <p className="text-xs text-zinc-500 mb-4 font-sans leading-normal">
                  Provide custom name for storage buffer asset. This change takes place immediately in browser memory and local records.
                </p>
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-cyan-500/50 outline-none mb-5 font-sans"
                  autoFocus
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setIsRenameOpen(false)}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold font-sans border border-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRename}
                    className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-semibold font-sans transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

        {/* RE-USABLE MODAL: CONFIRM SHRED / METADATA PURGE */}
        {createPortal(
          <AnimatePresence>
            {isDeleteConfirmOpen && selectedFile && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 md:py-8">
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="w-full max-w-md bg-zinc-950 border border-red-500/20 rounded-2xl p-6 my-auto"
              >
                <div className="flex items-center gap-3 mb-3 text-red-400">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Purge Safe Asset?</h3>
                    <p className="text-[9px] uppercase font-mono tracking-wider text-red-400">Irreversible Storage Shred</p>
                  </div>
                </div>
                
                <p className="text-xs text-zinc-400 mb-5 font-sans leading-relaxed">
                  You are about to delete <span className="text-red-400 font-mono font-medium">[{selectedFile.name}]</span>. This is an irreversible operation; decrypted assets will be permanently unmounted.
                </p>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold font-sans transition-colors cursor-pointer"
                  >
                    Rescind Trigger
                  </button>
                  <button
                    onClick={handleDeleteAsset}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-semibold font-sans transition-colors cursor-pointer"
                  >
                    Confirm Deletion
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

        {/* ROOM DELETION CONFIRMATION WITH PIN VERIFICATION */}
        {createPortal(
          <AnimatePresence>
            {roomToPurge && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 md:py-8">
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                className="w-full max-w-md bg-zinc-950 border border-red-500/35 rounded-2xl p-6 shadow-2xl my-auto"
              >
                <div className="flex items-center gap-3 mb-4 text-red-400">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-white font-sans">Dismantle sovereign vault?</h3>
                    <p className="text-xs text-zinc-400 font-sans">Permanently purge room: {roomToPurge.name}</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed mb-5 font-sans bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-left">
                  🚨 <strong className="text-red-400 font-semibold">CRITICAL SAFETY WARNING:</strong> This action cannot be undone. All decrypted sessions will be terminated and local encryption keys destroyed.
                </p>

                <div className="space-y-4 mb-6 text-left">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5 font-bold">
                      Enter Vault PIN to Authorize Deletion
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="Enter security PIN"
                      value={deleteRoomPinInput}
                      onChange={(e) => {
                        setDeleteRoomPinInput(e.target.value.replace(/\D/g, ''));
                        setDeleteRoomPinError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleConfirmPurgeRoom();
                        }
                      }}
                      className="w-full bg-[#131117] border border-zinc-800 hover:border-zinc-700/80 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-[0.2em] focus:border-red-500 outline-none placeholder:text-zinc-650 text-white transition-all font-semibold"
                      autoFocus
                    />
                    {deleteRoomPinError && (
                      <p className="text-[10px] text-red-400 font-mono mt-1.5 flex items-center gap-1">
                        ⚠️ {deleteRoomPinError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setRoomToPurge(null);
                      setDeleteRoomPinInput('');
                      setDeleteRoomPinError('');
                    }}
                    className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold font-sans transition-colors cursor-pointer"
                  >
                    Cancel Action
                  </button>
                  <button
                    onClick={handleConfirmPurgeRoom}
                    disabled={!deleteRoomPinInput}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-600 text-white rounded-xl text-xs font-semibold font-sans transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-sans uppercase font-bold tracking-wider"
                  >
                    Shred Vault
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      </div>
    </div>
  );
}


