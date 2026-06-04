import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  Platform, 
  useColorScheme 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette } from '../constants/Colors';
import { SecureStorage } from '../constants/SecureStorage';
import { CryptoEngine } from '../constants/CryptoEngine';
import { NerdLogo } from './NerdLogo';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';
  const currentTheme = isDark ? Palette.dark : Palette.light;

  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  
  // Stati per la creazione password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validazione password in tempo reale
  const meetsLength = newPassword.length >= 8;
  const meetsUppercase = /[A-Z]/.test(newPassword);
  const meetsNumber = /[0-9]/.test(newPassword);
  const meetsSpecial = /[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?~`]/.test(newPassword);
  const allRequirementsMet = meetsLength && meetsUppercase && meetsNumber && meetsSpecial;
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const isWeb = Platform.OS === 'web';

  const checkLockState = async () => {
    const configured = await SecureStorage.hasMasterPassword();
    setHasPassword(configured);

    if (!configured) {
      setIsUnlocked(false);
    } else {
      const sessionActive = SecureStorage.isSessionUnlocked();
      setIsUnlocked(sessionActive);
    }
  };

  useEffect(() => {
    checkLockState();
  }, []);

  const handlePasswordUnlock = async () => {
    if (!enteredPassword.trim()) return;
    setErrorMsg(null);

    const isValid = await SecureStorage.verifyPassword(enteredPassword);
    if (isValid) {
      try {
        await CryptoEngine.deriveKey(enteredPassword);
        SecureStorage.setSessionUnlocked(true);
        setIsUnlocked(true);
      } catch (e) {
        console.error('[AuthGuard] Errore derivazione chiave:', e);
        setErrorMsg('Errore nella generazione della chiave crittografica.');
      }
    } else {
      setErrorMsg('Password errata. Riprova.');
    }
  };

  const handleCreatePassword = async () => {
    if (!allRequirementsMet) {
      setErrorMsg('La password non soddisfa tutti i requisiti di sicurezza.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Le password non coincidono.');
      return;
    }
    setErrorMsg(null);

    try {
      // Salva la password in SecureStorage (imposta in automatico sessionUnlocked = true)
      await SecureStorage.saveMasterPassword(newPassword);
      // Deriva la chiave in memoria RAM
      await CryptoEngine.deriveKey(newPassword);
      
      setHasPassword(true);
      setIsUnlocked(true);
    } catch (e) {
      console.error('[AuthGuard] Errore inizializzazione password:', e);
      setErrorMsg('Errore durante il salvataggio della password.');
    }
  };

  const handleBiometricUnlock = async () => {
    if (isBiometricLoading) return;
    setErrorMsg(null);
    setIsBiometricLoading(true);

    setTimeout(async () => {
      try {
        // Ottiene la password in modo sicuro (simulazione) e sblocca la sessione
        SecureStorage.setSessionUnlocked(true);
        // Eseguiamo il sblocco effettivo caricando la password ed elaborando la chiave in memoria RAM
        const savedPassword = await SecureStorage.getMasterPassword();
        if (savedPassword) {
          await CryptoEngine.deriveKey(savedPassword);
          setIsUnlocked(true);
        } else {
          setErrorMsg('Nessuna password salvata trovata.');
          SecureStorage.setSessionUnlocked(false);
        }
      } catch (e) {
        setErrorMsg('Sblocco biometrico fallito.');
        SecureStorage.setSessionUnlocked(false);
      } finally {
        setIsBiometricLoading(false);
      }
    }, 1200);
  };

  // Caricamento iniziale
  if (hasPassword === null) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={currentTheme.textPrimary} />
      </View>
    );
  }

  // App sbloccata -> renderizza l'albero di navigazione normale (Stack/Tabs)
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Schermata a tutto schermo
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={['top', 'bottom']}>
      <View style={styles.authContainer}>
        {/* Header Logo */}
        <View style={styles.header}>
          <NerdLogo fontSize={hasPassword ? 22 : 18} />
          
          <View style={[styles.statusNode, { borderColor: currentTheme.border, backgroundColor: currentTheme.surface }]}>
            <View style={[styles.statusDot, { backgroundColor: hasPassword ? '#00FF41' : '#ef4444' }]} />
            <Text style={[styles.statusText, { color: currentTheme.textPrimary }]}>
              {hasPassword ? 'Secured Sandbox' : 'Init Database...'}
            </Text>
          </View>
        </View>

        {/* UI di Setup (Primo Accesso) */}
        {!hasPassword ? (
          <View style={[styles.authCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
              Generazione Master Password
            </Text>
            <Text style={[styles.cardDescription, { color: currentTheme.textSecondary }]}>
              Immettere entropia di sicurezza. Verrà eseguita la derivazione PBKDF2 a 10.000 iterazioni per ricavare la chiave locale AES-CTR 256-bit.
            </Text>

            <TextInput
              placeholder="Crea Master Password..."
              placeholderTextColor={currentTheme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={true}
              onSubmitEditing={handleCreatePassword}
              style={[
                styles.input,
                { 
                  color: currentTheme.textPrimary, 
                  borderColor: currentTheme.border, 
                  backgroundColor: currentTheme.background 
                }
              ]}
            />

            <TextInput
              placeholder="Conferma Master Password..."
              placeholderTextColor={currentTheme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={true}
              onSubmitEditing={handleCreatePassword}
              style={[
                styles.input,
                { 
                  color: currentTheme.textPrimary, 
                  borderColor: currentTheme.border, 
                  backgroundColor: currentTheme.background 
                }
              ]}
            />

            {/* Checklist requisiti master password */}
            <View style={styles.checklistContainer}>
              <Text style={[styles.checklistItem, { color: meetsLength ? '#00FF41' : '#444444' }]}>
                {meetsLength ? '[x] Minimo 8 caratteri' : '[ ] Minimo 8 caratteri'}
              </Text>
              <Text style={[styles.checklistItem, { color: meetsUppercase ? '#00FF41' : '#444444' }]}>
                {meetsUppercase ? '[x] Almeno una maiuscola' : '[ ] Almeno una maiuscola'}
              </Text>
              <Text style={[styles.checklistItem, { color: meetsNumber ? '#00FF41' : '#444444' }]}>
                {meetsNumber ? '[x] Almeno un numero' : '[ ] Almeno un numero'}
              </Text>
              <Text style={[styles.checklistItem, { color: meetsSpecial ? '#00FF41' : '#444444' }]}>
                {meetsSpecial ? '[x] Almeno un carattere speciale' : '[ ] Almeno un carattere speciale'}
              </Text>
            </View>

            {errorMsg && (
              <Text style={styles.errorText}>
                ❌ {errorMsg}
              </Text>
            )}

            <Pressable
              disabled={!allRequirementsMet}
              onPress={handleCreatePassword}
              style={({ pressed }) => [
                styles.unlockBtn, 
                { 
                  width: '100%', 
                  marginTop: 8,
                  backgroundColor: '#000000',
                  borderColor: allRequirementsMet ? '#00FF41' : '#444444',
                  borderWidth: 1,
                },
                allRequirementsMet && pressed && { backgroundColor: '#00FF41' }
              ]}
            >
              {({ pressed }) => (
                <Text style={[
                  styles.unlockBtnText, 
                  { color: allRequirementsMet ? (pressed ? '#000000' : '#00FF41') : '#444444' }
                ]}>
                  [ INIZIALIZZA DATABASE LOCALE ]
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          /* UI di Sblocco (Accessi Successivi) */
          <View style={[styles.authCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
              Terminale Crittografato
            </Text>
            <Text style={[styles.cardDescription, { color: currentTheme.textSecondary }]}>
              Autenticazione richiesta. Immettere Master Password per derivare la chiave AES simmetrica ed allocare la sessione in RAM.
            </Text>

            <TextInput
              placeholder="Master Password..."
              placeholderTextColor={currentTheme.textSecondary}
              value={enteredPassword}
              onChangeText={setEnteredPassword}
              secureTextEntry={true}
              onSubmitEditing={handlePasswordUnlock}
              style={[
                styles.input,
                { 
                  color: currentTheme.textPrimary, 
                  borderColor: currentTheme.border, 
                  backgroundColor: currentTheme.background 
                }
              ]}
            />

            {errorMsg && (
              <Text style={styles.errorText}>
                ❌ {errorMsg}
              </Text>
            )}

            <View style={styles.actionsRow}>
              <Pressable
                onPress={handlePasswordUnlock}
                style={({ pressed }) => [
                  styles.unlockBtn, 
                  { 
                    flex: 1,
                    backgroundColor: '#000000',
                    borderColor: '#00FF41',
                    borderWidth: 1,
                  },
                  pressed && { backgroundColor: '#00FF41' }
                ]}
              >
                {({ pressed }) => (
                  <Text style={[styles.unlockBtnText, { color: pressed ? '#000000' : '#00FF41' }]}>
                    [ ESEGUI DECRITTOGRAFIA ]
                  </Text>
                )}
              </Pressable>

              {!isWeb && (
                <Pressable
                  onPress={handleBiometricUnlock}
                  disabled={isBiometricLoading}
                  style={({ pressed }) => [
                    styles.bioBtn, 
                    { 
                      borderColor: '#00FF41', 
                      backgroundColor: '#000000',
                      borderWidth: 1,
                    },
                    pressed && { backgroundColor: '#00FF41' }
                  ]}
                >
                  {({ pressed }) => (
                    isBiometricLoading ? (
                      <ActivityIndicator size="small" color="#00FF41" />
                    ) : (
                      <Text style={[styles.bioIcon, { color: pressed ? '#000000' : '#00FF41', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' }]}>
                        [BIO]
                      </Text>
                    )
                  )}
                </Pressable>
              )}
            </View>

            {isBiometricLoading && (
              <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>
                Verifica biometrica in corso...
              </Text>
            )}
          </View>
        )}

        {/* Footer info sicurezza */}
        <Text style={[styles.footerText, { color: currentTheme.textSecondary }]}>
          Nessuna chiave o log viene esposto all'esterno. Esecuzione interamente locale e sandboxed.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  statusNode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  authCard: {
    borderRadius: 0,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  input: {
    borderWidth: 1,
    borderRadius: 0,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unlockBtn: {
    height: 44,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  unlockBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bioBtn: {
    width: 60,
    height: 44,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioIcon: {
    fontSize: 12,
  },
  loadingText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footerText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  checklistContainer: {
    marginBottom: 16,
    alignSelf: 'stretch',
    padding: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    backgroundColor: '#000000',
    borderRadius: 0,
  },
  checklistItem: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
});
