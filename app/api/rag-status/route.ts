import { checkRAGSystemStatus } from "@/lib/rag-server";

export async function GET() {
  try {
    const status = await checkRAGSystemStatus();
    
    return Response.json({
      success: true,
      ragSystem: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error checking RAG system status:", error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      ragSystem: {
        ready: false,
        message: "Error checking RAG system"
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}