import { useSession } from "./hooks/useSession";
import Auth from "./components/Auth";
import DoWhatApp from "./components/DoWhatApp";
import "./App.css";

function App() {
  const { session, error, isSupabaseConfigured } = useSession();

  if (!isSupabaseConfigured) {
    return (
      <div className="container" style={{ padding: "50px 0 100px 0" }}>
        <h2>Supabase is not configured</h2>
        <p>
          Provide <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> as build
          environment variables so authentication can run in production.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: "50px 0 100px 0" }}>
        <h2>Unable to connect to Supabase</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "50px 0 100px 0" }}>
      {!session ? <Auth /> : <DoWhatApp key={session.user.id} session={session} />}
    </div>
  );
}

export default App;
