import {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react";
import { supabase } from "../supabaseClient";

// ---------------------------------------------------------------------------
// Crypto helpers (all browser-native, no library)
// ---------------------------------------------------------------------------

/** Generate a cryptographically random token (256 bits, base64url-encoded). */
const generateToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Derive a hex-encoded hash from a PIN using PBKDF2.
 * The salt is the vault token itself — it is already random and unique per vault.
 * 100 000 iterations, SHA-256.
 */
const hashPin = async (pin, salt) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------
const STORAGE_KEY_TOKEN = "doWhat_vault_token";
const STORAGE_KEY_PIN_HASH = "doWhat_vault_pin_hash";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  // vaultId is the token that identifies the vault (stored in localStorage).
  // pinHash is the derived hash (also cached in localStorage so we don't re-derive on every reload).
  const [vaultId, setVaultId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN) || null;
    } catch {
      return null;
    }
  });
  const [pinHash, setPinHash] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PIN_HASH) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ------------------------------------------------------------------
  // Verify: check that the (token, pinHash) pair exists in public.vaults.
  // Called on mount if localStorage already has both values.
  // ------------------------------------------------------------------
  const verify = useCallback(async (token, hash) => {
    if (!supabase || !token || !hash) return false;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("vaults")
        .select("id")
        .eq("id", token)
        .eq("pin_hash", hash)
        .single();
      if (dbErr || !data) {
        setError("vault not found or PIN is incorrect.");
        return false;
      }
      return true;
    } catch (err) {
      setError(err?.message || "unable to verify vault.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: if we already have a cached token + hash, verify silently.
  useEffect(() => {
    if (vaultId && pinHash) {
      verify(vaultId, pinHash).then((ok) => {
        if (!ok) {
          // Cached credentials are stale — clear them.
          setVaultId(null);
          setPinHash(null);
          try {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_PIN_HASH);
          } catch {
            /* ignore */
          }
        }
      });
    }
  }, []); // intentional: runs once on mount to validate cached credentials

  // ------------------------------------------------------------------
  // Create a brand-new vault.  Generates token, hashes PIN, inserts row.
  // ------------------------------------------------------------------
  const createVault = useCallback(async (pin) => {
    if (!supabase || !pin || pin.length < 4) {
      setError("PIN must be at least 4 characters.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const token = generateToken();
      const hash = await hashPin(pin, token);

      const { error: dbErr } = await supabase
        .from("vaults")
        .insert([{ id: token, pin_hash: hash }]);

      if (dbErr) {
        setError(dbErr.message || "failed to create vault.");
        return null;
      }

      // Persist and activate.
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
      setVaultId(token);
      setPinHash(hash);
      return token;
    } catch (err) {
      setError(err?.message || "something went wrong.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Join an existing vault with a known token + PIN.
  // ------------------------------------------------------------------
  const joinVault = useCallback(
    async (token, pin) => {
      if (!supabase || !token || !pin) {
        setError("vault code and PIN are required.");
        return false;
      }
      setLoading(true);
      setError(null);
      try {
        const hash = await hashPin(pin, token);
        const ok = await verify(token, hash);
        if (!ok) return false; // verify already sets error

        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
        setVaultId(token);
        setPinHash(hash);
        return true;
      } catch (err) {
        setError(err?.message || "something went wrong.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [verify],
  );

  // ------------------------------------------------------------------
  // Leave / log out of the current vault (client-side only).
  // ------------------------------------------------------------------
  const leaveVault = useCallback(() => {
    setVaultId(null);
    setPinHash(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_PIN_HASH);
    } catch {
      /* ignore */
    }
  }, []);

  const value = {
    vaultId, // string | null  – the active vault token
    loading, // bool           – async op in flight
    error, // string | null  – last error message
    createVault, // (pin: string) => Promise<token | null>
    joinVault, // (token, pin)   => Promise<bool>
    leaveVault, // ()             => void
  };

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
}

export function useVault() {
  return useContext(VaultContext);
}
