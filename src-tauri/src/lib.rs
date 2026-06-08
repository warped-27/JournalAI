use keyring::{Entry, Error as KeyringError};

const KEYRING_SERVICE: &str = "nerd_journal";

/// Retrieve a secret from the OS keychain.
/// Returns `None` if no entry exists for this key (not an error).
#[tauri::command]
fn get_secret(key: String) -> Result<Option<String>, String> {
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
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

/// Delete a secret from the OS keychain.
/// Silently succeeds if the entry does not exist.
#[tauri::command]
fn delete_secret(key: String) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_)                      => Ok(()),
        Err(KeyringError::NoEntry) => Ok(()),
        Err(e)                     => Err(e.to_string()),
    }
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running NERD_JOURNAL_");
}
