# Krava + Supabase Demo

A Vite + React application that integrates with Privy AI using Supabase Edge Functions for secure session management and streaming chat capabilities.

## Features

- 🔐 **Secure Session Management** - Create and manage Krava sessions via Supabase Edge Functions
- 💬 **Streaming Chat** - Real-time chat responses using Server-Sent Events (SSE)
- ⚡ **Vite + React** - Fast development with Hot Module Replacement
- 🚀 **Supabase Edge Functions** - Serverless functions for secure API handling

## Project Structure

```
├── src/
│   ├── components/
│   │   └── KravaChat.tsx       # React chat component with streaming
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── functions/
│       ├── Krava-session/      # Edge function: Create/get Krava sessions
│       │   └── index.ts
│       └── krava-chat/         # Edge function: Stream chat responses
│           └── index.ts
├── package.json
└── vite.config.js
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
- [Krava AI Account](https://www.krava.ai/) with API credentials

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

Install the Supabase CLI if you haven't already:

```bash
# macOS
brew install supabase/tap/supabase

# Windows (with scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download directly from:
# https://github.com/supabase/cli/releases
```

Link your Supabase project:

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3. Configure Environment Variables

Create a `.env` file in the root of your project:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# These are only for local edge function development
# In production, set these in the Supabase Dashboard
KRAVA_API_KEY=your-krava-api-key
KRAVA_API_SECRET=your-krava-api-secret
```

**Environment Variables Explained:**

| Variable | Description | Where to Set |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `.env` file |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (safe for client) | `.env` file |
| `KRAVA_API_KEY` | Your Krava AI API key | Supabase Dashboard + local `.env` |
| `KRAVA_API_SECRET` | Your Krava AI API secret | Supabase Dashboard + local `.env` |

**Getting Krava Credentials:**
1. Sign up at [Krava AI](https://www.krava.ai/)
2. Go to your dashboard → API Keys
3. Generate a new API key and secret

### 4. Deploy Edge Functions

Deploy the Supabase Edge Functions to your project:

```bash
# Deploy the session function
supabase functions deploy krava-session

# Deploy the chat function
supabase functions deploy krava-chat
```

**Set Environment Variables in Supabase Dashboard:**

After deploying, set your secrets in the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Edge Functions** → **Secrets**
4. Add the following secrets:
   - `KRAVA_API_KEY`
   - `KRAVA_API_SECRET`

Or use the CLI:

```bash
supabase secrets set KRAVA_API_KEY=your-krava-api-key
supabase secrets set KRAVA_API_SECRET=your-krava-api-secret
```

### 5. Run the Frontend

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`

## Usage

### Using the KravaChat Component

Import and use the `KravaChat` component in your React application:

```tsx
import { KravaChat } from './components/KravaChat';

function App() {
  return (
    <div className="app">
      <h1>Krava Chat Demo</h1>
      <PrivyChat
        userId="user-123"  // Unique identifier for the user
        supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
        supabaseAnonKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
      />
    </div>
  );
}

export default App;
```

### Component Props

| Prop | Type | Description |
|------|------|-------------|
| `userId` | `string` | Unique identifier for the user (used for session management) |
| `supabaseUrl` | `string` | Your Supabase project URL |
| `supabaseAnonKey` | `string` | Supabase anonymous key |

## Development

### Local Edge Function Development

Run edge functions locally for testing:

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve
```

The functions will be available at:
- `http://localhost:54321/functions/v1/krava-session`
- `http://localhost:54321/functions/v1/krava-chat`

### API Endpoints

#### POST `/functions/v1/krava-session`

Creates or retrieves a Krava session for a user.

**Request Body:**
```json
{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "sessionToken": "Krava-session-token-xyz"
}
```

#### POST `/functions/v1/privy-chat`

Streams chat responses using Server-Sent Events.

**Request Body:**
```json
{
  "sessionToken": "krava-session-token-xyz",
  "message": "Hello, how are you?"
}
```

**Response:** SSE Stream with events:
- `connected` - Connection established
- `message` - Chat response chunk
- `done` - Stream completed
- `error` - Error occurred

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### Edge Function Errors

Check function logs:
```bash
supabase functions logs krava-session --tail
supabase functions logs krava-chat --tail
```

### CORS Issues

The edge functions include CORS headers for all origins (`*`). In production, consider restricting this to your specific domain.

### Session Token Issues

If you get session errors:
1. Verify `KRAVA_API_KEY` and `KRAVA_API_SECRET` are set correctly
2. Check that the userId is being passed correctly
3. Review edge function logs for detailed error messages

## Technologies Used

- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [React](https://react.dev/) - UI Library
- [Supabase](https://supabase.com/) - Backend as a Service
- [Krava AI](https://www.krava.ai/) - AI Chat API
- [Deno](https://deno.land/) - Edge Function Runtime

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to:
- **Krava AI**: [Krava Support](https://www.krava.ai/support)
- **Supabase**: [Supabase Docs](https://supabase.com/docs)
- **This Project**: Open an issue on GitHub
