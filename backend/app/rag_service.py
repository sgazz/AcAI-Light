import os
import tempfile
from typing import List, Dict, Any, Optional
from .document_processor import DocumentProcessor
from .vector_store import VectorStore
from .models import Document
from sqlalchemy.orm import Session
from ollama import Client

class RAGService:
    """Glavni RAG servis koji povezuje sve komponente"""
    
    def __init__(self, ollama_host: str = "http://localhost:11434", model_name: str = "mistral"):
        self.document_processor = DocumentProcessor()
        self.vector_store = VectorStore()
        self.ollama_client = Client(host=ollama_host)
        self.model_name = model_name
    
    def upload_document(self, file_content: bytes, filename: str, db: Session) -> Dict[str, Any]:
        """Upload i procesiranje dokumenta"""
        try:
            # Sačuvaj fajl privremeno
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            # Procesiraj dokument
            document_data = self.document_processor.process_document(temp_file_path)
            
            # Dodaj u vector store
            doc_id = self.vector_store.add_document(document_data)
            
            # Sačuvaj u SQL bazu
            db_document = Document(
                id=doc_id,
                filename=filename,
                file_type=document_data['file_type'],
                total_pages=document_data['total_pages'],
                file_size=len(file_content),
                status='uploaded',
                chunks_count=sum(len(page['chunks']) for page in document_data['pages'])
            )
            
            db.add(db_document)
            db.commit()
            
            # Obriši privremeni fajl
            os.unlink(temp_file_path)
            
            return {
                'status': 'success',
                'doc_id': doc_id,
                'filename': filename,
                'file_type': document_data['file_type'],
                'total_pages': document_data['total_pages'],
                'chunks_created': sum(len(page['chunks']) for page in document_data['pages'])
            }
            
        except Exception as e:
            # Ako je dokument već kreiran u vector store-u, obriši ga
            if 'doc_id' in locals():
                try:
                    self.vector_store.delete_document(doc_id)
                except:
                    pass
            
            # Sačuvaj grešku u bazu
            try:
                error_doc = Document(
                    id=doc_id if 'doc_id' in locals() else 'error_' + str(hash(filename)),
                    filename=filename,
                    file_type=os.path.splitext(filename)[1],
                    total_pages=0,
                    file_size=len(file_content),
                    status='error',
                    chunks_count=0,
                    error_message=str(e)
                )
                db.add(error_doc)
                db.commit()
            except:
                pass
            
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_documents_from_db(self, db: Session) -> List[Dict[str, Any]]:
        """Dohvata dokumente iz SQL baze"""
        try:
            documents = db.query(Document).order_by(Document.created_at.desc()).all()
            return [
                {
                    'id': doc.id,
                    'filename': doc.filename,
                    'file_type': doc.file_type,
                    'total_pages': doc.total_pages,
                    'file_size': doc.file_size,
                    'status': doc.status,
                    'chunks_count': doc.chunks_count,
                    'created_at': doc.created_at.isoformat(),
                    'error_message': doc.error_message
                }
                for doc in documents
            ]
        except Exception as e:
            print(f"Greška pri dohvatanju dokumenata iz baze: {e}")
            return []
    
    def delete_document_from_db(self, doc_id: str, db: Session) -> bool:
        """Briše dokument iz SQL baze i vector store-a"""
        try:
            # Obriši iz SQL baze
            document = db.query(Document).filter(Document.id == doc_id).first()
            if document:
                db.delete(document)
                db.commit()
            
            # Obriši iz vector store-a
            self.vector_store.delete_document(doc_id)
            
            return True
        except Exception as e:
            print(f"Greška pri brisanju dokumenta: {e}")
            db.rollback()
            return False
    
    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Pretražuje dokumente"""
        try:
            results = self.vector_store.search(query, top_k)
            return results
        except Exception as e:
            print(f"Greška pri pretraživanju: {e}")
            return []
    
    def generate_rag_response(self, query: str, context: str = "", max_results: int = 3) -> Dict[str, Any]:
        """Generiše RAG odgovor sa kontekstom iz dokumenata"""
        try:
            # Pretraži relevantne dokumente
            search_results = self.search_documents(query, max_results)
            
            if not search_results:
                # Ako nema rezultata, koristi običan chat
                return self._generate_simple_response(query)
            
            # Pripremi kontekst iz pretrage
            context_parts = []
            for result in search_results:
                context_parts.append(f"Izvor: {result['filename']} (stranica {result['page']})\nSadržaj: {result['content']}")
            
            document_context = "\n\n".join(context_parts)
            
            # Kreiraj RAG prompt
            rag_prompt = self._create_rag_prompt(query, document_context, context)
            
            # Generiši odgovor
            response = self.ollama_client.chat(
                model=self.model_name,
                messages=[{
                    'role': 'user',
                    'content': rag_prompt
                }]
            )
            
            ai_response = response['message']['content']
            
            return {
                'status': 'success',
                'response': ai_response,
                'sources': [
                    {
                        'filename': result['filename'],
                        'page': result['page'],
                        'score': result['score'],
                        'content': result['content'][:200] + "..." if len(result['content']) > 200 else result['content']
                    }
                    for result in search_results
                ],
                'used_rag': True
            }
            
        except Exception as e:
            print(f"Greška pri RAG generisanju: {e}")
            # Fallback na običan chat
            return self._generate_simple_response(query)
    
    def _generate_simple_response(self, query: str) -> Dict[str, Any]:
        """Generiše običan odgovor bez RAG-a"""
        try:
            response = self.ollama_client.chat(
                model=self.model_name,
                messages=[{
                    'role': 'user',
                    'content': query
                }]
            )
            
            return {
                'status': 'success',
                'response': response['message']['content'],
                'sources': [],
                'used_rag': False
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e),
                'sources': [],
                'used_rag': False
            }
    
    def _create_rag_prompt(self, query: str, document_context: str, conversation_context: str = "") -> str:
        """Kreira RAG prompt sa kontekstom"""
        prompt_parts = [
            "Ti si AI asistent za učenje koji koristi informacije iz dokumenata za pružanje preciznih i korisnih odgovora.",
            "Koristi sledeće informacije iz dokumenata da odgovoriš na pitanje:",
            "",
            "=== DOKUMENTI ===",
            document_context,
            "=== KRAJ DOKUMENATA ===",
            ""
        ]
        
        if conversation_context:
            prompt_parts.extend([
                "=== PRETHODNI RAZGOVOR ===",
                conversation_context,
                "=== KRAJ RAZGOVORA ===",
                ""
            ])
        
        prompt_parts.extend([
            "PITANJE: " + query,
            "",
            "ODGOVOR: Odgovori na pitanje koristeći informacije iz dokumenata. Ako informacije nisu dostupne u dokumentima, reci to jasno. Uvek citiraj izvore kada je moguće."
        ])
        
        return "\n".join(prompt_parts)
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """Vraća listu svih dokumenata"""
        return self.vector_store.list_documents()
    
    def get_document_info(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Dohvata informacije o dokumentu"""
        return self.vector_store.get_document_info(doc_id)
    
    def delete_document(self, doc_id: str) -> bool:
        """Briše dokument"""
        return self.vector_store.delete_document(doc_id)
    
    def get_stats(self) -> Dict[str, Any]:
        """Vraća statistike RAG sistema"""
        return self.vector_store.get_stats()
    
    def test_connection(self) -> Dict[str, Any]:
        """Testira povezanost sa Ollama"""
        try:
            response = self.ollama_client.chat(
                model=self.model_name,
                messages=[{
                    'role': 'user',
                    'content': 'Zdravo!'
                }]
            )
            return {
                'status': 'success',
                'message': 'Ollama povezan',
                'model': self.model_name
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Ollama greška: {str(e)}',
                'model': self.model_name
            } 