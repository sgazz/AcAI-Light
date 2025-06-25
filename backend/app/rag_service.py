import os
import tempfile
from typing import List, Dict, Any, Optional
from .document_processor import DocumentProcessor
from .vector_store import VectorStore
from .multi_step_retrieval import MultiStepRetrieval
from .reranker import Reranker
from .ocr_service import OCRService
from .models import Document
from sqlalchemy.orm import Session
from ollama import Client

class RAGService:
    """Glavni RAG servis koji povezuje sve komponente"""
    
    def __init__(self, ollama_host: str = "http://localhost:11434", model_name: str = "mistral"):
        self.document_processor = DocumentProcessor()
        self.vector_store = VectorStore()
        self.reranker = Reranker()
        self.multi_step_retrieval = MultiStepRetrieval(self.vector_store, self.reranker)
        self.ocr_service = OCRService()
        self.ollama_client = Client(host=ollama_host)
        self.model_name = model_name
    
    def upload_document(self, file_content: bytes, filename: str, db: Session, 
                       original_filename: str = None, ocr_metadata: dict = None) -> Dict[str, Any]:
        """Upload i procesiranje dokumenta sa OCR podrškom za slike"""
        try:
            # Koristi original_filename ako je prosleđen
            display_filename = original_filename if original_filename else filename
            
            # Sačuvaj fajl privremeno
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            # Ako je OCR metadata prosleđena, koristi je
            if ocr_metadata and ocr_metadata.get('status') == 'success':
                # Koristi već ekstraktovani tekst iz OCR-a
                ocr_text = ocr_metadata['text']
                
                if ocr_text.strip():
                    # Kreiraj privremeni tekst fajl sa OCR rezultatima
                    ocr_temp_path = temp_file_path + '_ocr.txt'
                    with open(ocr_temp_path, 'w', encoding='utf-8') as f:
                        f.write(f"OCR rezultat za {display_filename}\n")
                        f.write(f"Confidence: {ocr_metadata.get('confidence', 0):.2f}%\n")
                        f.write(f"Jezici: {', '.join(ocr_metadata.get('languages', []))}\n")
                        f.write("-" * 50 + "\n")
                        f.write(ocr_text)
                    
                    # Procesiraj OCR tekst kao dokument
                    document_data = self.document_processor.process_document(ocr_temp_path)
                    
                    # Dodaj OCR metapodatke
                    document_data['ocr_info'] = {
                        'confidence': ocr_metadata.get('confidence', 0),
                        'languages': ocr_metadata.get('languages', []),
                        'image_size': ocr_metadata.get('image_size'),
                        'original_filename': display_filename,
                        'text': ocr_text
                    }
                    
                    # Obriši OCR temp fajl
                    os.unlink(ocr_temp_path)
                else:
                    # Ako OCR nije uspešan, koristi običan document processor
                    document_data = self.document_processor.process_document(temp_file_path)
                    document_data['ocr_info'] = {
                        'status': 'no_text_found',
                        'message': 'OCR nije pronašao tekst u slici'
                    }
            else:
                # Proveri da li je slika i primeni OCR ako je potrebno
                if self.ocr_service.is_supported_format(filename):
                    # Ekstraktuj tekst iz slike
                    ocr_result = self.ocr_service.extract_text(temp_file_path)
                    
                    if ocr_result['status'] == 'success':
                        # Kreiraj tekstualni dokument iz OCR rezultata
                        ocr_text = ocr_result['text']
                        if ocr_text.strip():  # Ako je OCR uspešan i ima teksta
                            # Kreiraj privremeni tekst fajl sa OCR rezultatima
                            ocr_temp_path = temp_file_path + '_ocr.txt'
                            with open(ocr_temp_path, 'w', encoding='utf-8') as f:
                                f.write(f"OCR rezultat za {display_filename}\n")
                                f.write(f"Confidence: {ocr_result['confidence']:.2f}%\n")
                                f.write(f"Jezici: {', '.join(ocr_result['languages'])}\n")
                                f.write("-" * 50 + "\n")
                                f.write(ocr_text)
                            
                            # Procesiraj OCR tekst kao dokument
                            document_data = self.document_processor.process_document(ocr_temp_path)
                            
                            # Dodaj OCR metapodatke
                            document_data['ocr_info'] = {
                                'confidence': ocr_result['confidence'],
                                'languages': ocr_result['languages'],
                                'image_size': ocr_result['image_size'],
                                'original_filename': display_filename,
                                'text': ocr_text
                            }
                            
                            # Obriši OCR temp fajl
                            os.unlink(ocr_temp_path)
                        else:
                            # Ako OCR nije uspešan, koristi običan document processor
                            document_data = self.document_processor.process_document(temp_file_path)
                            document_data['ocr_info'] = {
                                'status': 'no_text_found',
                                'message': 'OCR nije pronašao tekst u slici'
                            }
                    else:
                        # Ako OCR ne uspe, koristi običan document processor
                        document_data = self.document_processor.process_document(temp_file_path)
                        document_data['ocr_info'] = {
                            'status': 'error',
                            'message': ocr_result['message']
                        }
                else:
                    # Običan dokument (nije slika)
                    document_data = self.document_processor.process_document(temp_file_path)
            
            # Dodaj u vector store
            doc_id = self.vector_store.add_document(document_data)
            
            # Sačuvaj u SQL bazu
            db_document = Document(
                id=doc_id,
                filename=display_filename,  # Koristi display_filename
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
            
            # Pripremi response
            response = {
                'status': 'success',
                'document_id': doc_id,  # Dodaj document_id
                'filename': display_filename,
                'file_type': document_data['file_type'],
                'total_pages': document_data['total_pages'],
                'chunks_created': sum(len(page['chunks']) for page in document_data['pages'])
            }
            
            # Dodaj OCR informacije ako postoje
            if 'ocr_info' in document_data:
                response['ocr_info'] = document_data['ocr_info']
            
            return response
            
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
                    filename=display_filename if 'display_filename' in locals() else filename,
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
        """Dohvata dokumente iz SQL baze sa OCR informacijama"""
        try:
            documents = db.query(Document).order_by(Document.created_at.desc()).all()
            result = []
            
            for doc in documents:
                doc_info = {
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
                
                # Dohvati OCR informacije iz vector store-a ako postoje
                try:
                    vector_info = self.vector_store.get_document_info(doc.id)
                    if vector_info and 'ocr_info' in vector_info:
                        doc_info['ocr_info'] = vector_info['ocr_info']
                except Exception as e:
                    print(f"Greška pri dohvatanju OCR info za {doc.id}: {e}")
                
                result.append(doc_info)
            
            return result
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
    
    def search_documents(self, query: str, top_k: int = 5, use_rerank: bool = True) -> List[Dict[str, Any]]:
        """Pretražuje dokumente sa opcionalnim re-ranking-om"""
        try:
            # Prvo dohvati više rezultata za re-ranking
            initial_k = top_k * 3 if use_rerank else top_k
            results = self.vector_store.search(query, initial_k)
            
            if not results:
                return []
            
            # Ako je re-ranking omogućen, primeni ga
            if use_rerank and self.reranker.model is not None:
                reranked_results = self.reranker.rerank(query, results, top_k)
                return reranked_results
            else:
                return results[:top_k]
                
        except Exception as e:
            print(f"Greška pri pretraživanju: {e}")
            return []
    
    def search_documents_with_rerank(self, query: str, top_k: int = 5, 
                                   use_metadata: bool = True) -> List[Dict[str, Any]]:
        """Pretražuje dokumente sa naprednim re-ranking-om"""
        try:
            # Dohvati više rezultata za re-ranking
            initial_k = top_k * 3
            results = self.vector_store.search(query, initial_k)
            
            if not results:
                return []
            
            # Primeni re-ranking sa metapodacima
            reranked_results = self.reranker.rerank_with_metadata(
                query, results, top_k, use_metadata
            )
            
            return reranked_results
            
        except Exception as e:
            print(f"Greška pri pretraživanju sa re-ranking-om: {e}")
            return []
    
    def generate_rag_response(self, query: str, context: str = "", max_results: int = 3, 
                            use_rerank: bool = True) -> Dict[str, Any]:
        """Generiše RAG odgovor sa kontekstom iz dokumenata"""
        try:
            # Pretraži relevantne dokumente sa re-ranking-om
            if use_rerank:
                search_results = self.search_documents_with_rerank(query, max_results)
            else:
                search_results = self.search_documents(query, max_results, use_rerank=False)
            
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
            
            # Pripremi informacije o izvorima
            sources = []
            for result in search_results:
                source_info = {
                    'filename': result['filename'],
                    'page': result['page'],
                    'score': result.get('combined_score', result.get('score', 0)),
                    'content': result['content'][:200] + "..." if len(result['content']) > 200 else result['content']
                }
                
                # Dodaj re-ranking informacije ako su dostupne
                if 'rerank_score' in result:
                    source_info['rerank_score'] = result['rerank_score']
                    source_info['original_score'] = result.get('score', 0)
                
                sources.append(source_info)
            
            return {
                'status': 'success',
                'response': ai_response,
                'sources': sources,
                'used_rag': True,
                'reranking_applied': use_rerank and self.reranker.model is not None,
                'reranker_info': self.reranker.get_model_info() if use_rerank else None
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
    def generate_multi_step_rag_response(self, query: str, context: str = "", max_results: int = 3, 
                                        use_rerank: bool = True) -> Dict[str, Any]:
        """Generiše RAG odgovor koristeći multi-step retrieval"""
        try:
            # Koristi multi-step retrieval za pretragu
            multi_step_result = self.multi_step_retrieval.multi_step_search(
                query, max_results, use_rerank
            )
            
            if multi_step_result["status"] != "success":
                # Fallback na običan RAG
                return self.generate_rag_response(query, context, max_results, use_rerank)
            
            search_results = multi_step_result["results"]
            
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
                    "role": "user",
                    "content": rag_prompt
                }]
            )
            
            ai_response = response["message"]["content"]
            
            # Pripremi informacije o izvorima
            sources = []
            for result in search_results:
                source_info = {
                    "filename": result["filename"],
                    "page": result["page"],
                    "score": result.get("combined_score", result.get("score", 0)),
                    "content": result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"]
                }
                
                # Dodaj re-ranking informacije ako su dostupne
                if "rerank_score" in result:
                    source_info["rerank_score"] = result["rerank_score"]
                    source_info["original_score"] = result.get("score", 0)
                
                # Dodaj multi-step informacije
                if "sub_query" in result:
                    source_info["sub_query"] = result["sub_query"]
                if "step" in result:
                    source_info["step"] = result["step"]
                
                sources.append(source_info)
            
            return {
                "status": "success",
                "response": ai_response,
                "sources": sources,
                "used_rag": True,
                "reranking_applied": use_rerank and self.reranker.model is not None,
                "reranker_info": self.reranker.get_model_info() if use_rerank else None,
                "multi_step_info": {
                    "query_type": multi_step_result["query_type"],
                    "steps_used": multi_step_result["steps_used"],
                    "sub_queries": multi_step_result.get("sub_queries", []),
                    "concepts": multi_step_result.get("concepts", []),
                    "total_candidates": multi_step_result.get("total_candidates", 0),
                    "unique_candidates": multi_step_result.get("unique_candidates", 0)
                }
            }
            
        except Exception as e:
            print(f"Greška pri multi-step RAG generisanju: {e}")
            # Fallback na običan RAG
            return self.generate_rag_response(query, context, max_results, use_rerank)
    
    def get_query_analytics(self, query: str) -> Dict[str, Any]:
        """Vraća analitiku upita"""
        return self.multi_step_retrieval.get_search_analytics(query)
