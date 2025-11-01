import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Pinecone } from '@pinecone-database/pinecone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function queryPineconeVectorStore(
  pinecone: Pinecone,
  indexName: string,
  namespace: string,
  query: string,
  topK: number = 5
) {
  try {
    console.log(`Querying Pinecone index: ${indexName}, namespace: ${namespace}`);
    console.log(`Query: ${query}`);
    
    // Mock response for testing
    const mockResults = [
      "Medical condition: Hypertension - Treatment includes lifestyle modifications and antihypertensive medications.",
      "Symptoms: Headache, dizziness - Could be related to blood pressure fluctuations.",
      "Diagnostic criteria: Blood pressure readings >140/90 mmHg on multiple occasions.",
      "Medications: ACE inhibitors, beta-blockers, diuretics are common first-line treatments.",
      "Monitoring: Regular BP checks, kidney function tests, and cardiovascular assessments recommended."
    ];
    
    return mockResults;
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return ["Medical data currently unavailable."];
  }
}
