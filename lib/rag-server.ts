import { spawn } from 'child_process';
import path from 'path';

/**
 * Query the FAISS-based RAG system using Python service (server-side only)
 */
export async function queryFAISSVectorStore(
  query: string,
  topK: number = 5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      const pythonScriptPath = path.join(process.cwd(), 'lib', 'rag_service.py');
      console.log(`Querying FAISS RAG system with: ${query}`);
      
      // Use the virtual environment Python
      const pythonExe = path.join(process.cwd(), '.venv', 'bin', 'python');
      
      // Spawn Python process to run RAG service with stderr redirected
      const pythonProcess = spawn(pythonExe, [
        pythonScriptPath,
        query,
        '--top-k', topK.toString()
      ], {
        stdio: ['ignore', 'pipe', 'ignore'] // Only capture stdout
      });

      let stdout = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python RAG service exited with code ${code}`);
          
          // Fallback to basic response
          resolve([
            "RAG system temporarily unavailable. Using general medical knowledge.",
            "Please ensure the FAISS index is properly built from your medical documents."
          ]);
          return;
        }

        try {
          // Find the JSON part by looking for the first '{' character
          const jsonStart = stdout.indexOf('{');
          const jsonString = jsonStart >= 0 ? stdout.substring(jsonStart) : stdout;
          
          const result = JSON.parse(jsonString);
          if (result.error) {
            console.warn(`RAG service error: ${result.error}`);
            resolve([result.error]);
          } else {
            console.log(`Retrieved ${result.chunk_count} chunks from FAISS index`);
            resolve(result.chunks || []);
          }
        } catch (parseError) {
          console.error('Error parsing Python RAG response:', parseError);
          console.error('Raw stdout:', stdout);
          resolve(["Error processing RAG query. Please check the system configuration."]);
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Error spawning Python process:', error);
        resolve([
          "RAG system unavailable. Please ensure Python dependencies are installed.",
          "Run: pip install -r requirements.txt"
        ]);
      });

    } catch (error) {
      console.error('Error in queryFAISSVectorStore:', error);
      resolve(["RAG system error. Using fallback response."]);
    }
  });
}

/**
 * Check if the RAG system is ready and properly configured (server-side only)
 */
export async function checkRAGSystemStatus(): Promise<{
  ready: boolean;
  message: string;
  details?: any;
}> {
  return new Promise((resolve) => {
    try {
      const pythonScriptPath = path.join(process.cwd(), 'lib', 'rag_service.py');
      
      // Use the virtual environment Python
      const pythonExe = path.join(process.cwd(), '.venv', 'bin', 'python');
      
      const pythonProcess = spawn(pythonExe, [
        pythonScriptPath,
        '--check-status'
      ], {
        stdio: ['ignore', 'pipe', 'ignore'] // Only capture stdout
      });

      let stdout = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({
            ready: false,
            message: `RAG system check failed (exit code ${code})`,
            details: { code }
          });
          return;
        }

        try {
          // Find the JSON part by looking for the first '{' character
          const jsonStart = stdout.indexOf('{');
          const jsonString = jsonStart >= 0 ? stdout.substring(jsonStart) : stdout;
          
          const status = JSON.parse(jsonString);
          resolve({
            ready: status.ready,
            message: status.ready 
              ? `RAG system ready with ${status.doc_count} documents`
              : "RAG system not ready - please build FAISS index",
            details: status
          });
        } catch (parseError) {
          resolve({
            ready: false,
            message: "Error parsing RAG system status",
            details: { parseError: parseError instanceof Error ? parseError.message : String(parseError), stdout }
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          ready: false,
          message: "Python environment not available",
          details: { error: error instanceof Error ? error.message : String(error) }
        });
      });

    } catch (error) {
      resolve({
        ready: false,
        message: "Error checking RAG system status",
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  });
}