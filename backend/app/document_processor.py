import os
import PyPDF2
from docx import Document
from typing import List, Dict, Any
import re
import unicodedata
from .config import Config

class DocumentProcessor:
    """Klasa za procesiranje dokumenata (PDF, DOCX)"""
    
    def __init__(self):
        self.supported_formats = Config.get_allowed_extensions()
    
    def process_document(self, file_path: str) -> Dict[str, Any]:
        """Procesira dokument i vraća ekstraktovani tekst i metapodatke"""
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension not in self.supported_formats:
            raise ValueError(f"Format {file_extension} nije podržan")
        
        if file_extension == '.pdf':
            return self._process_pdf(file_path)
        elif file_extension == '.docx':
            return self._process_docx(file_path)
        elif file_extension == '.txt':
            return self._process_txt(file_path)
    
    def _process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Procesira PDF dokument"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                text_content = []
                total_pages = len(pdf_reader.pages)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text.strip():
                        # Normalizuj tekst za bolje embedding
                        normalized_text = self._normalize_text_for_embedding(page_text)
                        text_content.append({
                            'page': page_num + 1,
                            'content': page_text.strip(),
                            'normalized_content': normalized_text,
                            'chunks': self._create_chunks(normalized_text, page_num + 1)
                        })
                
                return {
                    'filename': os.path.basename(file_path),
                    'file_type': 'pdf',
                    'total_pages': total_pages,
                    'pages': text_content,
                    'full_text': '\n\n'.join([page['content'] for page in text_content])
                }
        except Exception as e:
            raise Exception(f"Greška pri procesiranju PDF-a: {str(e)}")
    
    def _process_docx(self, file_path: str) -> Dict[str, Any]:
        """Procesira DOCX dokument"""
        try:
            doc = Document(file_path)
            
            text_content = []
            paragraphs = []
            
            for para in doc.paragraphs:
                if para.text.strip():
                    paragraphs.append(para.text.strip())
            
            # Razbijamo na stranice (simuliramo stranice)
            page_size = 1000  # karaktera po stranici
            current_page = []
            current_chars = 0
            page_num = 1
            
            for paragraph in paragraphs:
                if current_chars + len(paragraph) > page_size and current_page:
                    page_content = '\n'.join(current_page)
                    normalized_content = self._normalize_text_for_embedding(page_content)
                    text_content.append({
                        'page': page_num,
                        'content': page_content,
                        'normalized_content': normalized_content,
                        'chunks': self._create_chunks(normalized_content, page_num)
                    })
                    current_page = [paragraph]
                    current_chars = len(paragraph)
                    page_num += 1
                else:
                    current_page.append(paragraph)
                    current_chars += len(paragraph)
            
            # Dodaj poslednju stranicu
            if current_page:
                page_content = '\n'.join(current_page)
                normalized_content = self._normalize_text_for_embedding(page_content)
                text_content.append({
                    'page': page_num,
                    'content': page_content,
                    'normalized_content': normalized_content,
                    'chunks': self._create_chunks(normalized_content, page_num)
                })
            
            return {
                'filename': os.path.basename(file_path),
                'file_type': 'docx',
                'total_pages': len(text_content),
                'pages': text_content,
                'full_text': '\n\n'.join([page['content'] for page in text_content])
            }
        except Exception as e:
            raise Exception(f"Greška pri procesiranju DOCX-a: {str(e)}")
    
    def _process_txt(self, file_path: str) -> Dict[str, Any]:
        """Procesira TXT dokument"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Proveri da li je OCR tekst (sadrži OCR metadata)
            is_ocr_text = self._is_ocr_text(content)
            
            if is_ocr_text:
                # Posebna obrada za OCR tekst
                normalized_content = self._normalize_ocr_text(content)
            else:
                # Obična normalizacija
                normalized_content = self._normalize_text_for_embedding(content)
            
            chunks = self._create_chunks(normalized_content, 1)
            
            return {
                'filename': os.path.basename(file_path),
                'file_type': 'txt',
                'total_pages': 1,
                'pages': [{
                    'page': 1,
                    'content': content,
                    'normalized_content': normalized_content,
                    'chunks': chunks
                }],
                'full_text': content
            }
        except Exception as e:
            raise Exception(f"Greška pri procesiranju TXT-a: {str(e)}")
    
    def _is_ocr_text(self, text: str) -> bool:
        """Proverava da li je tekst OCR rezultat"""
        ocr_indicators = [
            'OCR rezultat',
            'Confidence:',
            'Jezici:',
            'srp, eng',
            'srp+eng'
        ]
        return any(indicator in text for indicator in ocr_indicators)
    
    def _normalize_ocr_text(self, text: str) -> str:
        """Normalizuje OCR tekst za bolje embedding"""
        # Razdvoji metadata od teksta
        lines = text.split('\n')
        metadata_end = 0
        
        for i, line in enumerate(lines):
            if line.startswith('-' * 50):
                metadata_end = i + 1
                break
        
        # Uzmi samo OCR tekst (nakon metadata)
        ocr_text = '\n'.join(lines[metadata_end:])
        
        # Normalizuj OCR tekst
        normalized = self._normalize_text_for_embedding(ocr_text)
        
        # Dodaj ključne reči iz metadata za bolje pretraživanje
        metadata_keywords = []
        for line in lines[:metadata_end]:
            if 'Confidence:' in line:
                confidence = re.search(r'Confidence: ([\d.]+)', line)
                if confidence:
                    metadata_keywords.append(f"confidence_{confidence.group(1)}")
            elif 'Jezici:' in line:
                languages = re.search(r'Jezici: (.+)', line)
                if languages:
                    lang_list = languages.group(1).split(', ')
                    metadata_keywords.extend(lang_list)
        
        # Dodaj ključne reči na početak
        if metadata_keywords:
            normalized = f"{' '.join(metadata_keywords)} {normalized}"
        
        return normalized
    
    def _normalize_text_for_embedding(self, text: str) -> str:
        """Normalizuje tekst za bolje embedding prepoznavanje"""
        # 1. Normalizuj Unicode karaktere
        text = unicodedata.normalize('NFKC', text)
        
        # 2. Zameni srpska slova sa latiničnim ekvivalentima za bolje embedding
        serbian_mapping = {
            'č': 'c', 'ć': 'c', 'đ': 'd', 'š': 's', 'ž': 'z',
            'Č': 'C', 'Ć': 'C', 'Đ': 'D', 'Š': 'S', 'Ž': 'Z'
        }
        
        for serbian, latin in serbian_mapping.items():
            text = text.replace(serbian, latin)
        
        # 3. Dodaj originalne srpske reči kao dodatne ključne reči
        original_words = text.split()
        serbian_words = [word for word in original_words if any(c in 'čćđšžČĆĐŠŽ' for c in word)]
        
        # 4. Normalizuj tekst
        text = self.clean_text(text)
        
        # 5. Dodaj originalne srpske reči na početak za bolje pretraživanje
        if serbian_words:
            text = f"{' '.join(serbian_words)} {text}"
        
        return text
    
    def _create_chunks(self, text: str, page_num: int, chunk_size: int = None, overlap: int = None) -> List[Dict[str, Any]]:
        """Kreira chunke teksta sa overlap-om"""
        # Koristi konfiguraciju ako nije prosleđeno
        if chunk_size is None:
            chunk_size = Config.RAG_CHUNK_SIZE
        if overlap is None:
            overlap = Config.RAG_CHUNK_OVERLAP
            
        chunks = []
        words = text.split()
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            if chunk_text.strip():
                chunks.append({
                    'id': f"page_{page_num}_chunk_{len(chunks) + 1}",
                    'content': chunk_text.strip(),
                    'page': page_num,
                    'start_word': i,
                    'end_word': min(i + chunk_size, len(words))
                })
        
        return chunks
    
    def clean_text(self, text: str) -> str:
        """Čisti tekst od nepotrebnih karaktera"""
        # Uklanja višestruke razmake
        text = re.sub(r'\s+', ' ', text)
        # Uklanja specijalne karaktere ali zadržava srpska slova
        text = re.sub(r'[^\w\sčćđšžČĆĐŠŽ.,!?;:()\[\]{}"\'-]', '', text)
        return text.strip() 