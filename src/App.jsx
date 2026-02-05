import { VaultProvider, useVault } from "./hooks/useVault";
import { isSupabaseConfigured } from "./supabaseClient";
import Auth from "./components/Auth";
import DoWhatApp from "./components/DoWhatApp";
import "./App.css";

function AppInner() {
  const { vaultId } = useVault();

  if (!isSupabaseConfigured) {
    return (
      <div className="container" style={{ padding: "50px 0 100px 0" }}>
        <h2>Supabase is not configured</h2>
        <p>
          Provide <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> as build environment variables so
          the app can connect to its database.
        </p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "50px 0 100px 0" }}>
      {!vaultId ? <Auth /> : <DoWhatApp key={vaultId} />}
    </div>
  );
}

function App() {
  return (
    <VaultProvider>
      <AppInner />
    </VaultProvider>
  );
}

export default App;
