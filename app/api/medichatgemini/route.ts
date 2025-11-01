import { queryPineconeVectorStore } from "@/lib/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuration
export const maxDuration = 60;
const DEFAULT_MODEL = "models/gemini-2.5-flash";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "YOUR_PINECONE_KEY",
});

// Initialize Google Generative AI client
const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey || googleApiKey === "your_google_api_key_here") {
  console.error("GOOGLE_API_KEY is not set or is placeholder");
}
const google = googleApiKey && googleApiKey !== "your_google_api_key_here" ? new GoogleGenerativeAI(googleApiKey) : null;

// Get the model
const model = google ? google.getGenerativeModel({ model: DEFAULT_MODEL }) : null;

export async function POST(req: Request) {
  if (!google || !model) {
    return new Response(
      "Error: Google API key not configured. Please set GOOGLE_API_KEY in your environment variables.",
      { status: 500 }
    );
  }

  try {
    const { messages, data } = await req.json();
    console.log("Request received:", { messages, hasReportData: !!data?.reportData });

    const userQuestion = messages.length > 0 ? messages[messages.length - 1].content : "";
    const reportData: string = data?.reportData || "";

    console.log("Report data received:", !!reportData);
    console.log("User question:", userQuestion);

    // Construct query for Pinecone
    const query = `Patient medical context: ${reportData}\n\nUser question: ${userQuestion}\n\nFind relevant medical information:`;

    // Query Pinecone safely
    let retrievals: string[] = [];
    try {
      if (process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "your_pinecone_api_key_here") {
        retrievals = await queryPineconeVectorStore(pinecone, 'something', "ns1", query);
        console.log("Retrieved documents:", retrievals.length);
      } else {
        console.log("Pinecone not configured, skipping vector search");
        retrievals = ["Pinecone not configured - using general medical knowledge"];
      }
    } catch (err) {
      console.error("Pinecone query failed:", err);
      retrievals = ["Could not retrieve medical references"];
    }
    retrievals = Array.isArray(retrievals) ? retrievals : [retrievals];

    // Build the final prompt
    const finalPrompt = `**Medical Consultation System**

### Patient Report Summary:
${reportData || "No report provided"}

### User Question:
${userQuestion}

### Relevant Medical Knowledge:
${retrievals.length > 0 ? retrievals.map(r => "- " + r).join("\n") : "No additional references found"}

### Instructions:
1. Analyze the patient report carefully
2. Incorporate ONLY relevant findings from medical knowledge
3. Provide a detailed, clinically accurate response
4. Cite sources when applicable
5. If unsure, state limitations clearly

### Response:
`;

    // Generate content using Google Generative AI
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("Generated response length:", text.length);

    // Create a proper streaming response for Vercel AI SDK
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the message in the format expected by useChat
        const lines = [
          `0:"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
          'd:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}',
          ''
        ];
        
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + '\n'));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("API processing error:", error);
    
    // Return error as plain text
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Internal server error"}`,
      {
        status: 500,
      }
    );
  }
}