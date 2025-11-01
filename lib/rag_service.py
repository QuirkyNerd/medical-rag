import os
import sys
import faiss
import pickle
import numpy as np
from pathlib import Path

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Installing sentence-transformers...")
    os.system("pip install sentence-transformers")
    from sentence_transformers import SentenceTransformer

class RAGService:
    def __init__(self, index_dir="faiss_index"):
        self.index_dir = Path(index_dir)
        self.embedder = None
        self.index = None
        self.documents = []
        self._load_index()
    
    def _load_index(self):
        """Load FAISS index and documents"""
        index_path = self.index_dir / "book.index"
        docs_path = self.index_dir / "docs.pkl"
        
        if not index_path.exists() or not docs_path.exists():
            raise FileNotFoundError(f"FAISS index not found at {self.index_dir}")
        
        try:
            # Load FAISS index
            self.index = faiss.read_index(str(index_path))
            
            # Load documents
            with open(docs_path, 'rb') as f:
                self.documents = pickle.load(f)
            
            # Load embedder
            self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
            
            print(f"✅ RAG service loaded with {len(self.documents)} documents")
            
        except Exception as e:
            raise Exception(f"Error loading RAG index: {str(e)}")
    
    def query(self, query_text, top_k=5):
        """Query the RAG system"""
        if self.index is None or self.embedder is None:
            raise ValueError("RAG system not properly initialized")
        
        # Encode query
        query_embedding = self.embedder.encode([query_text])
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.index.search(query_embedding, top_k)
        
        # Format results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.documents):
                results.append({
                    'content': self.documents[idx],
                    'score': float(score),
                    'index': int(idx)
                })
        
        return results

# Global RAG service instance
_rag_service = None

def get_rag_service():
    """Get or create RAG service instance"""
    global _rag_service
    if _rag_service is None:
        try:
            _rag_service = RAGService()
        except Exception as e:
            print(f"❌ Failed to initialize RAG service: {e}")
            return None
    return _rag_service

def query_faiss_vector_store(query, top_k=5):
    """Main function to query FAISS vector store"""
    rag_service = get_rag_service()
    if rag_service is None:
        return []
    
    try:
        results = rag_service.query(query, top_k)
        return [(result['content'], result['score']) for result in results]
    except Exception as e:
        print(f"❌ Error querying RAG system: {e}")
        return []

def check_rag_system_status():
    """Check if RAG system is ready"""
    rag_service = get_rag_service()
    
    if rag_service is None:
        return {
            "ready": False,
            "message": "RAG service not initialized",
            "doc_count": 0
        }
    
    return {
        "ready": True,
        "message": f"RAG system ready with {len(rag_service.documents)} documents",
        "doc_count": len(rag_service.documents)
    }

# Test function
def test_rag_system():
    """Test the RAG system with a sample query"""
    status = check_rag_system_status()
    print("RAG System Status:", status)
    
    if status["ready"]:
        query = "What are the symptoms of diabetes?"
        results = query_faiss_vector_store(query, top_k=2)
        print(f"\nTest query: '{query}'")
        print(f"Found {len(results)} results:")
        for i, (chunk, score) in enumerate(results):
            print(f"\n--- Result {i+1} (Score: {score:.4f}) ---")
            print(chunk[:200] + "..." if len(chunk) > 200 else chunk)

if __name__ == "__main__":
    # Command line interface
    import argparse
    
    parser = argparse.ArgumentParser(description='Medical RAG Service')
    parser.add_argument('--check-status', action='store_true', help='Check RAG system status')
    parser.add_argument('--test', action='store_true', help='Test RAG system')
    parser.add_argument('query', nargs='?', help='Query to search')
    parser.add_argument('--top-k', type=int, default=3, help='Number of results')
    
    args = parser.parse_args()
    
    if args.check_status:
        status = check_rag_system_status()
        print(f"Status: {status}")
    elif args.test:
        test_rag_system()
    elif args.query:
        results = query_faiss_vector_store(args.query, args.top_k)
        print(f"Found {len(results)} results for: '{args.query}'\n")
        for i, (chunk, score) in enumerate(results):
            print(f"--- Result {i+1} (Score: {score:.4f}) ---")
            print(chunk[:300] + "..." if len(chunk) > 300 else chunk)
            print()
    else:
        parser.print_help()