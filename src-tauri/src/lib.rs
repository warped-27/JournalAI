use keyring::{Entry, Error as KeyringError};

const KEYRING_SERVICE: &str = "nerd_journal";

/// Allowlist of every key the JS layer is permitted to read/write/delete.
/// Any key not in this list is rejected to prevent arbitrary keychain enumeration
/// by injected content running in the WebView.
const ALLOWED_KEYS: &[&str] = &[
    "nj_vault_salt",
    "nj_vault_verifier",
    "nj_gemini_apikey",
    "nj_gemini_consent",
    "nj_gemini_model",
    "nj_gemini_autoenrich",
    "nj_ollama_config",
    "nj_mlx_config",
    "nj_sync_config",
    "nj_device_id",
    "nj_biometric_enabled",
    "nj_custom_config",
];

fn validate_key(key: &str) -> Result<(), String> {
    if ALLOWED_KEYS.contains(&key) {
        Ok(())
    } else {
        Err(format!("Unknown secret key"))
    }
}

/// Retrieve a secret from the OS keychain.
/// Returns `None` if no entry exists for this key (not an error).
#[tauri::command]
fn get_secret(key: String) -> Result<Option<String>, String> {
    validate_key(&key)?;
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(val)                    => Ok(Some(val)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e)                     => Err(e.to_string()),
    }
}

/// Store a secret in the OS keychain (creates or overwrites the entry).
#[tauri::command]
fn set_secret(key: String, value: String) -> Result<(), String> {
    validate_key(&key)?;
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

/// Delete a secret from the OS keychain.
/// Silently succeeds if the entry does not exist.
#[tauri::command]
fn delete_secret(key: String) -> Result<(), String> {
    validate_key(&key)?;
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_)                      => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(e)                     => Err(e.to_string()),
    }
}

/// Read an arbitrary file as raw bytes.
/// Used by the JS layer after a user selects a file via the OS dialog —
/// the dialog approval implies user intent, so no capability scope is needed.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_secret,
            set_secret,
            delete_secret,
            read_file_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NERD_JOURNAL_");
}
