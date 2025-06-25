import os
import PyPDF2
from docx import Document
from typing import List, Dict, Any
import re

class DocumentProcessor:
    """Klasa za procesiranje dokumenata (PDF, DOCX)"""
    
    def __init__(self):
        self.supported_formats = ['.pdf', '.docx', '.txt']
    
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
                        text_content.append({
                            'page': page_num + 1,
                            'content': page_text.strip(),
                            'chunks': self._create_chunks(page_text, page_num + 1)
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
                    text_content.append({
                        'page': page_num,
                        'content': '\n'.join(current_page),
                        'chunks': self._create_chunks('\n'.join(current_page), page_num)
                    })
                    current_page = [paragraph]
                    current_chars = len(paragraph)
                    page_num += 1
                else:
                    current_page.append(paragraph)
                    current_chars += len(paragraph)
            
            # Dodaj poslednju stranicu
            if current_page:
                text_content.append({
                    'page': page_num,
                    'content': '\n'.join(current_page),
                    'chunks': self._create_chunks('\n'.join(current_page), page_num)
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
            
            chunks = self._create_chunks(content, 1)
            
            return {
                'filename': os.path.basename(file_path),
                'file_type': 'txt',
                'total_pages': 1,
                'pages': [{
                    'page': 1,
                    'content': content,
                    'chunks': chunks
                }],
                'full_text': content
            }
        except Exception as e:
            raise Exception(f"Greška pri procesiranju TXT-a: {str(e)}")
    
    def _create_chunks(self, text: str, page_num: int, chunk_size: int = 500, overlap: int = 50) -> List[Dict[str, Any]]:
        """Kreira chunke teksta sa overlap-om"""
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