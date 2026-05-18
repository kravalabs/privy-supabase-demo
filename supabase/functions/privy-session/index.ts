import { PrivyClient } from "@privyai/api-client";

interface SessionRequest {
  userId: string;
}

interface SessionResponse {
  sessionToken: string;
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
    const body: SessionRequest = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
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

    // Create or get existing session for the user
    const session = await privy.sessions.create({
      userId,
    });

    const response: SessionResponse = {
      sessionToken: session.token,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error creating Privy session:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to create session",
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
