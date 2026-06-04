import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  useColorScheme,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Palette } from '../../constants/Colors';
import { SecureStorage, CloudConfig, AIConfig } from '../../constants/SecureStorage';
import { NerdLogo } from '../../components/NerdLogo';

// Abilita la chiusura della sessione per flussi basati su browser/Web
WebBrowser.maybeCompleteAuthSession();

// Helper per estrarre l'access_token dal frammento url restituito da Google
const extractTokenFromUrl = (url: string): string | null => {
  const hashPart = url.split('#')[1] || url.split('?')[1];
  if (!hashPart) return null;
  const params = hashPart.split('&');
  for (const param of params) {
    const [key, value] = param.split('=');
    if (key === 'access_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

export default function SettingsScreen() {
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';
  const currentTheme = isDark ? Palette.dark : Palette.light;



  // Stato Cloud Config
  const [cloudProvider, setCloudProvider] = useState<CloudConfig['provider']>('none');
  const [webdavUrl, setWebdavUrl] = useState('');
  const [webdavUsername, setWebdavUsername] = useState('');
  const [webdavPassword, setWebdavPassword] = useState('');
  
  // Stati Google Drive OAuth
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'authorizing' | 'success' | 'error'>('idle');

  // Stato AI Config
  const [aiProvider, setAiProvider] = useState<AIConfig['provider']>('none');
  const [aiApiKey, setAiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.1-flash-lite');

  // Stato Feedback UI
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Caricamento dei dati salvati all'avvio
  useEffect(() => {
    async function loadSettings() {


      const cloud = await SecureStorage.getCloudConfig();
      if (cloud) {
        setCloudProvider(cloud.provider);
        if (cloud.webdavUrl) setWebdavUrl(cloud.webdavUrl);
        if (cloud.webdavUsername) setWebdavUsername(cloud.webdavUsername);
        if (cloud.webdavPassword) setWebdavPassword(cloud.webdavPassword);
        if (cloud.googleClientId) setGoogleClientId(cloud.googleClientId);
        if (cloud.accessToken) {
          setGoogleAccessToken(cloud.accessToken);
          setAuthStatus('success');
        }
      }

      const ai = await SecureStorage.getAIConfig();
      if (ai) {
        if (ai.provider === 'gemini') {
          setAiProvider('gemini');
        } else {
          setAiProvider('none');
        }
        if (ai.apiKey) setAiApiKey(ai.apiKey);
        if (ai.modelName) setGeminiModel(ai.modelName);
      }
    }
    loadSettings();
  }, []);

  // Avvia il flusso OAuth 2.0 nativo/Web per Google Drive
  const handleGoogleAuth = async () => {
    if (!googleClientId.trim()) {
      setErrorMsg('Inserisci prima il tuo Google Client ID.');
      return;
    }
    setErrorMsg(null);
    setAuthStatus('authorizing');

    try {
      // Genera il redirect URI per l'applicazione (Web o schema nativo per iOS/Android)
      const redirectUrl = Linking.createURL('oauth-callback');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${encodeURIComponent(googleClientId.trim())}&` +
        `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const token = extractTokenFromUrl(result.url);
        if (token) {
          setGoogleAccessToken(token);
          setAuthStatus('success');
          
          // Salva immediatamente per rendere operativo il CloudSyncEngine
          await SecureStorage.saveCloudConfig({
            provider: 'google_drive',
            googleClientId: googleClientId.trim(),
            accessToken: token,
          });
          
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setAuthStatus('error');
          setErrorMsg('Impossibile estrarre l\'access token dall\'URL di risposta.');
        }
      } else {
        setAuthStatus('error');
        setErrorMsg('Accesso annullato dall\'utente.');
      }
    } catch (err: any) {
      console.error('[Google OAuth] Errore:', err);
      setAuthStatus('error');
      setErrorMsg(`Errore di connessione: ${err.message || err}`);
    }
  };

  // Rimuove l'Access Token e disconnette Google Drive
  const handleGoogleDisconnect = async () => {
    setGoogleAccessToken('');
    setAuthStatus('idle');
    await SecureStorage.saveCloudConfig({
      provider: 'google_drive',
      googleClientId: googleClientId,
      accessToken: undefined,
    });
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMsg(null);
    try {


      // Salva configurazione cloud
      await SecureStorage.saveCloudConfig({
        provider: cloudProvider,
        webdavUrl: cloudProvider === 'webdav' ? webdavUrl : undefined,
        webdavUsername: cloudProvider === 'webdav' ? webdavUsername : undefined,
        webdavPassword: cloudProvider === 'webdav' ? webdavPassword : undefined,
        googleClientId: cloudProvider === 'google_drive' ? googleClientId : undefined,
        accessToken: cloudProvider === 'google_drive' ? googleAccessToken : undefined,
      });

      // Salva configurazione AI
      await SecureStorage.saveAIConfig({
        provider: aiProvider === 'gemini' ? 'gemini' : 'none',
        apiKey: aiProvider === 'gemini' ? aiApiKey : undefined,
        modelName: aiProvider === 'gemini' ? geminiModel : undefined,
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleClear = async () => {
    await SecureStorage.clearAll();

    setCloudProvider('none');
    setWebdavUrl('');
    setWebdavUsername('');
    setWebdavPassword('');
    setGoogleClientId('');
    setGoogleAccessToken('');
    setAuthStatus('idle');
    setAiProvider('none');
    setAiApiKey('');
    setGeminiModel('gemini-3.1-flash-lite');
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={['top']}>
      {/* Header */}
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
            [ IMPOSTAZIONI ]
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* SEZIONE 1: Cloud Storage (BYO-Cloud) */}
          <View style={[styles.card, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <Text style={[styles.cardTitle, { color: currentTheme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>1. DESTINAZIONE CLOUD (BYO-CLOUD)</Text>
            <Text style={[styles.cardDescription, { color: currentTheme.textSecondary }]}>
              Configurazione dell\'endpoint cloud privato. I log cifrati verranno scritti in questa directory remota.
            </Text>

            {/* Provider Selector Buttons */}
            <View style={styles.selectorGrid}>
              {(['none', 'google_drive'] as const).map((p) => {
                const isSelected = cloudProvider === p;
                
                return (
                  <Pressable
                    key={p}
                    onPress={() => setCloudProvider(p)}
                    style={({ pressed }) => [
                      styles.selectorBtn,
                      { 
                        borderColor: pressed || isSelected ? '#00FF41' : '#333333',
                        backgroundColor: pressed || isSelected ? '#00FF41' : '#000000',
                        borderWidth: 1,
                        borderRadius: 0,
                      }
                    ]}
                  >
                    {({ pressed }) => (
                      <Text 
                        style={[
                          styles.selectorBtnText, 
                          { 
                            color: pressed || isSelected ? '#000000' : '#888888',
                            fontWeight: 'bold',
                            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
                          }
                        ]}
                      >
                        {p === 'none' && '[ NESSUNO ]'}
                        {p === 'google_drive' && '[ G-DRIVE ]'}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Google Drive Configuration & OAuth */}
            {cloudProvider === 'google_drive' && (
              <View style={styles.conditionalContainer}>
                <Text style={[styles.label, { color: currentTheme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>Client ID OAuth Google (OAUTH_ID)</Text>
                <TextInput
                  placeholder="Client ID OAuth..."
                  placeholderTextColor="#008021"
                  value={googleClientId}
                  onChangeText={setGoogleClientId}
                  style={[
                    styles.input,
                    { color: '#00FF41', borderColor: currentTheme.border, backgroundColor: currentTheme.background }
                  ]}
                />

                {/* Badge di stato per l'autorizzazione OAuth */}
                {authStatus === 'authorizing' && (
                  <View style={[styles.authBadge, { backgroundColor: isDark ? '#3d2516' : '#fff3e0', borderColor: '#f59e0b' }]}>
                    <ActivityIndicator size="small" color="#f59e0b" style={{ marginRight: 6 }} />
                    <Text style={[styles.authBadgeText, { color: '#f59e0b' }]}>
                      🔄 Autorizzazione in corso...
                    </Text>
                  </View>
                )}

                {authStatus === 'success' && googleAccessToken ? (
                  <View style={[styles.authBadge, { backgroundColor: isDark ? '#1b2d24' : '#e8f5e9', borderColor: '#10b981' }]}>
                    <Text style={[styles.authBadgeText, { color: '#10b981' }]}>
                      ✔ Connesso a Google Drive
                    </Text>
                  </View>
                ) : null}

                {authStatus === 'error' && (
                  <View style={[styles.authBadge, { backgroundColor: isDark ? '#3d1b1b' : '#ffebee', borderColor: '#ef4444' }]}>
                    <Text style={[styles.authBadgeText, { color: '#ef4444' }]}>
                      ⚠️ Connessione fallita
                    </Text>
                  </View>
                )}

                {/* Pulsante di Login/Logout */}
                {googleAccessToken ? (
                  <Pressable
                    onPress={handleGoogleDisconnect}
                    style={({ pressed }) => [
                      styles.oauthBtn,
                      { 
                        borderColor: '#ef4444', 
                        backgroundColor: pressed ? '#ef4444' : '#000000', 
                        borderWidth: 1,
                        borderRadius: 0 
                      }
                    ]}
                  >
                    {({ pressed }) => (
                      <Text style={[styles.oauthBtnText, { color: pressed ? '#000000' : '#ef4444', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                        [ DISCONNETTI GOOGLE DRIVE ]
                      </Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleGoogleAuth}
                    disabled={authStatus === 'authorizing'}
                    style={({ pressed }) => [
                      styles.oauthBtn,
                      { 
                        borderColor: '#00FF41', 
                        backgroundColor: pressed ? '#00FF41' : '#000000', 
                        borderWidth: 1,
                        borderRadius: 0 
                      }
                    ]}
                  >
                    {({ pressed }) => (
                      <Text style={[styles.oauthBtnText, { color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                        [ ACCEDI CON GOOGLE DRIVE ]
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* SEZIONE 2: AI Config (BYOK) */}
          <View style={[styles.card, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <Text style={[styles.cardTitle, { color: currentTheme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>2. MOTORE IA (BRING YOUR OWN KEY)</Text>
            <Text style={[styles.cardDescription, { color: currentTheme.textSecondary }]}>
              Pipeline d\'inferenza. Selezionare Google Gemini e immettere la chiave API. Le richieste ed i payload rimangono locali e sandboxed.
            </Text>

            {/* AI Selector Buttons */}
            <View style={styles.selectorGrid}>
              {(['none', 'gemini'] as const).map((p) => {
                const isSelected = aiProvider === p;

                return (
                  <Pressable
                    key={p}
                    onPress={() => setAiProvider(p)}
                    style={({ pressed }) => [
                      styles.selectorBtn,
                      { 
                        borderColor: pressed || isSelected ? '#00FF41' : '#333333',
                        backgroundColor: pressed || isSelected ? '#00FF41' : '#000000',
                        borderWidth: 1,
                        borderRadius: 0,
                      }
                    ]}
                  >
                    {({ pressed }) => (
                      <Text 
                        style={[
                          styles.selectorBtnText, 
                          { 
                            color: pressed || isSelected ? '#000000' : '#888888',
                            fontWeight: 'bold',
                            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
                          }
                        ]}
                      >
                        {p === 'none' && '[ NESSUNO ]'}
                        {p === 'gemini' && '[ GEMINI ]'}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* API Key & Gemini Model Selector Inputs */}
            {aiProvider === 'gemini' && (
              <View style={styles.conditionalContainer}>
                <Text style={[styles.label, { color: currentTheme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>Chiave API (GEMINI_API_KEY)</Text>
                <TextInput
                  placeholder="API Key Gemini..."
                  placeholderTextColor="#008021"
                  value={aiApiKey}
                  onChangeText={setAiApiKey}
                  secureTextEntry
                  style={[
                    styles.input,
                    { color: '#00FF41', borderColor: currentTheme.border, backgroundColor: currentTheme.background, marginBottom: 8 }
                  ]}
                />

                <Text style={[styles.label, { color: currentTheme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>Modello LLM (MODEL_ID)</Text>
                <View style={styles.selectorGrid}>
                  {([
                    'gemini-3.1-flash-lite',
                    'gemini-2.5-flash',
                    'gemini-2.5-pro',
                    'gemini-1.5-flash',
                    'gemini-1.5-pro'
                  ] as const).map((m) => {
                    const isSelected = geminiModel === m;
                    
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setGeminiModel(m)}
                        style={({ pressed }) => [
                          styles.selectorBtn,
                          {
                            borderColor: pressed || isSelected ? '#00FF41' : '#333333',
                            backgroundColor: pressed || isSelected ? '#00FF41' : '#000000',
                            borderWidth: 1,
                            borderRadius: 0,
                            minWidth: '45%',
                            marginBottom: 4
                          }
                        ]}
                      >
                        {({ pressed }) => (
                          <Text
                            style={[
                              styles.selectorBtnText,
                              {
                                color: pressed || isSelected ? '#000000' : '#888888',
                                fontWeight: 'bold',
                                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                fontSize: 11
                              }
                            ]}
                          >
                            {m}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Buttons & Status Indicators */}
          <View style={styles.actionsContainer}>
            {errorMsg && (
              <View style={[styles.statusBanner, { backgroundColor: isDark ? '#3d1b1b' : '#ffebee' }]}>
                <Text style={[styles.statusBannerText, { color: '#ef4444' }]}>
                  ⚠️ {errorMsg}
                </Text>
              </View>
            )}

            {saveStatus === 'success' && (
              <View style={[styles.statusBanner, { backgroundColor: isDark ? '#1b2d24' : '#e8f5e9' }]}>
                <Text style={[styles.statusBannerText, { color: isDark ? '#81c784' : '#2e7d32' }]}>
                  ✔ Configurazione salvata sul dispositivo!
                </Text>
              </View>
            )}

            <Pressable 
              onPress={handleSave}
              disabled={saveStatus === 'saving'}
              style={({ pressed }) => [
                styles.saveButton, 
                { 
                  backgroundColor: '#000000',
                  borderColor: '#00FF41',
                  borderWidth: 1,
                },
                pressed && { backgroundColor: '#00FF41' }
              ]}
            >
              {({ pressed }) => (
                <Text style={[styles.saveButtonText, { color: pressed ? '#000000' : '#00FF41' }]}>
                  {saveStatus === 'saving' ? '[ SALVATAGGIO... ]' : '[ SALVA CONFIGURAZIONE ]'}
                </Text>
              )}
            </Pressable>

            <Pressable 
              onPress={handleClear}
              style={({ pressed }) => [
                styles.clearButton, 
                { 
                  backgroundColor: '#000000',
                  borderColor: '#ef4444',
                  borderWidth: 1,
                },
                pressed && { backgroundColor: '#ef4444' }
              ]}
            >
              {({ pressed }) => (
                <Text style={[styles.clearButtonText, { color: pressed ? '#000000' : '#ef4444' }]}>
                  [ AZZERA CREDENZIALI LOCALI ]
                </Text>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 0,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 0,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#00FF41',
  },
  inputToggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  selectorGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  selectorBtn: {
    flex: 1,
    minWidth: '45%',
    height: 38,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBtnText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  conditionalContainer: {
    marginTop: 12,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoBadge: {
    marginTop: 12,
    padding: 10,
    borderRadius: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  infoText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 0,
    borderWidth: 1,
    marginTop: 4,
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  oauthBtn: {
    height: 38,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  oauthBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: 10,
    gap: 12,
  },
  statusBanner: {
    padding: 12,
    borderRadius: 0,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  saveButton: {
    height: 48,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  clearButton: {
    height: 40,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});


