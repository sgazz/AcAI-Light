# AcAIA - AI Learning Assistant

AcAIA (Academy AI Assistant) is a modern AI learning assistant that uses advanced RAG (Retrieval-Augmented Generation) technology to provide personalized learning experiences through document and image analysis.

## 🚀 Features

- **Intelligent Chat**: Interactive chat with AI models (Ollama/Mistral)
- **Multi-Step RAG System**: Advanced search for complex queries with sub-query decomposition
- **OCR Integration**: Text recognition from images and scanned documents
- **Image Processing**: AI analysis of images and visual content
- **Advanced Re-ranking**: Cross-encoder models for precise result ranking
- **Document & Image Upload**: Support for PDF, DOCX, JPG, BMP, GIF and other formats
- **Semantic Search**: Fast search through document and image content
- **Conversation History**: Automatic saving and management of conversation history
- **Modern UI**: Elegant and intuitive interface inspired by popular AI tools
- **Supabase Database**: Secure data storage with PostgreSQL and pgvector

## 🛠️ Technologies

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Typed JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Material-UI** - Modern UI components
- **React Dropzone** - File upload functionality

### Backend
- **FastAPI** - Fast Python web framework
- **Supabase** - PostgreSQL database with pgvector
- **Ollama** - Local AI models
- **Mistral** - Advanced AI model

### RAG System
- **FAISS** - Fast vector search
- **Sentence Transformers** - Embedding models
- **Cross-encoder** - Advanced re-ranking models
- **Multi-Step Retrieval** - Complex search for complex queries
- **PyPDF2** - PDF processing
- **python-docx** - Word documents
- **Vector Store** - Embedding storage

### OCR & Image Processing
- **Tesseract OCR** - Text recognition from images
- **OpenCV** - Advanced image processing
- **Pillow** - Image processing
- **Multi-language Support** - Serbian and English

## 📁 Project Structure

```
AcAIA/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/      # App Router pages
│   │   ├── components/ # React components
│   │   │   ├── ChatBox.tsx         # Chat interface
│   │   │   ├── DocumentUpload.tsx  # Upload component
│   │   │   ├── ImagePreview.tsx    # OCR preview
│   │   │   └── SourcesDisplay.tsx  # Sources display
│   │   └── hooks/    # React hooks
├── backend/           # FastAPI server
│   ├── app/          # API application
│   │   ├── main.py                 # Main API endpoint
│   │   ├── rag_service.py          # RAG service
│   │   ├── multi_step_retrieval.py # Multi-step retrieval
│   │   ├── reranker.py             # Re-ranking functionality
│   │   ├── ocr_service.py          # OCR service
│   │   ├── vector_store.py         # FAISS vector store
│   │   └── document_processor.py   # Document processing
│   ├── data/         # RAG indices and data
│   └── requirements.txt
├── ACAI_Assistant.command  # Startup script
├── TestRAG.command         # RAG testing script
├── TestOCR.command         # OCR testing script
├── TestMultiStep.command   # Multi-step testing script
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- Ollama (for AI models)
- Tesseract OCR (for OCR functionality)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sgazz/AcAI-Light.git
cd AcAI-Light
```

2. **Start the backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

3. **Start the frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Or use the command script**
```bash
./ACAI_Assistant.command
```

### Testing Functionality
```bash
# Test RAG system
./TestRAG.command

# Test OCR functionality
./TestOCR.command

# Test multi-step retrieval
./TestMultiStep.command
```

## 🔧 Configuration

### AI Models
The project uses Ollama for local AI model execution. Install and start the desired model:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download models
ollama pull mistral
ollama pull llama2
```

### OCR Setup
For OCR functionality, install Tesseract:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-srp  # Serbian language
sudo apt-get install tesseract-ocr-eng  # English language

# macOS
brew install tesseract
brew install tesseract-lang

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

### Database
Supabase database is automatically configured. Set up environment variables:

```bash
# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
OLLAMA_BASE_URL=http://localhost:11434

# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### RAG System
The RAG system automatically:
- Creates FAISS index in `backend/data/vector_index/`
- Loads sentence transformer model (all-MiniLM-L6-v2)
- Loads cross-encoder model for re-ranking
- Processes and stores document embeddings
- Saves document metadata in Supabase database

## 📚 API Endpoints

### Chat Endpoints
- `GET /` - Health check
- `POST /chat` - Regular chat with AI model
- `POST /chat/rag` - RAG chat with document context
- `POST /chat/rag-multistep` - Multi-step RAG chat
- `POST /chat/new-session` - Create new session
- `GET /chat/history/{session_id}` - Get session history

### Document Endpoints
- `POST /documents/upload` - Upload documents and images (PDF, DOCX, TXT, JPG, PNG, etc.)
- `GET /documents` - List all documents
- `GET /documents/{doc_id}` - Get document information
- `DELETE /documents/{doc_id}` - Delete document

### RAG Endpoints
- `GET /rag/stats` - RAG system statistics
- `GET /rag/test` - Test RAG connectivity
- `POST /search/rerank` - Test re-ranking functionality
- `GET /rerank/info` - Re-ranker model information

### Multi-Step Endpoints
- `POST /search/multistep` - Test multi-step retrieval
- `GET /multistep/info` - Multi-step system information

### OCR Endpoints
- `GET /ocr/info` - OCR service information
- `GET /ocr/supported-formats` - Supported formats
- `GET /ocr/statistics` - OCR statistics
- `POST /ocr/extract` - Basic OCR extraction
- `POST /ocr/extract-advanced` - Advanced OCR with options
- `POST /ocr/batch-extract` - Batch OCR extraction

## 🎨 UI Components

- **Sidebar**: Navigation and session management
- **ChatBox**: Interactive chat interface
- **DocumentUpload**: Upload and manage documents and images
- **ImagePreview**: Display images with OCR results and bounding boxes
- **SourcesDisplay**: Display sources for RAG responses
- **RAG Chat**: Chat with document context

## 🔒 Security

- Local AI model execution
- Secure data storage in Supabase database
- No external API calls
- Document privacy
- Input validation and sanitization

## 🧪 Testing

### RAG Test
```bash
./TestRAG.command
```

### OCR Test
```bash
./TestOCR.command
```

### Multi-Step Test
```bash
./TestMultiStep.command
```

Test scripts verify:
- Ollama connectivity
- Document and image upload
- OCR functionality
- Semantic search
- Multi-step retrieval
- Re-ranking functionality
- RAG chat functionality
- System statistics

## 🆕 New Features

### Multi-Step Retrieval
- Automatic detection of complex queries
- Decomposition into sub-queries
- Iterative search with expansion
- Combination of results from multiple steps

### OCR Integration
- Text recognition from images
- Support for Serbian and English languages
- Advanced image processing
- Bounding box visualization
- Batch processing

### Advanced Re-ranking
- Cross-encoder models
- Precise result ranking
- Score combination
- Metadata integration

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

Stefan Gazzara - [@sgazz](https://github.com/sgazz)

Project Link: [https://github.com/sgazz/AcAI-Light](https://github.com/sgazz/AcAI-Light)

---

⭐ If you like this project, leave a star! 