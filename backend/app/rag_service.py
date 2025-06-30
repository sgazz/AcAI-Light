import os
import tempfile
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from .document_processor import DocumentProcessor
from .vector_store import VectorStore
from .multi_step_retrieval import MultiStepRetrieval
from .reranker import Reranker
from .ocr_service import OCRService
from .context_selector import ContextSelector
# from .models import Document  # Uklonjeno - koristimo samo Supabase
from .cache_manager import cache_manager, get_cached_rag_result, set_cached_rag_result
from .error_handler import RAGError, ExternalServiceError, ValidationError, ErrorCategory, ErrorSeverity
from sqlalchemy.orm import Session
from ollama import Client
import sys
import numpy as np

# Dodaj backend direktorijum u path za import supabase_client
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from supabase_client import get_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("Supabase nije dostupan - chat istorija će biti čuvana samo lokalno")

class RAGService:
    """Glavni RAG servis koji povezuje sve komponente sa Supabase podrškom"""
    
    def __init__(self, ollama_host: str = "http://localhost:11434", model_name: str = "mistral", use_supabase: bool = True):
        self.document_processor = DocumentProcessor()
        self.vector_store = VectorStore(use_supabase=use_supabase)
        self.reranker = Reranker()
        self.multi_step_retrieval = MultiStepRetrieval(self.vector_store, self.reranker)
        self.context_selector = ContextSelector(self.vector_store, self.reranker)
        self.ocr_service = OCRService()
        self.ollama_client = Client(host=ollama_host)
        self.model_name = model_name
        self.use_supabase = use_supabase and SUPABASE_AVAILABLE
        self.supabase_manager = None
        
        # Inicijalizuj Supabase ako je omogućen
        if self.use_supabase:
            try:
                self.supabase_manager = get_supabase_manager()
                print("Supabase RAG servis omogućen")
            except Exception as e:
                print(f"Greška pri inicijalizaciji Supabase: {e}")
                self.use_supabase = False
    
    def upload_document(self, file_content: bytes, filename: str, 
                       use_ocr: bool = True, languages: List[str] = None) -> Dict[str, Any]:
        """Upload dokumenta sa OCR podrškom (bez lokalne baze)"""
        try:
            # Kreiraj privremeni fajl
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                # Pokušaj OCR ako je omogućen i ako je slika
                if use_ocr and self.ocr_service.is_supported_format(filename):
                    ocr_result = self.ocr_service.extract_text_advanced(
                        file_content, 
                        languages=languages or ['srp+eng']
                    )
                    
                    if ocr_result and ocr_result.get('text'):
                        # Sačuvaj OCR rezultat u Supabase
                        self._save_ocr_to_supabase(filename, temp_file_path, ocr_result['text'], ocr_result)
                        
                        # Kreiraj privremeni fajl sa OCR tekstom
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as ocr_temp_file:
                            ocr_temp_file.write(ocr_result['text'].encode('utf-8'))
                            ocr_temp_path = ocr_temp_file.name
                        
                        # Procesiraj dokument sa OCR tekstom
                        document_data = self.document_processor.process_document(ocr_temp_path)
                        document_data['ocr_info'] = {
                            'text': ocr_result['text'],
                            'confidence': ocr_result.get('confidence', 0),
                            'languages': ocr_result.get('languages', ['srp+eng']),
                            'processing_time': ocr_result.get('processing_time', 0)
                        }
                        
                        # Obriši privremene fajlove
                        os.unlink(ocr_temp_path)
                    else:
                        # Ako OCR nije uspešan, koristi običan document processor
                        document_data = self.document_processor.process_document(temp_file_path)
                        document_data['ocr_info'] = {
                            'text': '',
                            'confidence': 0,
                            'languages': ['srp+eng'],
                            'processing_time': 0
                        }
                else:
                    # Procesiraj dokument bez OCR-a
                    document_data = self.document_processor.process_document(temp_file_path)
                    document_data['ocr_info'] = {
                        'text': '',
                        'confidence': 0,
                        'languages': ['srp+eng'],
                        'processing_time': 0
                    }
                
                # Dodaj dokument u vector store
                doc_id = self.vector_store.add_document(document_data)
                
                # Sačuvaj u Supabase
                if self.use_supabase and self.supabase_manager:
                    supabase_doc_id = self.supabase_manager.insert_document(
                        filename=document_data['filename'],
                        file_path=temp_file_path,
                        file_type=document_data['file_type'],
                        file_size=len(file_content),
                        content=document_data.get('content', ''),
                        metadata={
                            'total_pages': document_data['total_pages'],
                            'chunks': document_data.get('pages', []),
                            'embedding_count': sum(len(page.get('chunks', [])) for page in document_data.get('pages', [])),
                            'ocr_info': document_data.get('ocr_info', {})
                        }
                    )
                
                response = {
                    'status': 'success',
                    'message': 'Dokument uspešno uploadovan',
                    'document_id': doc_id,  # Dodaj document_id
                    'filename': document_data['filename'],
                    'file_type': document_data['file_type'],
                    'total_pages': document_data['total_pages'],
                    'chunks_created': sum(len(page['chunks']) for page in document_data['pages'])
                }
                
                # Dodaj OCR informacije ako postoje
                if 'ocr_info' in document_data:
                    response['ocr_info'] = document_data['ocr_info']
                
                return response
                
            except Exception as e:
                # Ako dođe do greške, obriši dokument iz vector store-a
                if 'doc_id' in locals():
                    self.vector_store.delete_document(doc_id)
                raise e
                
            finally:
                # Obriši privremeni fajl
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            raise RAGError(f"Greška pri upload-u dokumenta: {str(e)}", ErrorCategory.DOCUMENT_PROCESSING)
    
    def _save_ocr_to_supabase(self, filename: str, file_path: str, ocr_text: str, ocr_metadata: dict):
        """Čuva OCR sliku u Supabase"""
        try:
            if not self.use_supabase or not self.supabase_manager:
                return
            
            # Sačuvaj OCR sliku
            self.supabase_manager.save_ocr_image(
                original_filename=filename,
                original_path=file_path,
                ocr_text=ocr_text,
                confidence_score=ocr_metadata.get('confidence', 0),
                language=ocr_metadata.get('languages', ['srp+eng'])[0] if ocr_metadata.get('languages') else 'srp+eng'
            )
            
        except Exception as e:
            print(f"Greška pri čuvanju OCR slike u Supabase: {e}")
    
    def search_documents(self, query: str, top_k: int = 5, use_rerank: bool = True) -> List[Dict[str, Any]]:
        """Pretražuje dokumente sa reranking opcijom"""
        try:
            # Osnovna pretraga
            results = self.vector_store.search(query, top_k * 2)  # Dohvati više rezultata za reranking
            
            if use_rerank and results:
                # Primeni reranking
                results = self.reranker.rerank(query, results, top_k)
            
            return results[:top_k]
            
        except Exception as e:
            print(f"Greška pri pretraživanju: {e}")
            return []
    
    def search_documents_with_rerank(self, query: str, top_k: int = 5, 
                                   use_metadata: bool = True) -> List[Dict[str, Any]]:
        """Pretražuje dokumente sa naprednim reranking-om"""
        try:
            # Osnovna pretraga
            initial_results = self.vector_store.search(query, top_k * 3)
            
            if not initial_results:
                return []
            
            # Primeni reranking sa metapodacima
            reranked_results = self.reranker.rerank_with_metadata(
                query, initial_results, top_k, use_metadata
            )
            
            return reranked_results
            
        except Exception as e:
            print(f"Greška pri pretraživanju sa rerank-om: {e}")
            return []
    
    def _to_native_types(self, obj):
        """Rekurzivno konvertuje numpy tipove u native Python tipove (float, int, list, dict)."""
        if isinstance(obj, dict):
            return {k: self._to_native_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._to_native_types(v) for v in obj]
        elif isinstance(obj, (np.generic, np.ndarray)):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            else:
                return obj.item()
        else:
            return obj
    
    async def generate_rag_response(self, query: str, context: str = "", max_results: int = 3, 
                            use_rerank: bool = True, session_id: str = None) -> Dict[str, Any]:
        """Generiše RAG odgovor sa chat istorijom podrškom i caching-om"""
        try:
            # Validacija input-a
            if not query or not query.strip():
                raise ValidationError("Upit ne može biti prazan", "RAG_EMPTY_QUERY")
            
            if max_results <= 0:
                raise ValidationError("max_results mora biti veći od 0", "RAG_INVALID_MAX_RESULTS")
            
            # Proveri cache prvo
            cache_key = f"{query}:{context}:{max_results}:{use_rerank}"
            cached_result = await get_cached_rag_result(query, context)
            
            if cached_result:
                print(f"Cache hit za upit: {query[:50]}...")
                return cached_result
            
            # Ako nema u cache-u, generiši novi odgovor
            print(f"Cache miss za upit: {query[:50]}...")
            
            # Pretraži dokumente
            search_results = self.search_documents(query, max_results * 2, use_rerank)
            if not search_results:
                result = self._generate_simple_response(query)
                # Cache-uj i jednostavan odgovor
                await set_cached_rag_result(query, result, context)
                return result
                
            # Pripremi kontekst iz dokumenata
            document_context = self._prepare_document_context(search_results[:max_results])
            
            # Kreiraj prompt
            prompt = self._create_rag_prompt(query, document_context, context)
            
            # Generiši odgovor
            try:
                response = self.ollama_client.generate(
                    model=self.model_name,
                    prompt=prompt,
                    stream=False
                )
                assistant_message = response['response']
            except Exception as e:
                raise ExternalServiceError(f"Greška pri komunikaciji sa Ollama: {str(e)}", "RAG_OLLAMA_ERROR")
            
            # Sačuvaj chat istoriju u Supabase ako je omogućen
            if self.use_supabase and session_id:
                try:
                    self._save_chat_history(session_id, query, assistant_message, search_results[:max_results])
                except Exception as e:
                    # Loguj grešku ali ne prekini izvršavanje
                    print(f"Greška pri čuvanju chat istorije: {e}")
            
            result = {
                'status': 'success',
                'response': assistant_message,
                'sources': search_results[:max_results],
                'query': query,
                'model': self.model_name,
                'context_length': len(document_context),
                'cached': False
            }
            
            # Cache-uj rezultat
            try:
                await set_cached_rag_result(query, result, context)
            except Exception as e:
                # Loguj grešku ali ne prekini izvršavanje
                print(f"Greška pri cache-ovanju rezultata: {e}")
            
            return self._to_native_types(result)
            
        except ValidationError:
            # Re-raise validation greške
            raise
        except ExternalServiceError:
            # Re-raise external service greške
            raise
        except Exception as e:
            # Podigni RAG grešku
            raise RAGError(f"Greška pri generisanju RAG odgovora: {str(e)}", "RAG_GENERATION_FAILED")
    
    def _save_chat_history(self, session_id: str, user_message: str, assistant_message: str, sources: List[Dict]):
        """Čuva chat istoriju u Supabase"""
        try:
            if not self.use_supabase or not self.supabase_manager:
                return
            
            # Pripremi sources za čuvanje
            sources_data = []
            for source in sources:
                sources_data.append({
                    'filename': source.get('filename', 'Unknown'),
                    'content': source.get('content', '')[:200] + '...' if len(source.get('content', '')) > 200 else source.get('content', ''),
                    'score': float(source.get('score', 0)),
                    'page': source.get('page', 1)
                })
            
            # Sačuvaj chat poruku
            self.supabase_manager.save_chat_message(
                session_id=session_id,
                user_message=user_message,
                assistant_message=assistant_message,
                sources=sources_data
            )
            
        except Exception as e:
            print(f"Greška pri čuvanju chat istorije: {e}")
    
    def _generate_simple_response(self, query: str) -> Dict[str, Any]:
        """Generiše jednostavan odgovor kada nema relevantnih dokumenata"""
        try:
            prompt = f"""Ti si AcAIA, AI learning assistant. Korisnik te je pitao: "{query}"

Pošto trenutno nemam pristup relevantnim dokumentima, odgovori na osnovu svojih opštih znanja.
Budi koristan i informativan, ali napomeni da ne možeš da pristupiš specifičnim dokumentima.

Odgovor:"""
            
            response = self.ollama_client.generate(
                model=self.model_name,
                prompt=prompt,
                stream=False
            )
            
            return {
                'status': 'success',
                'response': response['response'],
                'sources': [],
                'query': query,
                'model': self.model_name,
                'note': 'Nema relevantnih dokumenata - odgovor na osnovu opštih znanja'
            }
            
        except Exception as e:
            print(f"Greška pri generisanju jednostavnog odgovora: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'response': 'Izvinjavam se, došlo je do greške pri generisanju odgovora.'
            }
    
    def _create_rag_prompt(self, query: str, document_context: str, conversation_context: str = "") -> str:
        """Kreira prompt za RAG odgovor"""
        prompt = f"""Ti si AcAIA, napredni AI learning assistant koji koristi RAG (Retrieval-Augmented Generation) tehnologiju.

Tvoja uloga je da pružiš tačne, korisne i kontekstualno relevantne odgovore na osnovu dostupnih dokumenata.

Korisničko pitanje: {query}

{f"Kontekst prethodne konverzacije: {conversation_context}" if conversation_context else ""}

Relevantni dokumenti:
{document_context}

Uputstva:
1. Koristi informacije iz dokumenata za tačne odgovore
2. Ako dokumenti ne sadrže relevantne informacije, reci to jasno
3. Budi konkretan i koristan
4. Ako je potrebno, citiraj relevantne delove dokumenata
5. Odgovori na srpskom jeziku

Odgovor:"""
        
        return prompt
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """Lista svih dokumenata"""
        return self.vector_store.list_documents()
    
    def get_document_info(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Dohvata informacije o dokumentu"""
        return self.vector_store.get_document(doc_id)
    
    def delete_document(self, doc_id: str) -> bool:
        """Briše dokument"""
        return self.vector_store.delete_document(doc_id)
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvata statistike"""
        stats = self.vector_store.get_stats()
        stats['model_name'] = self.model_name
        stats['use_supabase'] = self.use_supabase
        return stats
    
    def test_connection(self) -> Dict[str, Any]:
        """Testira konekciju sa Ollama"""
        try:
            # Test Ollama konekcije
            models = self.ollama_client.list()
            available_models = [model['name'] for model in models['models']]
            
            # Test modela
            test_response = self.ollama_client.generate(
                model=self.model_name,
                prompt="Test konekcije",
                stream=False
            )
            
            return {
                'status': 'success',
                'ollama_connection': True,
                'model_available': True,
                'available_models': available_models,
                'current_model': self.model_name,
                'test_response': test_response['response'][:100] + '...' if len(test_response['response']) > 100 else test_response['response']
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'ollama_connection': False,
                'error': str(e)
            }
    
    async def generate_multi_step_rag_response(self, query: str, context: str = "", max_results: int = 3, 
                                        use_rerank: bool = True, session_id: str = None) -> Dict[str, Any]:
        """Generiše RAG odgovor koristeći multi-step retrieval sa caching-om"""
        try:
            # Proveri cache prvo
            cache_key = f"multistep:{query}:{context}:{max_results}:{use_rerank}"
            cached_result = await get_cached_rag_result(query, context)
            
            if cached_result:
                print(f"Cache hit za multi-step upit: {query[:50]}...")
                return cached_result
            
            # Ako nema u cache-u, generiši novi odgovor
            print(f"Cache miss za multi-step upit: {query[:50]}...")
            
            # Koristi multi-step retrieval
            retrieval_result = self.multi_step_retrieval.retrieve(query, max_results)
            if not retrieval_result['results']:
                result = self._generate_simple_response(query)
                # Cache-uj i jednostavan odgovor
                await set_cached_rag_result(query, result, context)
                return result
                
            # Pripremi kontekst
            document_context = self._prepare_document_context(retrieval_result['results'])
            # Kreiraj prompt
            prompt = self._create_rag_prompt(query, document_context, context)
            # Generiši odgovor
            response = self.ollama_client.generate(
                model=self.model_name,
                prompt=prompt,
                stream=False
            )
            assistant_message = response['response']
            # Sačuvaj chat istoriju i retrieval sesiju u Supabase
            if self.use_supabase and session_id:
                self._save_chat_history(session_id, query, assistant_message, retrieval_result['results'])
                self._save_retrieval_session(session_id, query, retrieval_result)
            result = {
                'status': 'success',
                'response': assistant_message,
                'sources': retrieval_result['results'],
                'query': query,
                'model': self.model_name,
                'retrieval_steps': retrieval_result['steps'],
                'context_length': len(document_context),
                'cached': False
            }
            
            # Cache-uj rezultat
            await set_cached_rag_result(query, result, context)
            
            return self._to_native_types(result)
        except Exception as e:
            print(f"Greška pri generisanju multi-step RAG odgovora: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'response': 'Izvinjavam se, došlo je do greške pri generisanju odgovora.'
            }
    
    def _save_retrieval_session(self, session_id: str, query: str, retrieval_result: Dict):
        """Čuva multi-step retrieval sesiju u Supabase"""
        try:
            if not self.use_supabase or not self.supabase_manager:
                return
            
            # Pripremi finalne rezultate
            final_results = []
            for result in retrieval_result['results']:
                final_results.append({
                    'filename': result.get('filename', 'Unknown'),
                    'content': result.get('content', '')[:200] + '...' if len(result.get('content', '')) > 200 else result.get('content', ''),
                    'score': float(result.get('score', 0)),
                    'page': result.get('page', 1)
                })
            
            # Sačuvaj retrieval sesiju
            self.supabase_manager.save_retrieval_session(
                session_id=session_id,
                query=query,
                steps=retrieval_result['steps'],
                final_results=final_results
            )
            
        except Exception as e:
            print(f"Greška pri čuvanju retrieval sesije: {e}")
    
    def _prepare_document_context(self, results: List[Dict[str, Any]]) -> str:
        """Priprema kontekst iz rezultata pretrage"""
        if not results:
            return "Nema dostupnih dokumenata."
        
        context_parts = []
        for i, result in enumerate(results, 1):
            filename = result.get('filename', 'Unknown')
            content = result.get('content', '')
            page = result.get('page', 1)
            score = result.get('score', 0)
            
            context_parts.append(f"""Dokument {i}: {filename} (strana {page}, relevantnost: {score:.2f})
Sadržaj: {content}
---""")
        
        return "\n".join(context_parts)
    
    def get_query_analytics(self, query: str) -> Dict[str, Any]:
        """Analizira upit i vraća informacije o tome"""
        try:
            # Osnovna analiza upita
            query_length = len(query)
            word_count = len(query.split())
            # Pretraži dokumente
            search_results = self.search_documents(query, 10, use_rerank=False)
            # Analiza rezultata
            if search_results:
                avg_score = float(sum(r.get('score', 0) for r in search_results) / len(search_results))
                max_score = float(max(r.get('score', 0) for r in search_results))
                min_score = float(min(r.get('score', 0) for r in search_results))
                # Analiza dokumenata
                document_types = {}
                for result in search_results:
                    filename = result.get('filename', 'Unknown')
                    ext = filename.split('.')[-1].lower() if '.' in filename else 'unknown'
                    document_types[ext] = document_types.get(ext, 0) + 1
            else:
                avg_score = max_score = min_score = 0.0
                document_types = {}
            # Multi-step analitika
            analytics = self.multi_step_retrieval.get_search_analytics(query)
            return {
                'query_length': query_length,
                'word_count': word_count,
                'results_count': len(search_results),
                'avg_score': avg_score,
                'max_score': max_score,
                'min_score': min_score,
                'document_types': document_types,
                'has_results': len(search_results) > 0,
                'is_complex': analytics.get('is_complex', False),
                'has_questions': analytics.get('has_questions', False),
                'concepts': analytics.get('concepts', []),
                'complexity_score': analytics.get('complexity_score', 0.0)
            }
        except Exception as e:
            print(f"Greška pri analizi upita: {e}")
            return {'error': str(e)}
    
    async def generate_enhanced_context_response(self, query: str, available_contexts: Dict[str, Any], 
                                                max_results: int = 5, session_id: str = None) -> Dict[str, Any]:
        """Generiše RAG odgovor koristeći enhanced context selection"""
        try:
            print(f"Enhanced context selection za upit: {query[:50]}...")
            
            # Korak 1: Izbor optimalnog konteksta
            context_selection = self.context_selector.select_context(query, available_contexts, max_results)
            
            if context_selection['status'] != 'success':
                # Fallback na običan RAG ako context selection ne uspe
                return await self.generate_multi_step_rag_response(query, "", max_results, True, session_id)
            
            selected_context = context_selection['selected_context']
            context_analysis = context_selection['context_analysis']
            
            # Korak 2: Multi-step retrieval sa odabranim kontekstom
            retrieval_result = self.multi_step_retrieval.multi_step_search(query, max_results, True)
            
            if not retrieval_result['results']:
                # Ako nema rezultata, koristi samo odabrani kontekst
                prompt = self._create_enhanced_prompt(query, selected_context)
                response = self.ollama_client.generate(
                    model=self.model_name,
                    prompt=prompt,
                    stream=False
                )
                assistant_message = response['response']
            else:
                # Kombinuj odabrani kontekst sa rezultatima pretrage
                document_context = self._prepare_document_context(retrieval_result['results'])
                combined_context = f"{selected_context}\n\nDokumenti:\n{document_context}"
                prompt = self._create_enhanced_prompt(query, combined_context)
                
                response = self.ollama_client.generate(
                    model=self.model_name,
                    prompt=prompt,
                    stream=False
                )
                assistant_message = response['response']
            
            # Korak 3: Sačuvaj rezultate
            if self.use_supabase and session_id:
                self._save_chat_history(session_id, query, assistant_message, retrieval_result.get('results', []))
                self._save_enhanced_context_session(session_id, query, context_selection, retrieval_result)
            
            # Korak 4: Pripremi response
            result = {
                'status': 'success',
                'response': assistant_message,
                'query': query,
                'model': self.model_name,
                'context_analysis': context_analysis,
                'context_selector_used': True,
                'selected_context_length': len(selected_context),
                'retrieval_results_count': len(retrieval_result.get('results', [])),
                'sources': retrieval_result.get('results', []),
                'retrieval_steps': retrieval_result.get('steps_used', 0),
                'query_type': retrieval_result.get('query_type', 'unknown')
            }
            
            return self._to_native_types(result)
            
        except Exception as e:
            print(f"Greška pri enhanced context response: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'response': 'Izvinjavam se, došlo je do greške pri generisanju odgovora.'
            }
    
    def _create_enhanced_prompt(self, query: str, context: str) -> str:
        """Kreira enhanced prompt sa naprednim kontekstom"""
        system_prompt = """Ti si AI Study Assistant, napredni asistent za učenje koji koristi različite izvore informacija za pružanje tačnih i korisnih odgovora.

Koristi sledeći kontekst za generisanje odgovora:
- Analiziraj sve dostupne informacije
- Poveži informacije iz različitih izvora
- Daj jasne i strukturirane odgovore
- Ako nema dovoljno informacija, reci to otvoreno
- Koristi srpski jezik za odgovore

Kontekst:
{context}

Korisnik: {query}

AI Study Assistant:"""
        
        return system_prompt.format(context=context, query=query)
    
    def _save_enhanced_context_session(self, session_id: str, query: str, context_selection: Dict, retrieval_result: Dict):
        """Čuva enhanced context sesiju u Supabase"""
        try:
            if not self.use_supabase or not self.supabase_manager:
                return
            
            # Pripremi podatke za čuvanje
            session_data = {
                'session_id': session_id,
                'query': query,
                'context_analysis': context_selection.get('context_analysis', {}),
                'context_candidates': context_selection.get('context_candidates', 0),
                'selected_candidates': context_selection.get('selected_candidates', 0),
                'retrieval_steps': retrieval_result.get('steps_used', 0),
                'query_type': retrieval_result.get('query_type', 'unknown'),
                'enhanced_context_used': True
            }
            
            # Sačuvaj u Supabase (možemo koristiti postojeću tabelu ili kreirati novu)
            print(f"Enhanced context sesija sačuvana za session_id: {session_id}")
            
        except Exception as e:
            print(f"Greška pri čuvanju enhanced context sesije: {e}")
    
    def get_context_selector_info(self) -> Dict[str, Any]:
        """Vraća informacije o context selector-u"""
        return {
            'max_context_length': self.context_selector.max_context_length,
            'min_relevance_score': self.context_selector.min_relevance_score,
            'context_overlap_threshold': self.context_selector.context_overlap_threshold,
            'context_types': self.context_selector.context_types,
            'description': 'Enhanced context selection sistem za pametni izbor konteksta'
        }
