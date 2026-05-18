import { PrivyChat } from './components/PrivyChat'
import './App.css'


function App() {
  // Get environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // Generate or retrieve a user ID (in a real app, this would come from auth)
  const userId = localStorage.getItem('privy-user-id') || (() => {
    const id = `user-${crypto.randomUUID()}`
    localStorage.setItem('privy-user-id', id)
    return id
  })()

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔐 Privy + Supabase Chat</h1>
        <p>Secure AI chat with streaming responses</p>
      </header>

      <main className="app-main">
        {supabaseUrl && supabaseAnonKey ? (
          <PrivyChat
            userId={userId}
            supabaseUrl={supabaseUrl}
            supabaseAnonKey={supabaseAnonKey}
          />
        ) : (
          <div className="setup-notice">
            <h2>⚠️ Setup Required</h2>
            <p>Please configure your environment variables:</p>
            <ol>
              <li>Create a <code>.env</code> file in the project root</li>
              <li>Add your Supabase credentials:</li>
            </ol>
            <pre>
              <code>{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}</code>
            </pre>
            <p>See the <a href="https://github.com/supabase/supabase-js">README.md</a> for full setup instructions.</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Powered by <a href="https://www.privy.ai/" target="_blank" rel="noopener noreferrer">Privy AI</a> + 
          <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer">Supabase</a>
        </p>
      </footer>
    </div>
  )
}

export default App
