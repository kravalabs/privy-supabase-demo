import React, { useState, useRef, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PrivyChatProps {
  userId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function PrivyChat({ userId, supabaseUrl, supabaseAnonKey }: PrivyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get or create session token
  const initializeSession = useCallback(async () => {
    if (sessionToken) return sessionToken;
    
    setIsInitializing(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/privy-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initialize session');
      }

      const data = await response.json();
      setSessionToken(data.sessionToken);
      return data.sessionToken;
    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [userId, supabaseUrl, supabaseAnonKey, sessionToken]);

  // Send message and stream response
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Ensure we have a session token
      const token = await initializeSession();

      // Create placeholder for assistant response
      const assistantMessageId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Call the chat edge function with SSE
      const response = await fetch(
        `${supabaseUrl}/functions/v1/privy-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            sessionToken: token,
            message: userMessage.content,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Read the SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            
            // Find the data line
            const dataLineIndex = lines.indexOf(line) + 1;
            if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data: ')) {
              const data = lines[dataLineIndex].slice(6);
              
              try {
                const parsedData = JSON.parse(data);

                switch (eventType) {
                  case 'connected':
                    console.log('SSE connected:', parsedData);
                    break;

                  case 'message':
                    // Append chunk to accumulated content
                    if (parsedData.content || parsedData.text || parsedData.delta) {
                      const content = parsedData.content || parsedData.text || parsedData.delta || '';
                      accumulatedContent += content;
                      
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: accumulatedContent }
                            : msg
                        )
                      );
                    }
                    break;

                  case 'done':
                    console.log('Stream completed:', parsedData);
                    break;

                  case 'error':
                    console.error('Stream error:', parsedData);
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: 'Error: ' + (parsedData.message || 'Unknown error') }
                          : msg
                      )
                    );
                    break;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Error sending message:', error);
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, there was an error processing your message. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div className="privy-chat-container">
      <div className="privy-chat-messages">
        {messages.length === 0 ? (
          <div className="privy-chat-empty">
            <p>Start a conversation by sending a message below.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`privy-chat-message ${message.role}`}
            >
              <div className="privy-chat-message-header">
                <span className="privy-chat-role">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="privy-chat-timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="privy-chat-message-content">
                {message.content || (message.role === 'assistant' && isLoading ? (
                  <span className="privy-chat-typing">Thinking...</span>
                ) : null)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="privy-chat-input-container">
        {isInitializing && (
          <div className="privy-chat-status">Initializing session...</div>
        )}
        
        <div className="privy-chat-input-wrapper">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading || isInitializing}
            rows={1}
            className="privy-chat-input"
          />
          
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="privy-chat-button stop"
              type="button"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isInitializing}
              className="privy-chat-button send"
              type="button"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PrivyChat;
