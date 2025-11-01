# Medical RAG Assistant Integration Guide

This guide explains how to integrate the FAISS-based RAG (Retrieval-Augmented Generation) system with your existing medical assistant application.

## 🏗️ Architecture Overview

Your enhanced application now supports two chat modes:

1. **Standard Chat** - Uses your existing Pinecone/mock data setup
2. **RAG Enhanced Chat** - Uses FAISS index built from your medical documents

```
[Frontend] → [Next.js API] → [Python RAG Service] → [FAISS Index]
                    ↓
               [Gemini API] → [Enhanced Response]
```

## 📋 Prerequisites

### Python Environment
```bash
# Install Python dependencies
pip install -r requirements.txt
```

### Medical Document
- Place your medical PDF (e.g., 600-page medical book) in the project root
- Supported formats: PDF files with extractable text

## 🚀 Setup Instructions

### Step 1: Build FAISS Index

Run the setup script to build your RAG index:

```bash
# Basic usage - build index from your medical book
python setup_rag.py medical_book.pdf

# Custom index directory
python setup_rag.py medical_book.pdf --index-dir custom_index

# Force rebuild existing index
python setup_rag.py medical_book.pdf --force-rebuild
```

Expected output:
```
🏥 Medical RAG System Setup
==================================================
🏗️ Building FAISS index from: medical_book.pdf
📁 Index will be saved to: faiss_index

1️⃣ Extracting text from PDF...
   ✅ Extracted 1,234,567 characters

2️⃣ Splitting text into chunks...
   ✅ Created 1,235 chunks

3️⃣ Creating embeddings...
   ✅ Generated embeddings: (1235, 384)

4️⃣ Building FAISS index...
   ✅ Successfully built FAISS index!
```

### Step 2: Start Your Application

```bash
npm run dev
```

### Step 3: Test RAG System

1. **Check RAG Status**: Visit `http://localhost:3000/api/rag-status`
2. **Use Enhanced Chat**: The chat component will automatically detect RAG availability

## 🛠️ API Endpoints

### `/api/ragchatgemini` (New)
Enhanced chat endpoint using FAISS RAG system
- Retrieves relevant chunks from your medical knowledge base
- Combines with Gemini AI for contextual responses

### `/api/medichatgemini` (Existing)
Your original chat endpoint using Pinecone/mock data

### `/api/rag-status`
Check RAG system readiness and configuration

Example response:
```json
{
  "success": true,
  "ragSystem": {
    "ready": true,
    "message": "RAG system ready with 1235 documents",
    "details": {
      "has_index": true,
      "has_docs": true,
      "doc_count": 1235,
      "has_embedder": true
    }
  },
  "timestamp": "2025-10-08T10:30:00Z"
}
```

## 🎛️ Configuration

### Environment Variables
Ensure these are set in your `.env.local`:
```env
GOOGLE_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_key_optional
```

### RAG System Configuration
The RAG system can be configured in `/lib/rag_service.py`:
- `embed_model_name`: Embedding model (default: "all-MiniLM-L6-v2")
- `index_dir`: FAISS index directory (default: "faiss_index")
- `top_k`: Number of chunks to retrieve (default: 5)

## 🔧 Usage in Components

### Using the Enhanced Chat Component

Replace your existing chat component with the RAG-enabled version:

```tsx
import RAGChatComponent from '@/components/ragchatcomponent';

// In your page/component
<RAGChatComponent reportData={reportData} />
```

### Manual RAG Query

You can also query the RAG system directly:

```typescript
import { queryFAISSVectorStore, checkRAGSystemStatus } from '@/lib/utils';

// Check if RAG is ready
const status = await checkRAGSystemStatus();

// Query the RAG system
if (status.ready) {
  const chunks = await queryFAISSVectorStore("What is hypertension?", 5);
  console.log(chunks);
}
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "RAG system not ready"
**Solution**: Build the FAISS index first
```bash
python setup_rag.py your_medical_book.pdf
```

#### 2. "Python environment not available"
**Solution**: Install Python dependencies
```bash
pip install -r requirements.txt
```

#### 3. "No text extracted from PDF"
**Solutions**:
- Ensure PDF has extractable text (not scanned images)
- Try a different PDF processing library if needed
- Check PDF file permissions

#### 4. Import errors for Python packages
**Solution**: Install in correct environment
```bash
# For conda users
conda install faiss-cpu sentence-transformers

# For pip users
pip install faiss-cpu sentence-transformers
```

### Debug Commands

```bash
# Check RAG system status
python lib/rag_service.py --check-status

# Test a query
python lib/rag_service.py "What is diabetes?" --top-k 3

# Rebuild index with verbose output
python setup_rag.py medical_book.pdf --force-rebuild
```

## 📊 Performance Considerations

### Index Size
- 600-page PDF ≈ 1,000-2,000 chunks
- Each chunk ≈ 1KB text + 384D embedding
- Total index size ≈ 5-10MB

### Query Performance
- FAISS search: <100ms for most queries
- Python process spawn: 200-500ms
- Total RAG query: 500-1000ms

### Optimization Tips
1. **Keep Python process warm** (future enhancement)
2. **Adjust chunk size** based on your content
3. **Use GPU-enabled FAISS** for larger datasets

## 🚀 Future Enhancements

1. **Persistent Python Process**: Keep RAG service running to avoid spawn overhead
2. **Multiple Document Types**: Support for Word, Text, and HTML files
3. **Hybrid Search**: Combine FAISS with keyword search
4. **Document Updates**: Incremental index updates
5. **RAG Analytics**: Track query performance and relevance

## 📁 File Structure

```
your-project/
├── lib/
│   ├── rag_service.py          # RAG service module
│   └── utils.ts                # Enhanced with RAG functions
├── app/api/
│   ├── ragchatgemini/          # RAG-enhanced chat endpoint
│   │   └── route.ts
│   ├── rag-status/             # RAG status check endpoint
│   │   └── route.ts
│   └── medichatgemini/         # Original chat endpoint
│       └── route.ts
├── components/
│   ├── ragchatcomponent.tsx    # Enhanced chat component
│   └── chatcomponent.tsx       # Original chat component
├── faiss_index/                # Generated FAISS index
│   ├── book.index
│   └── docs.pkl
├── setup_rag.py               # RAG setup script
├── rag_medical.py             # Core RAG implementation
├── requirements.txt           # Python dependencies
└── medical_book.pdf           # Your medical documents
```

## 🎯 Next Steps

1. **Build your FAISS index** using `setup_rag.py`
2. **Test the RAG system** with sample queries
3. **Replace chat components** with RAG-enabled versions
4. **Monitor performance** and adjust parameters as needed
5. **Add more medical documents** to enhance knowledge base

---

Need help? Check the troubleshooting section or review the API responses for error details.