import { queryFAISSVectorStore, checkRAGSystemStatus } from "@/lib/rag-server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuration
export const maxDuration = 60;
const DEFAULT_MODEL = "models/gemini-2.5-flash";

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
    const body = await req.json();
    console.log("RAG Request received:", body);

    // Handle both message formats: direct message or messages array
    const userQuestion = body.message || (body.messages && body.messages.length > 0 ? body.messages[body.messages.length - 1].content : "");
    const reportData: string = body.data?.reportData || "";

    console.log("Report data received:", !!reportData);
    console.log("User question:", userQuestion);

    // Check RAG system status first
    const ragStatus = await checkRAGSystemStatus();
    console.log("RAG System Status:", ragStatus);

    // Query the FAISS-based RAG system
    let retrievals: string[] = [];
    
    if (ragStatus.ready) {
      try {
        console.log("Querying FAISS RAG system...");
        const query = `Patient medical context: ${reportData}\nUser question: ${userQuestion}\nFind relevant medical information:`;
        retrievals = await queryFAISSVectorStore(query, 5);
        console.log(`Retrieved ${retrievals.length} chunks from FAISS RAG system`);
      } catch (error) {
        console.error("FAISS RAG query failed:", error);
        retrievals = ["Could not retrieve medical references from RAG system"];
      }
    } else {
      console.log("RAG system not ready, using fallback knowledge");
      retrievals = [
        `RAG system status: ${ragStatus.message}`,
        "Using general medical knowledge for this query",
        "To enable full RAG capabilities, please build the FAISS index using your medical documents"
      ];
    }

    // Ensure retrievals is an array
    retrievals = Array.isArray(retrievals) ? retrievals : [retrievals];

    // Build the enhanced prompt with RAG context
    const finalPrompt = `**Advanced Medical Consultation System with RAG**

### Patient Report Summary:
${reportData || "No report provided"}

### User Question:
${userQuestion}

### Retrieved Medical Knowledge (from RAG system):
${retrievals.length > 0 ? retrievals.map((r, i) => `${i + 1}. ${r}`).join("\n") : "No additional references found"}

### RAG System Status:
${ragStatus.ready ? "✅ Active - Using specialized medical knowledge base" : "⚠️ " + ragStatus.message}

### Instructions:
1. **Primary Source**: Use the retrieved medical knowledge from the RAG system as your primary reference
2. **Patient Context**: Carefully analyze the patient report in conjunction with retrieved knowledge
3. **Evidence-Based**: Provide clinically accurate responses based on the retrieved medical literature
4. **Source Attribution**: Reference specific retrieved chunks when applicable (e.g., "Based on retrieved medical knowledge...")
5. **Limitations**: If the RAG system provides insufficient information, clearly state limitations
6. **Safety**: Always recommend consulting healthcare professionals for serious medical concerns

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
    console.error("RAG API processing error:", error);
    
    // Return error as plain text
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Internal server error"}`,
      {
        status: 500,
      }
    );
  }
}