import { PrivyClient } from "@privyai/api-client";

interface ChatRequest {
  sessionToken: string;
  message: string;
}

// SSE event types
interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
}

function formatSSE(event: SSEEvent): string {
  let message = "";
  if (event.event) {
    message += `event: ${event.event}\n`;
  }
  if (event.id) {
    message += `id: ${event.id}\n`;
  }
  message += `data: ${event.data}\n\n`;
  return message;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    // Get environment variables
    const privyApiKey = Deno.env.get("PRIVY_API_KEY");
    const privyApiSecret = Deno.env.get("PRIVY_API_SECRET");

    if (!privyApiKey || !privyApiSecret) {
      return new Response(
        JSON.stringify({ error: "Privy API credentials not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    const { sessionToken, message } = body;

    if (!sessionToken || !message) {
      return new Response(
        JSON.stringify({ error: "sessionToken and message are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Initialize Privy client
    const privy = new PrivyClient({
      apiKey: privyApiKey,
      apiSecret: privyApiSecret,
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection event
          controller.enqueue(
            new TextEncoder().encode(
              formatSSE({ event: "connected", data: JSON.stringify({ status: "connected" }) })
            )
          );

          // Stream chat response from Privy
          const chatStream = await privy.chat.stream({
            sessionToken,
            message,
          });

          // Process each chunk from the stream
          for await (const chunk of chatStream) {
            const eventData = formatSSE({
              event: "message",
              data: JSON.stringify(chunk),
            });
            controller.enqueue(new TextEncoder().encode(eventData));
          }

          // Send completion event
          controller.enqueue(
            new TextEncoder().encode(
              formatSSE({ event: "done", data: JSON.stringify({ status: "completed" }) })
            )
          );

          controller.close();
        } catch (error) {
          console.error("Error in chat stream:", error);
          
          // Send error event
          const errorData = formatSSE({
            event: "error",
            data: JSON.stringify({
              error: "Stream error",
              message: error instanceof Error ? error.message : "Unknown error",
            }),
          });
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },

      cancel() {
        // Clean up if the client disconnects
        console.log("Client disconnected from chat stream");
      },
    });

    // Return the SSE response
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
