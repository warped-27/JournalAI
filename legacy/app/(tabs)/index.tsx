import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Pressable, 
  TextInput, 
  useColorScheme, 
  Dimensions, 
  Platform, 
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '../../constants/Colors';
import { SecureStorage, CloudConfig } from '../../constants/SecureStorage';
import { CryptoEngine } from '../../constants/CryptoEngine';
import { AIEngine } from '../../constants/AIEngine';
import { NerdLogo } from '../../components/NerdLogo';

export interface Attachment {
  id: string;
  type: 'link';
  uri: string;
  title?: string;
}

interface NoteItem {
  id: string;
  title: string;
  excerpt: string;
  content: string; // Testo completo originale
  date: string;
  tags: string[];
  pastelAccent: {
    light: string;
    dark: string;
  };
  isAnalyzing?: boolean;
  syncStatus: 'none' | 'syncing' | 'synced' | 'local_only';
  isFavorite?: boolean;
  attachments?: Attachment[];
  attachmentsCipher?: string;
  attachmentsIv?: string;
}

// Note simulate memorizzate nello storage cifrato fittizio dell'utente.
const INITIAL_NOTES: NoteItem[] = [
  {
    id: '1',
    title: 'LOG-001: Architettura BYO-Cloud',
    excerpt: 'Analisi strutturale sul paradigma Bring Your Own Cloud...',
    content: 'Analisi strutturale sul paradigma Bring Your Own Cloud. L\'assenza di endpoint proprietari neutralizza vettori di attacco centralizzati e garantisce il controllo assoluto delle chiavi. I payload vengono cifrati in locale tramite AES-CTR (256-bit) e caricati sul bucket privato dell\'utente.',
    date: 'Oggi, 08:30',
    tags: ['Core', 'Security'],
    pastelAccent: {
      light: '#1A1A1A',
      dark: '#1A1A1A',
    },
    syncStatus: 'synced',
    isFavorite: true,
  },
  {
    id: '2',
    title: 'LOG-002: Trascrizione Spettrale',
    excerpt: 'Analisi delle acquisizioni vocali e decodifica locale...',
    content: 'Analisi delle acquisizioni vocali e decodifica locale. Log dei test su Nerd Journal: crittografia client-side AES-GCM e derivazione con PBKDF2 per garantire la massima riservatezza delle registrazioni.',
    date: 'Ieri, 18:15',
    tags: ['Audio', 'AI-RAG'],
    pastelAccent: {
      light: '#1A1A1A',
      dark: '#1A1A1A',
    },
    syncStatus: 'synced',
    isFavorite: false,
  },
  {
    id: '3',
    title: 'LOG-003: Benchmarking Gemini LLM',
    excerpt: 'Elaborazione del RAG locale con LLM in cloud...',
    content: 'Valutazione latenza delle pipeline RAG local-to-cloud tramite modello predefinito gemini-3.1-flash-lite. Generazione automatica di indici semantici, metadati di sistema e tag relazionali senza leak dei dati in chiaro.',
    date: '28 Mag',
    tags: ['Gemini', 'LLM'],
    pastelAccent: {
      light: '#1A1A1A',
      dark: '#1A1A1A',
    },
    syncStatus: 'synced',
    isFavorite: true,
  },
  {
    id: '4',
    title: 'LOG-004: Protocollo Sync WebDAV',
    excerpt: 'Sincronizzazione di log cifrati su endpoint WebDAV...',
    content: 'Sincronizzazione incrementale dei file JSON cifrati. Algoritmo di risoluzione dei conflitti basato su timestamp locali e verifica della firma digitale per evitare perdite di dati in modalità Last Write Wins.',
    date: '24 Mag',
    tags: ['Sync', 'WebDAV'],
    pastelAccent: {
      light: '#1A1A1A',
      dark: '#1A1A1A',
    },
    syncStatus: 'synced',
    isFavorite: false,
  }
];

// Filtro 'Cifrati' rimosso in quanto ridondante (tutto è cifrato)
const FILTER_TABS = ['Tutti', 'Secondo Cervello', 'Preferiti'];

export default function DashboardScreen() {
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';
  const currentTheme = isDark ? Palette.dark : Palette.light;
  
  const [selectedFilter, setSelectedFilter] = useState('Tutti');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stato lista note e configurazione cloud
  const [rawNotes, setRawNotes] = useState<NoteItem[]>(INITIAL_NOTES);
  const [processedNotes, setProcessedNotes] = useState<NoteItem[]>([]);
  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(null);

  // Stati crittografici
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [derivedKey, setDerivedKey] = useState<Uint8Array | null>(null);

  // Stati per la creazione nuova nota
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micFeedback, setMicFeedback] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<any>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [ragResponse, setRagResponse] = useState<string | null>(null);
  const [isRAGLoading, setIsRAGLoading] = useState(false);
  const [ragQuery, setRagQuery] = useState('');

  // Stati per la visualizzazione/modifica nota esistente
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');

  // Stati allegati per nuova nota
  const [newNoteAttachments, setNewNoteAttachments] = useState<Attachment[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Stati allegati per nota in modifica
  const [editNoteAttachments, setEditNoteAttachments] = useState<Attachment[]>([]);
  const [editLinkTitle, setEditLinkTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');

  // Stati caricamento autogenerazione titoli
  const [isNewTitleLoading, setIsNewTitleLoading] = useState(false);
  const [isEditTitleLoading, setIsEditTitleLoading] = useState(false);

  // Google Drive Boot Flow States
  const [isCloudBooted, setIsCloudBooted] = useState(false);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [drivePassword, setDrivePassword] = useState('');
  const [driveUnlockState, setDriveUnlockState] = useState<'idle' | 'request_unlock' | 'create_password'>('idle');
  const [encryptedCloudNotes, setEncryptedCloudNotes] = useState<any>(null);
  const [driveUnlockError, setDriveUnlockError] = useState<string | null>(null);

  const isGoogleAuthenticated = !!(cloudConfig?.provider === 'google_drive' && cloudConfig?.accessToken);

  useEffect(() => {
    if (isGoogleAuthenticated) {
      setIsCloudBooted(false);
    } else {
      setIsCloudBooted(true);
    }
  }, [isGoogleAuthenticated]);

  useEffect(() => {
    console.log("[BOOT CLOUD] Controllo requisiti: ", { Auth: isGoogleAuthenticated, Token: !!cloudConfig?.accessToken, Booted: isCloudBooted });
    
    if (!isGoogleAuthenticated || !cloudConfig?.accessToken || isCloudBooted) return;

    console.log("[BOOT CLOUD] Requisiti soddisfatti. Avvio connessione...");
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("[BOOT CLOUD] Timeout di 8 secondi superato, forzatura interruzione.");
      abortController.abort();
    }, 8000);

    async function checkDriveFile() {
      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='notes.json' and trashed=false")}`,
          {
            headers: { 'Authorization': `Bearer ${cloudConfig?.accessToken}` },
            signal: abortController.signal
          }
        );
        if (!response.ok) { throw new Error('Errore HTTP ' + response.status); }
        const data = await response.json();
        const files = data.files || [];

        if (files.length > 0) {
          const fileId = files[0].id;
          setDriveFileId(fileId);
          const fileRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
              headers: { 'Authorization': `Bearer ${cloudConfig?.accessToken}` },
              signal: abortController.signal
            }
          );
          if (!fileRes.ok) { throw new Error('Errore HTTP ' + fileRes.status); }
          const fileData = await fileRes.json();
          setEncryptedCloudNotes(fileData);
          setDriveUnlockState('request_unlock');
        } else {
          setDriveUnlockState('create_password');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('CRITICAL: Connessione a Google Drive interrotta per Timeout.');
        } else {
          console.error('CRITICAL: Errore durante il boot di Google Drive:', error);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsCloudBooted(true);
        console.log("[BOOT CLOUD] Boot concluso, isCloudBooted impostato a true.");
      }
    }
    checkDriveFile();

    return () => { clearTimeout(timeoutId); abortController.abort(); };
  }, [isGoogleAuthenticated, cloudConfig?.accessToken, isCloudBooted]);

  // Carica la Master Password all'avvio e ad ogni focus
  useEffect(() => {
    async function checkKeyAndDecrypt() {
      const pwd = await SecureStorage.getMasterPassword();
      setMasterPassword(pwd);

      if (pwd && pwd.trim() !== '') {
        try {
          const key = await CryptoEngine.deriveKey(pwd);
          setDerivedKey(key);
          setIsUnlocked(true);

           const processed = await Promise.all(
            rawNotes.map(async (note) => {
              if (note.isAnalyzing) {
                return note;
              }
              // Cifratura + Decifratura live per testare il motore
              const encryptedTitle = await CryptoEngine.encryptNote(note.title, key);
              const encryptedContent = await CryptoEngine.encryptNote(note.content, key);
              const decryptedTitle = await CryptoEngine.decryptNote(encryptedTitle.ciphertext, encryptedTitle.iv, key);
              const decryptedContent = await CryptoEngine.decryptNote(encryptedContent.ciphertext, encryptedContent.iv, key);
              
              // Decifra allegati se presenti
              let decryptedAttachments = note.attachments || [];
              if (note.attachmentsCipher && note.attachmentsIv) {
                try {
                  const decAttachmentsText = await CryptoEngine.decryptNote(note.attachmentsCipher, note.attachmentsIv, key);
                  decryptedAttachments = JSON.parse(decAttachmentsText);
                } catch (e) {
                  console.error('[CryptoEngine] Decifratura allegati fallita:', e);
                }
              }

              return {
                ...note,
                title: decryptedTitle,
                content: decryptedContent,
                attachments: decryptedAttachments,
              };
            })
          );
          setProcessedNotes(processed);
        } catch (error) {
          console.error('[CryptoEngine] Errore nella pipeline crittografica:', error);
          setIsUnlocked(false);
          setProcessedNotes(maskNotesList(rawNotes));
        }
      } else {
        setIsUnlocked(false);
        setDerivedKey(null);
        setProcessedNotes(maskNotesList(rawNotes));
      }
    }

    checkKeyAndDecrypt();
  }, [rawNotes, masterPassword]);

  // Polling per mantenere lo stato dello Storage (Password + Cloud) allineato
  useEffect(() => {
    async function updateStorageState() {
      const pwd = await SecureStorage.getMasterPassword();
      if (pwd !== masterPassword) {
        setMasterPassword(pwd);
      }
      const cloud = await SecureStorage.getCloudConfig();
      setCloudConfig(cloud);
    }
    updateStorageState();

    const interval = setInterval(updateStorageState, 1000);
    return () => clearInterval(interval);
  }, [masterPassword]);

  // Maschera i caratteri alfanumerici salvaguardando la spaziatura ed il layout geometrico
  const maskText = (text: string) => {
    return text.replace(/[a-zA-Z0-9]/g, '•');
  };

  const maskNotesList = (notes: NoteItem[]): NoteItem[] => {
    return notes.map(note => ({
      ...note,
      title: maskText(note.title),
      excerpt: maskText(note.excerpt),
      content: maskText(note.content),
    }));
  };

  // Restituisce il nome leggibile del provider
  const getCloudName = (provider?: string) => {
    if (provider === 'google_drive') return 'G-Drive';
    if (provider === 'icloud') return 'iCloud';
    if (provider === 'webdav') return 'WebDAV';
    return 'Cloud';
  };

  const uploadToDrive = async (updatedNotes?: NoteItem[]): Promise<boolean> => {
    if (!isCloudBooted) return false;
    if (!isGoogleAuthenticated || !cloudConfig || !derivedKey) return false;

    try {
      const notesToUpload = updatedNotes || rawNotes;
      const serializedNotes = JSON.stringify(notesToUpload);
      const encrypted = await CryptoEngine.encryptNote(serializedNotes, derivedKey);
      
      const payload = JSON.stringify({
        notesCipher: encrypted.ciphertext,
        notesIv: encrypted.iv,
        lastUpdated: Date.now()
      });

      // 2. Bivio POST vs PATCH
      if (driveFileId) {
        const response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${cloudConfig.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: payload
          }
        );
        if (!response.ok) throw new Error(`Patch notes.json error: ${response.status}`);
      } else {
        // 1. Gestione Cartella (eseguita solo in fase di creazione del file)
        let folderId = '';
        const folderSearchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='Nerd Journal' and trashed=false")}`,
          {
            headers: {
              'Authorization': `Bearer ${cloudConfig.accessToken}`,
            },
          }
        );
        if (!folderSearchRes.ok) throw new Error(`Search folder error: ${folderSearchRes.status}`);
        const folderSearchData = await folderSearchRes.json();
        const folders = folderSearchData.files || [];

        if (folders.length > 0) {
          folderId = folders[0].id;
        } else {
          const createFolderRes = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cloudConfig.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: 'Nerd Journal',
                mimeType: 'application/vnd.google-apps.folder',
              }),
            }
          );
          if (!createFolderRes.ok) throw new Error(`Create folder error: ${createFolderRes.status}`);
          const createFolderData = await createFolderRes.json();
          folderId = createFolderData.id;
        }

        const fileMetadata = {
          name: 'notes.json',
          mimeType: 'application/json',
          parents: [folderId],
        };
        const boundary = 'foo_bar_boundary';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(fileMetadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          payload +
          closeDelimiter;

        const response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cloudConfig.accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody,
          }
        );
        if (!response.ok) throw new Error(`Create notes.json error: ${response.status}`);
        const data = await response.json();
        if (data.id) {
          setDriveFileId(data.id);
        }
      }
      return true;
    } catch (err) {
      console.warn('[Google Drive Sync] Errore salvataggio notes.json:', err);
      return false;
    }
  };

  // Creazione della nota cifrata con trigger IA in background e Sync (Optimistic UI)
  const handleCreateNote = async () => {
    console.log('--- DEBUG STATO ---', { Auth: isGoogleAuthenticated, TokenPresente: !!cloudConfig?.accessToken, CloudBooted: isCloudBooted, OggettoConfig: cloudConfig });
    if (isGoogleAuthenticated && !isCloudBooted) { console.warn('Cloud non ancora pronto'); return; }
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      Alert.alert('Attenzione', 'Inserisci un titolo e del contenuto o un link per salvare la nota.');
      return;
    }

    const noteId = Date.now().toString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = `Oggi, ${timeStr}`;

    const newNote: NoteItem = {
      id: noteId,
      title: newNoteTitle,
      excerpt: newNoteContent.substring(0, 50) + '...', // Anteprima temporanea
      content: newNoteContent,
      date: dateStr,
      tags: [],
      pastelAccent: { light: '#f4f4f5', dark: '#27272a' },
      isAnalyzing: true,
      syncStatus: 'none',
      isFavorite: false,
      attachments: newNoteAttachments,
    };

    setIsModalVisible(false);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteAttachments([]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsRecording(false);

    // Salva immediatamente la nota locale nello stato (Optimistic UI)
    setRawNotes((prev) => {
      const next = [newNote, ...prev];
      uploadToDrive(next);
      return next;
    });

    // Esegui in background elaborazione IA + Sincronizzazione Cloud
    (async () => {
      let finalExcerpt = newNoteContent;
      let finalTags = ['Nota Locale'];
      let finalColor = { light: '#e8f5e9', dark: '#1b2e24' };

      // Passaggio 1: Generazione degli Insights IA
      try {
        const aiConfig = await SecureStorage.getAIConfig();
        const insights = await AIEngine.generateNoteInsights(newNoteContent, aiConfig);
        finalExcerpt = insights.summary;
        finalTags = insights.tags;
        finalColor = insights.color;
      } catch (err) {
        console.warn('[AIEngine] Errore in background:', err);
      }

      // Aggiorna lo stato visivo della nota rimuovendo il loading IA e impostando lo stato a 'synced'
      let nextNotesList: NoteItem[] = [];
      setRawNotes((prev) => {
        nextNotesList = prev.map((n) =>
          n.id === noteId
            ? {
                ...n,
                excerpt: finalExcerpt,
                tags: finalTags,
                pastelAccent: finalColor,
                isAnalyzing: false,
                syncStatus: 'synced' as const,
              }
            : n
        );
        return nextNotesList;
      });

      const uploadSuccess = await uploadToDrive(nextNotesList);
      if (!uploadSuccess) {
        setRawNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  syncStatus: 'local_only' as const,
                }
              : n
          )
        );
      }
    })();
  };

  // Salvataggio della nota modificata con re-trigger dell'IA in background
  const handleSaveEdit = async () => {
    console.log('--- DEBUG STATO ---', { Auth: isGoogleAuthenticated, TokenPresente: !!cloudConfig?.accessToken, CloudBooted: isCloudBooted, OggettoConfig: cloudConfig });
    if (isGoogleAuthenticated && !isCloudBooted) { console.warn('Cloud non ancora pronto'); return; }
    if (!selectedNote || !editNoteTitle.trim() || !editNoteContent.trim()) {
      Alert.alert('Attenzione', 'Inserisci un titolo e del contenuto o un link per salvare la nota.');
      return;
    }

    const noteId = selectedNote.id;
    setIsViewModalVisible(false);

    // Aggiorna lo stato localmente all'istante
    setRawNotes((prev) => {
      const next = prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              title: editNoteTitle,
              content: editNoteContent,
              attachments: editNoteAttachments,
              isAnalyzing: true,
              syncStatus: 'none' as const,
            }
          : n
      );
      uploadToDrive(next);
      return next;
    });

    // Esegui elaborazione asincrona in background
    (async () => {
      let finalExcerpt = editNoteContent;
      let finalTags = ['Nota Locale'];
      let finalColor = { light: '#e8f5e9', dark: '#1b2e24' };

      try {
        const aiConfig = await SecureStorage.getAIConfig();
        const insights = await AIEngine.generateNoteInsights(editNoteContent, aiConfig);
        finalExcerpt = insights.summary;
        finalTags = insights.tags;
        finalColor = insights.color;
      } catch (err) {
        console.warn('[AIEngine] Errore in background durante la modifica:', err);
      }

      let nextNotesList: NoteItem[] = [];
      setRawNotes((prev) => {
        nextNotesList = prev.map((n) =>
          n.id === noteId
            ? {
                ...n,
                excerpt: finalExcerpt,
                tags: finalTags,
                pastelAccent: finalColor,
                isAnalyzing: false,
                syncStatus: 'synced' as const,
              }
            : n
        );
        return nextNotesList;
      });

      const uploadSuccess = await uploadToDrive(nextNotesList);
      if (!uploadSuccess) {
        setRawNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  syncStatus: 'local_only' as const,
                }
              : n
          )
        );
      }
    })();

    setSelectedNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    console.log('--- DEBUG STATO ---', { Auth: isGoogleAuthenticated, TokenPresente: !!cloudConfig?.accessToken, CloudBooted: isCloudBooted, OggettoConfig: cloudConfig });
    if (isGoogleAuthenticated && !isCloudBooted) { console.warn('Cloud non ancora pronto'); return; }
    setRawNotes((prev) => {
      const next = prev.filter((n) => n.id !== noteId);
      uploadToDrive(next);
      return next;
    });
    setIsViewModalVisible(false);
    setSelectedNote(null);
  };

  const toggleFavorite = (noteId: string) => {
    console.log('--- DEBUG STATO ---', { Auth: isGoogleAuthenticated, TokenPresente: !!cloudConfig?.accessToken, CloudBooted: isCloudBooted, OggettoConfig: cloudConfig });
    if (isGoogleAuthenticated && !isCloudBooted) { console.warn('Cloud non ancora pronto'); return; }
    setRawNotes((prev) => {
      const next = prev.map((n) => (n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n));
      uploadToDrive(next);
      return next;
    });
    // Aggiorna anche lo stato visualizzato locale del modal
    if (selectedNote && selectedNote.id === noteId) {
      setSelectedNote(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // Avvia la registrazione audio nativa nel browser
  const startRecording = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("La registrazione audio non è supportata su questo browser o piattaforma.");
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (typeof MediaRecorder !== 'undefined') {
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          // Ferma tutte le tracce audio per rilasciare il microfono
          stream.getTracks().forEach(track => track.stop());

          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          setIsTranscribing(true);

          try {
            const aiConfig = await SecureStorage.getAIConfig();
            const text = await AIEngine.processAudio(audioBlob, aiConfig);
            setNewNoteContent((prev) => prev ? `${prev} ${text}` : text);
          } catch (err: any) {
            alert(`Errore di trascrizione: ${err.message || err}`);
          } finally {
            setIsTranscribing(false);
          }
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } else {
        alert("MediaRecorder non supportato in questo browser.");
      }
    } catch (err) {
      console.error("Errore avvio registrazione:", err);
      alert("Impossibile accedere al microfono. Verifica i permessi.");
    }
  };

  // Ferma la registrazione audio
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Gestione click del microfono con feedback pastello
  const handleMicClick = async () => {
    setMicFeedback(true);
    setTimeout(() => setMicFeedback(false), 400);

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // Estrae tutti i tag e conta quante note li possiedono
  const tagList = useMemo(() => {
    const counts: Record<string, number> = {};
    processedNotes.forEach(note => {
      if (isUnlocked && note.tags) {
        note.tags.forEach(tag => {
          if (tag && tag.trim() !== '') {
            counts[tag] = (counts[tag] || 0) + 1;
          }
        });
      }
    });
    return Object.keys(counts).map(name => ({
      name,
      count: counts[name]
    })).sort((a, b) => b.count - a.count);
  }, [processedNotes, isUnlocked]);

  // Generatore di colori deterministici per i macro-tag
  const getTagColor = (tagName: string) => {
    const colors = [
      { light: '#e8f5e9', dark: '#1b2e24' }, // Salvia
      { light: '#e3f2fd', dark: '#162b3d' }, // Azzurro
      { light: '#f3e5f5', dark: '#2d1b33' }, // Lilla
      { light: '#fff3e0', dark: '#3d2516' }, // Pesca
      { light: '#ffebee', dark: '#2d1a1a' }, // Rosa
    ];
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  const handleRAGSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsRAGLoading(true);
    setRagResponse(null);

    try {
      const aiConfig = await SecureStorage.getAIConfig();
      const notesForRAG = processedNotes.map(n => ({
        title: n.title,
        content: n.content || n.excerpt
      }));

      const reply = await AIEngine.chatWithNotes(queryText, notesForRAG, aiConfig);
      setRagResponse(reply);
    } catch (err: any) {
      console.error(err);
      setRagResponse(`Errore nell'interrogazione del Secondo Cervello: ${err.message || err}`);
    } finally {
      setIsRAGLoading(false);
    }
  };

  const handleTagClick = (tagName: string) => {
    setRagQuery(tagName);
    handleRAGSearch(tagName);
  };

  // Funzione per cancellare il testo inserito
  const handleClearSearch = () => {
    if (selectedFilter === 'Secondo Cervello') {
      setRagQuery('');
      setRagResponse(null);
      setIsRAGLoading(false);
    } else {
      setSearchQuery('');
    }
  };

  // Metodi per la gestione degli allegati (Link Esterni)
  const addLinkToNewNote = () => {
    if (!newLinkUrl.trim()) return;
    let cleanUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const newAtt: Attachment = {
      id: Date.now().toString(),
      type: 'link',
      uri: cleanUrl,
      title: newLinkTitle.trim() || undefined
    };
    setNewNoteAttachments(prev => [...prev, newAtt]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const removeLinkFromNewNote = (id: string) => {
    setNewNoteAttachments(prev => prev.filter(att => att.id !== id));
  };

  const addLinkToEditNote = () => {
    if (!editLinkUrl.trim()) return;
    let cleanUrl = editLinkUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const newAtt: Attachment = {
      id: Date.now().toString(),
      type: 'link',
      uri: cleanUrl,
      title: editLinkTitle.trim() || undefined
    };
    setEditNoteAttachments(prev => [...prev, newAtt]);
    setEditLinkTitle('');
    setEditLinkUrl('');
  };

  const removeLinkFromEditNote = (id: string) => {
    setEditNoteAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleOpenLink = (uri: string) => {
    Linking.openURL(uri).catch(err => {
      console.error('[Linking] Errore apertura URL:', err);
      alert('Impossibile aprire il link. Formato non valido.');
    });
  };

  const handleGenerateNewTitle = async () => {
    const uris = newNoteAttachments.map(att => att.uri).join(' ');
    const combinedContent = [newNoteContent.trim(), uris].filter(Boolean).join(' ');

    if (!combinedContent.trim()) return;
    setIsNewTitleLoading(true);
    try {
      const aiConfig = await SecureStorage.getAIConfig();
      const title = await AIEngine.generateTitle(combinedContent, aiConfig);
      setNewNoteTitle(title);
    } catch (err: any) {
      console.warn('[AIEngine] Errore autogenerazione titolo:', err);
      alert(`Errore: ${err.message || err}`);
    } finally {
      setIsNewTitleLoading(false);
    }
  };

  const handleGenerateEditTitle = async () => {
    const uris = editNoteAttachments.map(att => att.uri).join(' ');
    const combinedContent = [editNoteContent.trim(), uris].filter(Boolean).join(' ');

    if (!combinedContent.trim()) return;
    setIsEditTitleLoading(true);
    try {
      const aiConfig = await SecureStorage.getAIConfig();
      const title = await AIEngine.generateTitle(combinedContent, aiConfig);
      setEditNoteTitle(title);
    } catch (err: any) {
      console.warn('[AIEngine] Errore autogenerazione titolo modifica:', err);
      alert(`Errore: ${err.message || err}`);
    } finally {
      setIsEditTitleLoading(false);
    }
  };

  // Logica di Filtraggio delle Note in base al tab selezionato e alla barra di ricerca
  const filteredNotes = processedNotes.filter((note) => {
    // 1. Filtro per Tab attiva
    if (selectedFilter === 'Secondo Cervello') {
      // Mostra solo le note analizzate con successo dall'IA (che possiedono tag e non sono in corso di analisi)
      if (note.isAnalyzing || note.tags.length === 0 || note.tags.includes('Locale')) {
        return false;
      }
    } else if (selectedFilter === 'Preferiti') {
      // Mostra solo le note contrassegnate come preferite
      if (!note.isFavorite) return false;
    }

    // 2. Filtro di ricerca testuale (titolo o riassunto)
    const activeQuery = selectedFilter === 'Secondo Cervello' ? ragQuery : searchQuery;
    if (activeQuery.trim() !== '') {
      const query = activeQuery.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(query);
      const matchContent = (note.content || '').toLowerCase().includes(query);
      return matchTitle || matchContent;
    }

    return true;
  });

  const renderCard = ({ item }: { item: NoteItem }) => {
    return (
      <TouchableOpacity 
        onPress={() => {
          if (isUnlocked) {
            setSelectedNote(item);
            setEditNoteTitle(item.title);
            setEditNoteContent(item.content || item.excerpt);
            setEditNoteAttachments(item.attachments || []);
            setEditLinkTitle('');
            setEditLinkUrl('');
            setIsViewModalVisible(true);
          }
        }}
        activeOpacity={0.7}
        disabled={!isUnlocked}
        style={[
          styles.card, 
          { 
            backgroundColor: currentTheme.surface, 
            borderColor: currentTheme.border,
            borderLeftColor: '#00FF41',
            opacity: isUnlocked ? 1 : 0.75,
          }
        ]}
      >
        {/* Card Header: Stato e Data */}
        <View style={styles.cardHeader}>
          <View style={styles.cryptoBadge}>
            <Text style={{ 
              fontSize: 10, 
              color: isUnlocked ? '#00FF41' : '#ef4444', 
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              fontWeight: 'bold' 
            }}>
              {isUnlocked ? '[ OPN ]' : '[ LCK ]'}
            </Text>
            <Text style={[styles.cryptoText, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
              {isUnlocked ? (item.isAnalyzing ? 'CRITTOGRAFATO' : 'DECIFRATO') : 'AES-256'}
            </Text>
          </View>
          <Text style={[styles.cardDate, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>{item.date}</Text>
        </View>

        {/* Card Title */}
        <Text 
          style={[styles.cardTitle, { color: currentTheme.textPrimary }]} 
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Card Excerpt */}
        <Text 
          style={[styles.cardExcerpt, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]} 
          numberOfLines={4}
        >
          {item.excerpt}
        </Text>

        {/* Card Attachments */}
        {isUnlocked && item.attachments && item.attachments.length > 0 && (
          <View style={styles.cardAttachmentsRow}>
            {item.attachments.map((att) => (
              <TouchableOpacity 
                key={att.id} 
                onPress={() => handleOpenLink(att.uri)}
                activeOpacity={0.7}
                style={[styles.cardAttachmentChip, { backgroundColor: '#000000', borderColor: '#00FF41', borderWidth: 1, borderRadius: 0 }]}
              >
                <Text style={[styles.cardAttachmentChipText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]} numberOfLines={1}>
                  [ LNK ] {att.title || att.uri}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Card Footer: AI Tags & Sync Status */}
        <View style={styles.cardFooter}>
          {item.isAnalyzing ? (
            <View style={[styles.tagBadge, { borderColor: '#00FF41', borderWidth: 1, borderRadius: 0, backgroundColor: '#000000', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Text style={[styles.tagText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                [ AI ] Analisi in corso...
              </Text>
            </View>
          ) : (
            <View style={styles.footerInner}>
              {/* Riga dei Tag */}
              <View style={styles.tagsRow}>
                {item.tags.map((tag, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.tagBadge, 
                      { borderColor: '#00FF41', borderWidth: 1, borderRadius: 0, backgroundColor: '#000000' }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.tagText, 
                        { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }
                      ]}
                    >
                      {`> ${isUnlocked ? tag : maskText(tag)}`}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Riga del Cloud Sync */}
              {isUnlocked && (
                <View style={styles.syncContainer}>
                  {item.syncStatus === 'syncing' && (
                    <Text style={[styles.syncText, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                      [SYNC...]
                    </Text>
                  )}
                  {item.syncStatus === 'synced' && (
                    <Text style={[styles.syncText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                      [OK] Cloud ({getCloudName(cloudConfig?.provider)})
                    </Text>
                  )}
                  {item.syncStatus === 'local_only' && (
                    <Text style={[styles.syncText, { color: isDark ? '#a1a1aa' : '#71717a', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                      [!] Solo locale
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isGoogleAuthenticated && driveUnlockState === 'request_unlock') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]} edges={['top', 'bottom']}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.surface, borderColor: '#00FF41', borderWidth: 1, alignSelf: 'center', width: '100%', maxWidth: 400, borderRadius: 0 }]}>
          <Text style={[styles.modalTitle, { color: '#00FF41', textAlign: 'center', fontSize: 18, marginBottom: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>Ripristino Database da Google Drive</Text>
          <Text style={[styles.inputLabel, { color: currentTheme.textSecondary, marginBottom: 16, textAlign: 'center', lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
            Rilevato archivio crittografato su cloud. Fornire Master Password per decifrare i record.
          </Text>
          <TextInput
            placeholder="Inserisci Master Password..."
            placeholderTextColor="#008021"
            value={drivePassword}
            onChangeText={setDrivePassword}
            secureTextEntry
            style={[
              styles.modalInput,
              { color: '#00FF41', borderColor: '#00FF41', backgroundColor: currentTheme.background, textAlign: 'center', height: 44, marginBottom: 12, borderRadius: 0, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
            ]}
          />
          {driveUnlockError && (
            <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 12, fontWeight: 'bold', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
              {driveUnlockError}
            </Text>
          )}
          <Pressable
            onPress={async () => {
              if (!drivePassword.trim()) return;
              setDriveUnlockError(null);
              try {
                const key = await CryptoEngine.deriveKey(drivePassword);
                const ciphertext = encryptedCloudNotes.notesCipher || encryptedCloudNotes.ciphertext;
                const iv = encryptedCloudNotes.notesIv || encryptedCloudNotes.iv;
                if (!ciphertext || !iv) {
                  throw new Error('Formato backup non valido.');
                }
                const decryptedText = await CryptoEngine.decryptNote(ciphertext, iv, key);
                const decryptedNotes = JSON.parse(decryptedText);
                
                await SecureStorage.saveMasterPassword(drivePassword);
                setMasterPassword(drivePassword);
                setDerivedKey(key);
                setIsUnlocked(true);
                setRawNotes(decryptedNotes);
                setDriveUnlockState('idle');
              } catch (e) {
                console.error('[Drive Restore] Decrittografia fallita:', e);
                setDriveUnlockError('Password errata. Impossibile decifrare il backup.');
                alert('PASSWORD ERRATA\nLa password inserita non è valida per decifrare questo backup.');
              }
            }}
            style={({ pressed }) => [
              styles.saveButton,
              {
                borderColor: '#00FF41',
                backgroundColor: pressed ? '#00FF41' : '#000000',
                borderWidth: 1,
                borderRadius: 0,
                width: '100%',
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }
            ]}
          >
            {({ pressed }) => (
              <Text style={{ color: pressed ? '#000000' : '#00FF41', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                [ DECIFRA E RIPRISTINA ]
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderColor: currentTheme.border }]}>
        <View>
          <NerdLogo fontSize={20} />
          <Text style={{ 
            fontSize: 12, 
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
            color: '#00FF41', 
            fontWeight: 'bold',
            marginTop: 4 
          }}>
            [ JOURNAL ]
          </Text>
        </View>
        
        {/* Cryptographic Node Status */}
        <View style={[styles.statusNode, { borderColor: currentTheme.border, backgroundColor: currentTheme.surface }]}>
          <View style={[styles.statusDot, { backgroundColor: isUnlocked ? '#00FF41' : '#ef4444' }]} />
          <Text style={[styles.statusText, { color: currentTheme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
            {isUnlocked ? 'Chiave Derivata' : 'Zero-Knowledge'}
          </Text>
        </View>
      </View>

      {/* Warning Banner se il diario è bloccato */}
      {!isUnlocked && (
        <View style={styles.warningContainer}>
          <View style={[
            styles.warningBadge, 
            { 
              backgroundColor: '#000000', 
              borderColor: '#ef4444',
              borderRadius: 0,
              borderWidth: 1,
            }
          ]}>
            <Text style={[styles.warningText, { color: '#ef4444', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
              [ LCK ] Autenticazione richiesta. Sbloccare la sessione decifrando il database locale.
            </Text>
          </View>
        </View>
      )}

      {/* Workspace Controls: Search & Tabs */}
      <View style={styles.controlsContainer}>
        {/* Academic Style Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: '#000000', borderColor: '#00FF41', borderWidth: 1, borderRadius: 0 }]}>
          <Text style={{ 
            color: '#00FF41', 
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
            fontWeight: 'bold',
            marginRight: 6 
          }}>
            {`>_ `}
          </Text>
          <TextInput
            placeholder={isUnlocked ? (selectedFilter === 'Secondo Cervello' ? "Invia query alla Rete Neurale Gemini..." : "Filtra record per tag/chiave...") : "Dispositivo bloccato. Eseguire login..."}
            placeholderTextColor="#008021"
            value={selectedFilter === 'Secondo Cervello' ? ragQuery : searchQuery}
            onChangeText={(text) => {
              if (selectedFilter === 'Secondo Cervello') {
                setRagQuery(text);
                if (text.trim() === '') {
                  setRagResponse(null);
                  setIsRAGLoading(false);
                }
              } else {
                setSearchQuery(text);
              }
            }}
            editable={isUnlocked}
            returnKeyType={selectedFilter === 'Secondo Cervello' ? 'search' : 'default'}
            onSubmitEditing={() => {
              if (selectedFilter === 'Secondo Cervello') {
                handleRAGSearch(ragQuery);
              }
            }}
            style={[styles.searchInput, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}
          />
          {((selectedFilter === 'Secondo Cervello' ? ragQuery : searchQuery).trim().length > 0) && (
            <TouchableOpacity 
              onPress={handleClearSearch} 
              style={styles.clearSearchBtn}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>[ x ]</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Filters */}
        <View style={styles.tabFilters}>
          {FILTER_TABS.map((tab) => {
            const isActive = selectedFilter === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => isUnlocked && setSelectedFilter(tab)}
                disabled={!isUnlocked}
                style={({ pressed }) => [
                  styles.tabButton,
                  {
                    backgroundColor: pressed ? '#00FF41' : '#000000',
                    borderColor: pressed ? '#00FF41' : (isActive ? '#00FF41' : '#333333'),
                    borderWidth: 1,
                    borderRadius: 0,
                  },
                  !isUnlocked && { opacity: 0.5 }
                ]}
              >
                {({ pressed }) => (
                  <Text 
                    style={[
                      styles.tabButtonText, 
                      { 
                        color: pressed ? '#000000' : (isActive ? '#00FF41' : '#888888'),
                        fontWeight: 'bold',
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      }
                    ]}
                  >
                    {tab === 'Tutti' && '[ TUTTI ]'}
                    {tab === 'Secondo Cervello' && '[ CERVELLO ]'}
                    {tab === 'Preferiti' && '[ PREFERITI ]'}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Helper per la risposta RAG */}
      {(() => {
        const renderRAGResponseHeader = () => {
          if (!isRAGLoading && !ragResponse) return null;

          return (
            <View style={styles.ragResponseWrapper}>
              <View style={styles.ragHeaderTitleRow}>
                <Text style={styles.ragHeaderTitle}>[ RAG ] QUERY RAG ESEGUITA</Text>
                {isRAGLoading && <ActivityIndicator size="small" color="#00FF41" />}
              </View>
              
              {isRAGLoading ? (
                <Text style={styles.ragLoadingText}>Scansione indice semantico in corso...</Text>
              ) : (
                <Text style={styles.ragResponseText}>{ragResponse}</Text>
              )}
              
              {!isRAGLoading && (
                <Text style={[styles.ragContextTitle, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                  Appunti usati come contesto:
                </Text>
              )}
            </View>
          );
        };

        if (selectedFilter === 'Secondo Cervello' && !ragQuery.trim() && !isRAGLoading && !ragResponse) {
          return (
            /* Stato Inattivo: Griglia di Macro-Tag */
            <ScrollView contentContainerStyle={styles.insightsDashboardContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.insightsDashboard}>
                <Text style={[styles.insightsTitle, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                  {'> '}SECONDO_CERVELLO
                </Text>
                <Text style={[styles.insightsDesc, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                  Rete Neurale Gemini in attesa di input. Elaborazione dati attiva. Esegui query RAG locale per estrarre log incrociati o seleziona un tag di sistema.
                </Text>
                
                {tagList.length === 0 ? (
                  <View style={[styles.emptyInsights, { borderColor: '#ef4444', borderWidth: 1, backgroundColor: '#000000', borderRadius: 0 }]}>
                    <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                      Nessun tag di sistema rilevato. Analisi automatica del payload non ancora eseguita.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tagGrid}>
                    {tagList.map((tag) => {
                      return (
                        <TouchableOpacity
                          key={tag.name}
                          onPress={() => handleTagClick(tag.name)}
                          activeOpacity={0.7}
                          style={[
                            styles.tagCard,
                            {
                              backgroundColor: '#000000',
                              borderColor: '#00FF41',
                              borderWidth: 1,
                              borderRadius: 0,
                            }
                          ]}
                        >
                          <Text style={{ color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', marginBottom: 6 }}>
                            {`>_`}
                          </Text>
                          <Text style={{ color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }} numberOfLines={2}>
                            {tag.name}
                          </Text>
                          <Text style={{ color: '#888888', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10 }}>
                            {`[ ${tag.count} log ]`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          );
        }

        return (
          /* Lista Normale (Tutti / Preferiti) OPPURE RAG Chat Attiva (AI Insights con query) */
          <FlatList
            data={filteredNotes}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={selectedFilter === 'Secondo Cervello' ? renderRAGResponseHeader : undefined}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>Database locale vuoto. Nessun log rilevato per i filtri attivi.</Text>
              </View>
            }
          />
        );
      })()}

      {/* FAB: Sbloccato apre il modal di creazione nota */}
      <Pressable 
        onPress={() => isUnlocked && setIsModalVisible(true)}
        style={({ pressed }) => [
          styles.fab, 
          { 
            opacity: isUnlocked ? 1 : 0.5,
            backgroundColor: pressed ? '#00FF41' : '#1A1A1A',
            borderColor: '#00FF41',
            borderWidth: 1,
          }
        ]}
        disabled={!isUnlocked}
      >
        {({ pressed }) => (
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
            color: pressed ? '#000000' : '#00FF41' 
          }}>
            [ + ]
          </Text>
        )}
      </Pressable>

      {/* Modal di Creazione Nuova Nota (Stile NotebookLM) */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface, borderColor: '#00FF41', borderWidth: 1, borderRadius: 0 }]}>
            <Text style={[styles.modalTitle, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>Inizializza Nuovo Log</Text>
            
            <View style={styles.titleInputContainer}>
              <TextInput
                placeholder="Identificativo del log (Titolo)..."
                placeholderTextColor="#008021"
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
                style={[
                  styles.modalInput, 
                  { flex: 1, marginBottom: 0, color: '#00FF41', borderColor: '#00FF41', backgroundColor: currentTheme.background, borderRadius: 0, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                ]}
              />
              <Pressable
                onPress={handleGenerateNewTitle}
                disabled={(newNoteContent.trim() === '' && newNoteAttachments.length === 0) || isNewTitleLoading}
                style={({ pressed }) => [
                  styles.generateTitleBtn,
                  { 
                    borderColor: '#00FF41', 
                    backgroundColor: pressed ? '#00FF41' : '#000000',
                    borderWidth: 1,
                    borderRadius: 0,
                  }
                ]}
              >
                {({ pressed }) => (
                  isNewTitleLoading ? (
                    <ActivityIndicator size="small" color={pressed ? '#000000' : '#00FF41'} />
                  ) : (
                    <Text style={{ color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 11 }}>
                      [AI]
                    </Text>
                  )
                )}
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: '#00FF41', marginBottom: 6, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>Payload dati (Contenuto)</Text>

            {isTranscribing ? (
              <View style={[styles.transcribingContainer, { borderColor: '#00FF41', backgroundColor: '#000000', borderRadius: 0, borderWidth: 1 }]}>
                <Text style={{ fontSize: 14, color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', marginBottom: 8 }}>[ AI ]</Text>
                <Text style={[styles.transcribingText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                  Streaming Audio...
                </Text>
                <Text style={[styles.transcribingSubtext, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                  Analisi spettrografica e trascrizione in corso...
                </Text>
              </View>
            ) : (
              <View style={styles.micInputContainer}>
                <TextInput
                  placeholder="Inizializza payload di log. Immettere dati da cifrare..."
                  placeholderTextColor="#008021"
                  value={newNoteContent}
                  onChangeText={setNewNoteContent}
                  multiline={true}
                  numberOfLines={6}
                  style={[
                    styles.modalInput, 
                    styles.modalInputArea,
                    { flex: 1, marginBottom: 0, color: '#00FF41', borderColor: '#00FF41', backgroundColor: currentTheme.background, borderRadius: 0, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                  ]}
                />
                <Pressable 
                  onPress={handleMicClick}
                  style={({ pressed }) => [
                    styles.micSidebarBtn, 
                    { 
                      backgroundColor: pressed 
                        ? (isRecording ? '#ef4444' : '#00FF41') 
                        : '#000000',
                      borderColor: isRecording ? '#ef4444' : '#00FF41',
                      borderWidth: 1,
                      borderRadius: 0,
                    }
                  ]}
                >
                  {({ pressed }) => (
                    isRecording ? (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: pressed ? '#000000' : '#ef4444', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>[</Text>
                        <Text style={{ color: pressed ? '#000000' : '#ef4444', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>R</Text>
                        <Text style={{ color: pressed ? '#000000' : '#ef4444', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>E</Text>
                        <Text style={{ color: pressed ? '#000000' : '#ef4444', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>C</Text>
                        <Text style={{ color: pressed ? '#000000' : '#ef4444', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>]</Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>[</Text>
                        <Text style={{ color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>M</Text>
                        <Text style={{ color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>I</Text>
                        <Text style={{ color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>C</Text>
                        <Text style={{ color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 12 }}>]</Text>
                      </View>
                    )
                  )}
                </Pressable>
              </View>
            )}

            {/* Sezione Allegati Link in Creazione */}
            <View style={[styles.modalLinkSection, { borderColor: '#00FF41' }]}>
              <Text style={[styles.inputLabel, { color: '#00FF41', marginBottom: 6, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                Allegati (Link Esterni)
              </Text>
              
              {newNoteAttachments.length > 0 && (
                <View style={styles.modalAttachmentsContainer}>
                  {newNoteAttachments.map((att) => (
                    <View key={att.id} style={[styles.modalAttachmentChip, { borderColor: '#00FF41', borderWidth: 1, backgroundColor: '#000000', borderRadius: 0 }]}>
                      <Text style={[styles.modalAttachmentChipText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]} numberOfLines={1}>
                        [ LNK ] {att.title || att.uri}
                      </Text>
                      <TouchableOpacity onPress={() => removeLinkFromNewNote(att.id)} style={{ marginLeft: 6 }}>
                        <Text style={{ color: '#ef4444', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>[x]</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.addLinkFormRow}>
                <TextInput
                  placeholder="Titolo..."
                  placeholderTextColor="#008021"
                  value={newLinkTitle}
                  onChangeText={setNewLinkTitle}
                  style={[
                    styles.linkInput,
                    { flex: 1, color: '#00FF41', borderColor: '#00FF41', backgroundColor: currentTheme.background, borderRadius: 0, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                  ]}
                />
                <TextInput
                  placeholder="https://..."
                  placeholderTextColor="#008021"
                  value={newLinkUrl}
                  onChangeText={setNewLinkUrl}
                  style={[
                    styles.linkInput,
                    { flex: 2, color: '#00FF41', borderColor: '#00FF41', backgroundColor: currentTheme.background, borderRadius: 0, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                  ]}
                />
                <Pressable 
                  onPress={addLinkToNewNote}
                  style={({ pressed }) => [
                    styles.addLinkMiniBtn, 
                    { 
                      borderColor: '#00FF41', 
                      backgroundColor: pressed ? '#00FF41' : '#000000',
                      borderWidth: 1,
                      borderRadius: 0,
                    }
                  ]}
                >
                  {({ pressed }) => (
                    <Text style={{ color: pressed ? '#000000' : '#00FF41', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>[+]</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setIsModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalBtn, 
                  {
                    borderColor: '#ef4444',
                    backgroundColor: pressed ? '#ef4444' : '#000000',
                  }
                ]}
              >
                {({ pressed }) => (
                  <Text style={{ color: pressed ? '#000000' : '#ef4444', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                    [ Annulla ]
                  </Text>
                )}
              </Pressable>

              <Pressable 
                onPress={handleCreateNote}
                style={({ pressed }) => [
                  styles.modalBtn, 
                  {
                    borderColor: '#00FF41',
                    backgroundColor: pressed ? '#00FF41' : '#000000',
                  }
                ]}
              >
                {({ pressed }) => (
                  <Text style={{ color: pressed ? '#000000' : '#00FF41', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                    [ Cifra e Salva ]
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal di Dettaglio, Modifica ed Eliminazione Nota - A Tutto Schermo */}
      <Modal
        visible={isViewModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsViewModalVisible(false)}
      >
        <SafeAreaView style={[styles.fullScreenContainer, { backgroundColor: currentTheme.background }]} edges={['top', 'bottom']}>
          {/* Header Barra Superiore */}
          <View style={[styles.fsHeader, { borderColor: currentTheme.border }]}>
            <TouchableOpacity 
              onPress={() => setIsViewModalVisible(false)}
              style={styles.fsHeaderBack}
            >
              <Text style={[styles.fsHeaderBackText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>{"[ < LOGS ]"}</Text>
            </TouchableOpacity>
            
            <View style={styles.fsHeaderActions}>
              {selectedNote && (
                <Pressable 
                  onPress={() => toggleFavorite(selectedNote.id)}
                  style={({ pressed }) => [
                    styles.terminalButtonInline, 
                    { 
                      borderColor: selectedNote.isFavorite ? '#00FF41' : '#888888', 
                      backgroundColor: pressed ? (selectedNote.isFavorite ? '#00FF41' : '#888888') : '#000000',
                    }
                  ]}
                >
                  {({ pressed }) => (
                    <Text style={[
                      styles.terminalButtonInlineText,
                      { color: pressed ? '#000000' : (selectedNote.isFavorite ? '#00FF41' : '#888888') }
                    ]}>
                      [ PREFERITI ]
                    </Text>
                  )}
                </Pressable>
              )}
              
              <Pressable 
                onPress={handleSaveEdit}
                style={({ pressed }) => [
                  styles.terminalButtonInline, 
                  { 
                    borderColor: '#00FF41',
                    backgroundColor: pressed ? '#00FF41' : '#000000',
                  }
                ]}
              >
                {({ pressed }) => (
                  <Text style={[
                    styles.terminalButtonInlineText, 
                    { color: pressed ? '#000000' : '#00FF41' }
                  ]}>
                    [ SALVA ]
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Form del Contenuto */}
          <ScrollView style={styles.fsContent} showsVerticalScrollIndicator={false}>
            {/* Input Titolo */}
            <View style={styles.fsTitleInputContainer}>
              <TextInput
                placeholder="Identificativo del log (Titolo)..."
                placeholderTextColor="#008021"
                value={editNoteTitle}
                onChangeText={setEditNoteTitle}
                style={[
                  styles.fsTitleInput, 
                  { flex: 1, marginBottom: 0, color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                ]}
              />
              <Pressable
                onPress={handleGenerateEditTitle}
                disabled={(editNoteContent.trim() === '' && editNoteAttachments.length === 0) || isEditTitleLoading}
                style={({ pressed }) => [
                  styles.fsGenerateTitleBtn,
                  { 
                    borderColor: '#00FF41', 
                    backgroundColor: pressed ? '#00FF41' : '#000000',
                    borderWidth: 1,
                    borderRadius: 0,
                  }
                ]}
              >
                {({ pressed }) => (
                  isEditTitleLoading ? (
                    <ActivityIndicator size="small" color={pressed ? '#000000' : '#00FF41'} />
                  ) : (
                    <Text style={{ color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', fontSize: 11 }}>[AI]</Text>
                  )
                )}
              </Pressable>
            </View>
            
            {/* Riga Data & Badge */}
            <View style={styles.fsMetaRow}>
              <Text style={[styles.fsDateText, { color: currentTheme.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                {selectedNote?.date}
              </Text>
              {selectedNote?.tags && selectedNote.tags.length > 0 && (
                <View style={styles.fsTagsRow}>
                  {selectedNote.tags.map((tag, idx) => (
                    <View key={idx} style={[styles.tagBadge, { borderColor: '#00FF41', borderWidth: 1, borderRadius: 0, backgroundColor: '#000000' }]}>
                      <Text style={[styles.tagText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                        {`> ${tag}`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Input Contenuto */}
            <TextInput
              placeholder="Inizializza payload di log. Immettere dati da cifrare..."
              placeholderTextColor="#008021"
              value={editNoteContent}
              onChangeText={setEditNoteContent}
              multiline={true}
              textAlignVertical="top"
              style={[
                styles.fsContentInput, 
                { color: '#00FF41', minHeight: 180, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
              ]}
            />

            {/* Sezione Allegati Link in Modifica */}
            <View style={[styles.fsAttachmentsSection, { borderColor: '#00FF41' }]}>
              <Text style={[styles.fsAttachmentsTitle, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                Allegati (Link Esterni)
              </Text>

              {editNoteAttachments.length > 0 && (
                <View style={styles.fsAttachmentsRow}>
                  {editNoteAttachments.map((att) => (
                    <View key={att.id} style={[styles.fsAttachmentChip, { borderColor: '#00FF41', borderWidth: 1, backgroundColor: '#000000', borderRadius: 0 }]}>
                      <TouchableOpacity 
                        onPress={() => handleOpenLink(att.uri)}
                        activeOpacity={0.7}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Text style={[styles.fsAttachmentChipText, { color: '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]} numberOfLines={1}>
                          [ LNK ] {att.title || att.uri}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeLinkFromEditNote(att.id)} style={{ marginLeft: 6 }}>
                        <Text style={{ color: '#ef4444', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>[x]</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Form Aggiunta Link in Modifica */}
              <View style={styles.fsAddLinkFormRow}>
                <TextInput
                  placeholder="Titolo link..."
                  placeholderTextColor="#008021"
                  value={editLinkTitle}
                  onChangeText={setEditLinkTitle}
                  style={[
                    styles.fsLinkInput,
                    { flex: 1, color: '#00FF41', borderColor: '#00FF41', backgroundColor: currentTheme.background, borderRadius: 0, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                  ]}
                />
                <TextInput
                  placeholder="https://..."
                  placeholderTextColor="#008021"
                  value={editLinkUrl}
                  onChangeText={setEditLinkUrl}
                  style={[
                    styles.fsLinkInput,
                    { flex: 2, color: '#00FF41', borderColor: '#00FF41', backgroundColor: currentTheme.background, borderRadius: 0, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
                  ]}
                />
                <Pressable 
                  onPress={addLinkToEditNote}
                  style={({ pressed }) => [
                    styles.fsAddLinkBtn, 
                    { 
                      borderColor: '#00FF41', 
                      backgroundColor: pressed ? '#00FF41' : '#000000',
                      borderWidth: 1,
                      borderRadius: 0,
                    }
                  ]}
                >
                  {({ pressed }) => (
                    <Text style={{ color: pressed ? '#000000' : '#00FF41', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>[+]</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Footer con Pulsante di Eliminazione */}
          {selectedNote && (
            <View style={[styles.fsFooter, { borderColor: currentTheme.border }]}>
              <Pressable 
                onPress={() => handleDeleteNote(selectedNote.id)}
                style={({ pressed }) => [
                  styles.fsDeleteBtn, 
                  { 
                    backgroundColor: '#000000',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                  },
                  pressed && { backgroundColor: '#ef4444' }
                ]}
              >
                {({ pressed }) => (
                  <Text style={[styles.fsDeleteBtnText, { color: pressed ? '#000000' : '#ef4444' }]}>[ ELIMINA LOG ]</Text>
                )}
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  statusNode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 0,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  warningContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  warningBadge: {
    borderWidth: 1,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tabFilters: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: (Dimensions.get('window').width - 52) / 2,
    borderRadius: 0,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cryptoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cryptoIcon: {
    fontSize: 11,
  },
  cryptoText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: 9,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardExcerpt: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerInner: {
    flex: 1,
    gap: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 0,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  syncContainer: {
    marginTop: 2,
  },
  syncText: {
    fontSize: 8,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 0,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  favToggle: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  micBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 0,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  modalInputArea: {
    height: 120,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalBtnCancel: {
    borderColor: '#888888',
    backgroundColor: '#000000',
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#888888',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalBtnSave: {
    minWidth: 100,
    borderColor: '#00FF41',
    backgroundColor: '#000000',
  },
  modalBtnSaveText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalBtnDelete: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnDeleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  micInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  micSidebarBtn: {
    width: 44,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  micSidebarLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 4,
  },
  transcribingContainer: {
    height: 120,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  transcribingText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  transcribingSubtext: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fullScreenContainer: {
    flex: 1,
  },
  fsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  fsHeaderBack: {
    paddingVertical: 6,
  },
  fsHeaderBackText: {
    fontSize: 15,
    fontWeight: '600',
  },
  fsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  terminalButtonInline: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalButtonInlineText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textTransform: 'uppercase',
  },
  fsContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fsTitleInput: {
    fontSize: 22,
    fontWeight: '700',
    padding: 0,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  fsDateText: {
    fontSize: 12,
  },
  fsTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fsContentInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
  },
  fsFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  fsDeleteBtn: {
    height: 46,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsDeleteBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ragResponseWrapper: {
    backgroundColor: '#1A1A1A',
    borderColor: '#00FF41',
    borderWidth: 1,
    borderRadius: 2,
    padding: 18,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  ragHeaderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ragHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00FF41',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ragLoadingText: {
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ragResponseText: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  ragContextTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 14,
    color: '#94a3b8',
  },
  insightsDashboardContainer: {
    paddingBottom: 80,
  },
  insightsDashboard: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  insightsDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyInsights: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tagCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    borderWidth: 1,
    borderRadius: 2,
    padding: 16,
    marginBottom: 4,
  },
  tagCardIcon: {
    fontSize: 14,
    marginBottom: 8,
  },
  tagCardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tagCardCount: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  clearSearchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAttachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  cardAttachmentChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 0,
    maxWidth: '100%',
  },
  cardAttachmentChipText: {
    fontSize: 9,
    fontWeight: '600',
  },
  modalLinkSection: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  modalAttachmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  modalAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  modalAttachmentChipText: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 120,
  },
  addLinkFormRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  linkInput: {
    borderWidth: 1,
    borderRadius: 0,
    height: 34,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  addLinkMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsAttachmentsSection: {
    marginTop: 24,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 20,
  },
  fsAttachmentsTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fsAttachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  fsAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    maxWidth: '100%',
  },
  fsAttachmentChipText: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 200,
  },
  fsAddLinkFormRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  fsLinkInput: {
    borderWidth: 1,
    borderRadius: 0,
    height: 38,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  fsAddLinkBtn: {
    width: 38,
    height: 38,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateTitleBtn: {
    width: 42,
    height: 42,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsTitleInputContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  fsGenerateTitleBtn: {
    width: 38,
    height: 38,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    height: 44,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#00FF41',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});




