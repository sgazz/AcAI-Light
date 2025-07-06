import os
import pytesseract
from PIL import Image
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
import logging
import hashlib
import asyncio
import aiofiles
import json
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from .error_handler import OCRError, ValidationError, ErrorCategory, ErrorSeverity

class OCRService:
    """Modularan OCR servis za ekstrakciju teksta iz slika sa performance optimizacijama"""
    
    def __init__(self, tesseract_path: Optional[str] = None, cache_dir: str = "ocr_cache"):
        self.logger = logging.getLogger(__name__)
        
        # Konfiguracija Tesseract putanje
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        else:
            # Auto-detect Tesseract putanju
            possible_paths = [
                '/opt/homebrew/bin/tesseract',  # macOS Homebrew
                '/usr/local/bin/tesseract',     # macOS
                '/usr/bin/tesseract',           # Linux
                'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'  # Windows
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    self.logger.info(f"Tesseract pronađen na: {path}")
                    break
            else:
                self.logger.warning("Tesseract nije pronađen. OCR možda neće raditi.")
        
        # Podržani formati slika
        self.supported_formats = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']
        
        # Podržani jezici
        self.supported_languages = ['srp', 'eng', 'srp+eng']
        
        # Cache konfiguracija
        self.cache_dir = cache_dir
        self.cache_ttl = timedelta(hours=24)  # Cache TTL
        self.cache_metadata_file = os.path.join(cache_dir, "cache_metadata.json")
        self._init_cache()
        
        # Thread pool za async processing
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Processing statistics
        self.stats = {
            'total_processed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'avg_processing_time': 0,
            'total_processing_time': 0
        }
    
    def _init_cache(self):
        """Inicijalizuje cache direktorijum"""
        try:
            os.makedirs(self.cache_dir, exist_ok=True)
            if not os.path.exists(self.cache_metadata_file):
                with open(self.cache_metadata_file, 'w') as f:
                    json.dump({}, f)
        except Exception as e:
            self.logger.error(f"Greška pri inicijalizaciji cache-a: {e}")
    
    def _get_cache_key(self, image_bytes: bytes, languages: List[str]) -> str:
        """Generiše cache key za sliku"""
        # Kombinuj image hash sa jezicima
        image_hash = hashlib.md5(image_bytes).hexdigest()
        lang_string = '+'.join(sorted(languages))
        return f"{image_hash}_{lang_string}"
    
    def _get_cache_path(self, cache_key: str) -> str:
        """Vraća putanju do cache fajla"""
        return os.path.join(self.cache_dir, f"{cache_key}.json")
    
    def _is_cache_valid(self, cache_path: str) -> bool:
        """Proverava da li je cache valid"""
        try:
            if not os.path.exists(cache_path):
                return False
            
            # Proveri TTL
            file_time = datetime.fromtimestamp(os.path.getmtime(cache_path))
            return datetime.now() - file_time < self.cache_ttl
        except Exception:
            return False
    
    def _load_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Učitava rezultat iz cache-a"""
        try:
            cache_path = self._get_cache_path(cache_key)
            if not self._is_cache_valid(cache_path):
                return None
            
            with open(cache_path, 'r', encoding='utf-8') as f:
                result = json.load(f)
                self.stats['cache_hits'] += 1
                self.logger.info(f"Cache hit za {cache_key}")
                return result
        except Exception as e:
            self.logger.warning(f"Greška pri učitavanju iz cache-a: {e}")
            return None
    
    def _save_to_cache(self, cache_key: str, result: Dict[str, Any]):
        """Čuva rezultat u cache"""
        try:
            cache_path = self._get_cache_path(cache_key)
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            # Ažuriraj metadata
            self._update_cache_metadata(cache_key, cache_path)
        except Exception as e:
            self.logger.warning(f"Greška pri čuvanju u cache: {e}")
    
    def _update_cache_metadata(self, cache_key: str, cache_path: str):
        """Ažurira cache metadata"""
        try:
            with open(self.cache_metadata_file, 'r') as f:
                metadata = json.load(f)
            
            metadata[cache_key] = {
                'path': cache_path,
                'created_at': datetime.now().isoformat(),
                'size': os.path.getsize(cache_path)
            }
            
            with open(self.cache_metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
        except Exception as e:
            self.logger.warning(f"Greška pri ažuriranju cache metadata: {e}")
    
    def _compress_image(self, image: np.ndarray, max_size: int = 2000) -> np.ndarray:
        """Kompresuje sliku ako je prevelika"""
        height, width = image.shape[:2]
        
        if width > max_size or height > max_size:
            # Izračunaj scale factor
            scale = min(max_size / width, max_size / height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            # Resize sliku
            if len(image.shape) == 3:
                compressed = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            else:
                compressed = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            self.logger.info(f"Slika kompresovana sa {width}x{height} na {new_width}x{new_height}")
            return compressed
        
        return image
    
    async def extract_text_async(self, image_bytes: bytes, filename: str, 
                                languages: List[str] = None) -> Dict[str, Any]:
        """Asinhrono ekstraktuje tekst iz slike"""
        try:
            # Proveri cache prvo
            if languages is None:
                languages = ['srp', 'eng']
            
            cache_key = self._get_cache_key(image_bytes, languages)
            cached_result = self._load_from_cache(cache_key)
            
            if cached_result:
                return cached_result
            
            # Ako nema u cache-u, procesiraj asinhrono
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._extract_text_sync,
                image_bytes,
                filename,
                languages
            )
            
            # Sačuvaj u cache
            self._save_to_cache(cache_key, result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Async OCR greška: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _extract_text_sync(self, image_bytes: bytes, filename: str, 
                          languages: List[str] = None) -> Dict[str, Any]:
        """Sinhrono ekstraktuje tekst iz slike (internal method)"""
        start_time = datetime.now()
        
        try:
            # Validacija input-a
            if not image_bytes:
                raise ValidationError("Image bytes ne može biti prazan", "OCR_EMPTY_BYTES")
            
            if not filename:
                raise ValidationError("Naziv fajla ne može biti prazan", "OCR_EMPTY_FILENAME")
            
            # Proveri da li je format podržan
            if not self.is_supported_format(filename):
                raise ValidationError(f"Format slike nije podržan: {filename}", "OCR_UNSUPPORTED_FORMAT")
            
            # Konvertuj bytes u numpy array
            try:
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                raise OCRError(f"Greška pri dekodiranju slike: {str(e)}", "OCR_DECODE_FAILED")
            
            if image is None:
                raise OCRError("Nije moguće dekodirati sliku", "OCR_DECODE_FAILED")
            
            # Kompresuj sliku ako je potrebno
            image = self._compress_image(image)
            
            # Primeni adaptive preprocessing
            processed_image = self._adaptive_preprocess_image(image)
            
            # Postavi jezike
            if languages is None:
                languages = ['srp', 'eng']
            
            # Validacija jezika
            for lang in languages:
                if lang not in self.supported_languages:
                    raise ValidationError(f"Jezik nije podržan: {lang}", "OCR_UNSUPPORTED_LANGUAGE")
            
            lang_string = '+'.join(languages)
            
            # OCR ekstrakcija sa multiple attempts
            text, confidence = self._extract_text_with_fallback(processed_image, lang_string)
            
            # Post-processing
            processed_text = self._post_process_text(text)
            
            # Izračunaj processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Ažuriraj statistike
            self._update_stats(processing_time)
            
            return {
                'status': 'success',
                'text': processed_text,
                'confidence': confidence,
                'languages': languages,
                'image_size': image.shape,
                'filename': filename,
                'processing_time': processing_time,
                'cache_key': self._get_cache_key(image_bytes, languages)
            }
            
        except ValidationError:
            raise
        except OCRError:
            raise
        except Exception as e:
            raise OCRError(f"Neočekivana OCR greška: {str(e)}", "OCR_UNEXPECTED_ERROR")
    
    def _adaptive_preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Adaptive preprocessing koji automatski odabira najbolje parametre
        """
        try:
            # Konvertuj u grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Analiziraj sliku za odabir najboljeg preprocessing-a
            image_analysis = self._analyze_image_quality(gray)
            
            # Primeni preprocessing na osnovu analize
            if image_analysis['noise_level'] > 0.3:
                # Visok nivo šuma - primeni agresivniji denoising
                gray = cv2.medianBlur(gray, 5)
                gray = cv2.bilateralFilter(gray, 9, 75, 75)
            else:
                # Nizak nivo šuma - blagi denoising
                gray = cv2.medianBlur(gray, 3)
            
            if image_analysis['contrast'] < 0.4:
                # Nizak kontrast - primeni contrast enhancement
                gray = cv2.equalizeHist(gray)
            
            if image_analysis['brightness'] < 0.3 or image_analysis['brightness'] > 0.7:
                # Ekstremna svetlost/tamnost - primeni adaptive thresholding
                thresh = cv2.adaptiveThreshold(
                    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
                )
            else:
                # Normalna svetlost - primeni Otsu thresholding
                _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Morphological operations za čišćenje
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # Deskew ako je potrebno
            if image_analysis['skew_angle'] > 2:
                cleaned = self._deskew_image(cleaned)
            
            return cleaned
            
        except Exception as e:
            self.logger.error(f"Adaptive preprocessing greška: {str(e)}")
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    def _analyze_image_quality(self, gray_image: np.ndarray) -> Dict[str, float]:
        """Analizira kvalitet slike za adaptive preprocessing"""
        try:
            # Noise level (varijansa)
            noise_level = np.var(gray_image) / 255.0
            
            # Contrast (standardna devijacija)
            contrast = np.std(gray_image) / 255.0
            
            # Brightness (prosečna vrednost)
            brightness = np.mean(gray_image) / 255.0
            
            # Skew detection
            skew_angle = self._detect_skew_angle(gray_image)
            
            return {
                'noise_level': noise_level,
                'contrast': contrast,
                'brightness': brightness,
                'skew_angle': skew_angle
            }
        except Exception as e:
            self.logger.error(f"Image quality analysis greška: {str(e)}")
            return {
                'noise_level': 0.5,
                'contrast': 0.5,
                'brightness': 0.5,
                'skew_angle': 0
            }
    
    def _detect_skew_angle(self, image: np.ndarray) -> float:
        """Detektuje ugao nagnutosti teksta"""
        try:
            # Detektuj linije teksta
            edges = cv2.Canny(image, 50, 150, apertureSize=3)
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            if lines is None:
                return 0.0
            
            angles = []
            for rho, theta in lines[:10]:  # Uzmi prvih 10 linija
                angle = theta * 180 / np.pi
                if angle < 45 or angle > 135:
                    angles.append(angle)
            
            if angles:
                return np.mean(angles) - 90
            else:
                return 0.0
                
        except Exception as e:
            self.logger.error(f"Skew detection greška: {str(e)}")
            return 0.0
    
    def _extract_text_with_fallback(self, image: np.ndarray, lang_string: str) -> tuple:
        """Ekstraktuje tekst sa fallback strategijama"""
        try:
            # Prvi pokušaj - standardni OCR
            text = pytesseract.image_to_string(image, lang=lang_string)
            confidence = self._get_confidence(image, lang_string)
            
            # Ako je confidence nizak, probaj sa različitim PSM modovima
            if confidence < 50:
                psm_modes = [6, 8, 13]  # Različiti PSM modovi
                best_text = text
                best_confidence = confidence
                
                for psm in psm_modes:
                    try:
                        config = f'--psm {psm}'
                        alt_text = pytesseract.image_to_string(image, lang=lang_string, config=config)
                        alt_confidence = self._get_confidence(image, lang_string, config)
                        
                        if alt_confidence > best_confidence:
                            best_text = alt_text
                            best_confidence = alt_confidence
                    except Exception as e:
                        self.logger.warning(f"PSM {psm} greška: {e}")
                        continue
                
                text = best_text
                confidence = best_confidence
            
            return text, confidence
            
        except Exception as e:
            self.logger.error(f"Text extraction fallback greška: {str(e)}")
            return "", 0.0
    
    def _post_process_text(self, text: str) -> str:
        """Post-processing teksta za bolje rezultate"""
        try:
            if not text:
                return text
            
            # Ukloni višestruke praznine
            text = ' '.join(text.split())
            
            # Ispravi česte OCR greške
            text = self._fix_common_ocr_errors(text)
            
            # Normalizuj interpunkciju
            text = self._normalize_punctuation(text)
            
            return text.strip()
            
        except Exception as e:
            self.logger.error(f"Post-processing greška: {str(e)}")
            return text
    
    def _fix_common_ocr_errors(self, text: str) -> str:
        """Ispravlja česte OCR greške"""
        # Česte zamene karaktera
        replacements = {
            '0': 'O',  # Nula kao slovo O
            '1': 'l',  # Jedan kao malo l
            '5': 'S',  # Pet kao slovo S
            '8': 'B',  # Osam kao slovo B
            '|': 'l',  # Vertikalna linija kao l
            'l': '1',  # Malo l kao jedan (u kontekstu brojeva)
        }
        
        # Primeni zamene samo u odgovarajućim kontekstima
        words = text.split()
        corrected_words = []
        
        for word in words:
            # Ako je reč broj, ne menjaj je
            if word.isdigit():
                corrected_words.append(word)
                continue
            
            # Ako je reč slovo, primeni zamene
            corrected_word = word
            for old, new in replacements.items():
                corrected_word = corrected_word.replace(old, new)
            
            corrected_words.append(corrected_word)
        
        return ' '.join(corrected_words)
    
    def _normalize_punctuation(self, text: str) -> str:
        """Normalizuje interpunkciju"""
        # Zamena višestrukih tačaka
        text = text.replace('...', '…')
        text = text.replace('..', '.')
        
        # Zamena višestrukih upitnika/uzvika
        text = text.replace('???', '?')
        text = text.replace('!!!', '!')
        
        # Dodaj razmak nakon tačke ako ga nema
        text = text.replace('.', '. ')
        text = text.replace('?', '? ')
        text = text.replace('!', '! ')
        
        return text
    
    def _update_stats(self, processing_time: float):
        """Ažurira OCR statistike"""
        self.stats['total_processed'] += 1
        self.stats['total_processing_time'] += processing_time
        self.stats['avg_processing_time'] = (
            self.stats['total_processing_time'] / self.stats['total_processed']
        )
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Vraća cache statistike"""
        try:
            cache_size = 0
            cache_count = 0
            
            if os.path.exists(self.cache_dir):
                for filename in os.listdir(self.cache_dir):
                    if filename.endswith('.json'):
                        filepath = os.path.join(self.cache_dir, filename)
                        cache_size += os.path.getsize(filepath)
                        cache_count += 1
            
            return {
                'cache_size_mb': cache_size / (1024 * 1024),
                'cache_count': cache_count,
                'cache_hits': self.stats['cache_hits'],
                'cache_misses': self.stats['cache_misses'],
                'hit_rate': (
                    self.stats['cache_hits'] / 
                    (self.stats['cache_hits'] + self.stats['cache_misses'])
                    if (self.stats['cache_hits'] + self.stats['cache_misses']) > 0 else 0
                )
            }
        except Exception as e:
            self.logger.error(f"Cache stats greška: {str(e)}")
            return {}
    
    def clear_cache(self, older_than_hours: int = 24):
        """Briše stari cache"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
            cleared_count = 0
            
            if os.path.exists(self.cache_dir):
                for filename in os.listdir(self.cache_dir):
                    if filename.endswith('.json'):
                        filepath = os.path.join(self.cache_dir, filename)
                        file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                        
                        if file_time < cutoff_time:
                            os.remove(filepath)
                            cleared_count += 1
            
            self.logger.info(f"Obrisano {cleared_count} cache fajlova")
            return cleared_count
            
        except Exception as e:
            self.logger.error(f"Cache clearing greška: {str(e)}")
            return 0
    
    def get_supported_formats(self) -> List[str]:
        """Vraća listu podržanih formata slika"""
        return self.supported_formats.copy()
    
    def get_supported_languages(self) -> List[str]:
        """Vraća listu podržanih jezika"""
        return self.supported_languages.copy()
    
    def is_supported_format(self, filename: str) -> bool:
        """Proverava da li je format slike podržan"""
        if not filename:
            return False
        extension = os.path.splitext(filename.lower())[1]
        return extension in self.supported_formats
    
    def extract_text(self, image_path: str, languages: List[str] = None) -> Dict[str, Any]:
        """
        Ekstraktuje tekst iz slike
        
        Args:
            image_path: Putanja do slike
            languages: Lista jezika za OCR (default: ['srp', 'eng'])
        
        Returns:
            Dict sa rezultatima OCR-a
        """
        try:
            # Validacija input-a
            if not image_path:
                raise ValidationError("Putanja do slike ne može biti prazna", "OCR_EMPTY_PATH")
            
            if not os.path.exists(image_path):
                raise ValidationError(f"Slike ne postoji: {image_path}", "OCR_FILE_NOT_FOUND")
            
            # Proveri da li je format podržan
            if not self.is_supported_format(image_path):
                raise ValidationError(f"Format slike nije podržan: {image_path}", "OCR_UNSUPPORTED_FORMAT")
            
            # Učitaj sliku
            image = cv2.imread(image_path)
            if image is None:
                raise OCRError(f"Nije moguće učitati sliku: {image_path}", "OCR_LOAD_FAILED")
            
            # Preprocessing za bolji OCR
            processed_image = self._preprocess_image(image)
            
            # Postavi jezike
            if languages is None:
                languages = ['srp', 'eng']
            
            # Validacija jezika
            for lang in languages:
                if lang not in self.supported_languages:
                    raise ValidationError(f"Jezik nije podržan: {lang}", "OCR_UNSUPPORTED_LANGUAGE")
            
            # Kombinuj jezike za Tesseract
            lang_string = '+'.join(languages)
            
            # OCR ekstrakcija
            try:
                text = pytesseract.image_to_string(processed_image, lang=lang_string)
            except Exception as e:
                raise OCRError(f"Greška pri OCR ekstrakciji: {str(e)}", "OCR_EXTRACTION_FAILED")
            
            # Dobavi confidence score
            confidence = self._get_confidence(processed_image, lang_string)
            
            # Dobavi bounding boxes za debugging
            try:
                boxes = pytesseract.image_to_boxes(processed_image, lang=lang_string)
            except Exception as e:
                self.logger.warning(f"Greška pri dobavljanju bounding boxes: {e}")
                boxes = ""
            
            return {
                'status': 'success',
                'text': text.strip(),
                'confidence': confidence,
                'languages': languages,
                'image_size': image.shape,
                'boxes': boxes,
                'processed_image_path': self._save_processed_image(processed_image, image_path)
            }
            
        except ValidationError:
            # Re-raise validation greške
            raise
        except OCRError:
            # Re-raise OCR greške
            raise
        except Exception as e:
            # Podigni OCR grešku
            raise OCRError(f"Neočekivana OCR greška: {str(e)}", "OCR_UNEXPECTED_ERROR")
    
    def extract_text_from_bytes(self, image_bytes: bytes, filename: str, languages: List[str] = None) -> Dict[str, Any]:
        """
        Ekstraktuje tekst iz image bytes
        
        Args:
            image_bytes: Bytes slike
            filename: Naziv fajla (za detekciju formata)
            languages: Lista jezika za OCR
        
        Returns:
            Dict sa rezultatima OCR-a
        """
        try:
            # Validacija input-a
            if not image_bytes:
                raise ValidationError("Image bytes ne može biti prazan", "OCR_EMPTY_BYTES")
            
            if not filename:
                raise ValidationError("Naziv fajla ne može biti prazan", "OCR_EMPTY_FILENAME")
            
            # Proveri da li je format podržan
            if not self.is_supported_format(filename):
                raise ValidationError(f"Format slike nije podržan: {filename}", "OCR_UNSUPPORTED_FORMAT")
            
            # Konvertuj bytes u numpy array
            try:
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                raise OCRError(f"Greška pri dekodiranju slike: {str(e)}", "OCR_DECODE_FAILED")
            
            if image is None:
                raise OCRError("Nije moguće dekodirati sliku", "OCR_DECODE_FAILED")
            
            # Preprocessing
            processed_image = self._preprocess_image(image)
            
            # Postavi jezike
            if languages is None:
                languages = ['srp', 'eng']
            
            # Validacija jezika
            for lang in languages:
                if lang not in self.supported_languages:
                    raise ValidationError(f"Jezik nije podržan: {lang}", "OCR_UNSUPPORTED_LANGUAGE")
            
            lang_string = '+'.join(languages)
            
            # OCR ekstrakcija
            try:
                text = pytesseract.image_to_string(processed_image, lang=lang_string)
                confidence = self._get_confidence(processed_image, lang_string)
            except Exception as e:
                raise OCRError(f"Greška pri OCR ekstrakciji: {str(e)}", "OCR_EXTRACTION_FAILED")
            
            return {
                'status': 'success',
                'text': text.strip(),
                'confidence': confidence,
                'languages': languages,
                'image_size': image.shape,
                'filename': filename
            }
            
        except ValidationError:
            # Re-raise validation greške
            raise
        except OCRError:
            # Re-raise OCR greške
            raise
        except Exception as e:
            # Podigni OCR grešku
            raise OCRError(f"Neočekivana OCR greška: {str(e)}", "OCR_UNEXPECTED_ERROR")
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocessing slike za bolji OCR
        
        Args:
            image: Input slika kao numpy array
        
        Returns:
            Preprocessed slika
        """
        try:
            # Konvertuj u grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Noise reduction
            denoised = cv2.medianBlur(gray, 3)
            
            # Adaptive thresholding za bolje rezultate
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Dodatno čišćenje
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
            
        except Exception as e:
            self.logger.error(f"Preprocessing greška: {str(e)}")
            # Vrati original ako preprocessing ne uspe
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    def _get_confidence(self, image: np.ndarray, lang: str) -> float:
        """
        Računa prosečni confidence score za OCR
        
        Args:
            image: Preprocessed slika
            lang: Jezik za OCR
        
        Returns:
            Prosečni confidence score (0-100)
        """
        try:
            data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            
            if confidences:
                return sum(confidences) / len(confidences)
            else:
                return 0.0
                
        except Exception as e:
            self.logger.error(f"Confidence greška: {str(e)}")
            return 0.0
    
    def _save_processed_image(self, processed_image: np.ndarray, original_path: str) -> Optional[str]:
        """
        Čuva processed sliku za debugging
        
        Args:
            processed_image: Preprocessed slika
            original_path: Putanja originalne slike
        
        Returns:
            Putanja do sačuvane processed slike ili None
        """
        try:
            # Kreiraj debug direktorijum
            debug_dir = os.path.join(os.path.dirname(original_path), 'debug')
            os.makedirs(debug_dir, exist_ok=True)
            
            # Generiši naziv fajla
            base_name = os.path.splitext(os.path.basename(original_path))[0]
            debug_path = os.path.join(debug_dir, f"{base_name}_processed.png")
            
            # Sačuvaj processed sliku
            cv2.imwrite(debug_path, processed_image)
            
            return debug_path
            
        except Exception as e:
            self.logger.error(f"Greška pri čuvanju processed slike: {str(e)}")
            return None
    
    def get_ocr_info(self) -> Dict[str, Any]:
        """
        Vraća informacije o OCR servisu
        
        Returns:
            Dict sa informacijama o OCR servisu
        """
        try:
            # Proveri Tesseract verziju
            version = pytesseract.get_tesseract_version()
            
            return {
                'status': 'success',
                'tesseract_version': str(version),
                'tesseract_path': pytesseract.pytesseract.tesseract_cmd,
                'supported_formats': self.supported_formats,
                'supported_languages': self.supported_languages,
                'available_languages': pytesseract.get_languages()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Greška pri dobavljanju OCR info: {str(e)}'
            }
    
    def extract_text_batch(self, image_paths: List[str], languages: List[str] = None) -> List[Dict[str, Any]]:
        """
        Ekstraktuje tekst iz više slika odjednom
        
        Args:
            image_paths: Lista putanja do slika
            languages: Lista jezika za OCR
        
        Returns:
            Lista rezultata OCR-a za svaku sliku
        """
        results = []
        
        for image_path in image_paths:
            try:
                result = self.extract_text(image_path, languages)
                results.append({
                    'image_path': image_path,
                    'result': result
                })
            except Exception as e:
                results.append({
                    'image_path': image_path,
                    'result': {
                        'status': 'error',
                        'message': str(e)
                    }
                })
        
        return results
    
    def extract_text_with_confidence_filter(self, image_path: str, min_confidence: float = 50.0, 
                                          languages: List[str] = None) -> Dict[str, Any]:
        """
        Ekstraktuje tekst sa filterom za minimalni confidence score
        
        Args:
            image_path: Putanja do slike
            min_confidence: Minimalni confidence score (0-100)
            languages: Lista jezika za OCR
        
        Returns:
            Dict sa rezultatima OCR-a
        """
        result = self.extract_text(image_path, languages)
        
        if result['status'] == 'success':
            if result['confidence'] < min_confidence:
                result['status'] = 'low_confidence'
                result['message'] = f'Confidence score ({result["confidence"]:.1f}%) je ispod minimuma ({min_confidence}%)'
        
        return result
    
    def extract_text_with_preprocessing_options(self, image_path: str, 
                                              preprocessing_options: Dict[str, bool] = None,
                                              languages: List[str] = None) -> Dict[str, Any]:
        """
        Ekstraktuje tekst sa opcijama za preprocessing
        
        Args:
            image_path: Putanja do slike
            preprocessing_options: Opcije za preprocessing
            languages: Lista jezika za OCR
        
        Returns:
            Dict sa rezultatima OCR-a
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'status': 'error',
                    'message': f'Slike ne postoji: {image_path}'
                }
            
            # Učitaj sliku
            image = cv2.imread(image_path)
            if image is None:
                return {
                    'status': 'error',
                    'message': f'Nije moguće učitati sliku: {image_path}'
                }
            
            # Primeni custom preprocessing
            processed_image = self._custom_preprocess_image(image, preprocessing_options or {})
            
            # Postavi jezike
            if languages is None:
                languages = ['srp', 'eng']
            
            lang_string = '+'.join(languages)
            
            # OCR ekstrakcija
            text = pytesseract.image_to_string(processed_image, lang=lang_string)
            confidence = self._get_confidence(processed_image, lang_string)
            
            return {
                'status': 'success',
                'text': text.strip(),
                'confidence': confidence,
                'languages': languages,
                'image_size': image.shape,
                'preprocessing_applied': preprocessing_options
            }
            
        except Exception as e:
            self.logger.error(f"OCR greška za {image_path}: {str(e)}")
            return {
                'status': 'error',
                'message': f'OCR greška: {str(e)}'
            }
    
    def _custom_preprocess_image(self, image: np.ndarray, options: Dict[str, bool]) -> np.ndarray:
        """
        Custom preprocessing sa opcijama
        
        Args:
            image: Input slika
            options: Preprocessing opcije
        
        Returns:
            Preprocessed slika
        """
        try:
            # Konvertuj u grayscale
            if options.get('grayscale', True):
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Noise reduction
            if options.get('denoise', True):
                gray = cv2.medianBlur(gray, 3)
            
            # Adaptive thresholding
            if options.get('adaptive_threshold', True):
                gray = cv2.adaptiveThreshold(
                    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
                )
            
            # Morphological operations
            if options.get('morphology', True):
                kernel = np.ones((1, 1), np.uint8)
                gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
            
            # Deskew (rotacija)
            if options.get('deskew', False):
                gray = self._deskew_image(gray)
            
            # Resize
            if options.get('resize', False):
                height, width = gray.shape
                if width > 2000:  # Ako je slika prevelika
                    scale = 2000 / width
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    gray = cv2.resize(gray, (new_width, new_height))
            
            return gray
            
        except Exception as e:
            self.logger.error(f"Custom preprocessing greška: {str(e)}")
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    def _deskew_image(self, image: np.ndarray) -> np.ndarray:
        """
        Rotira sliku da ispravi nagnutost teksta
        
        Args:
            image: Input slika
        
        Returns:
            Deskewed slika
        """
        try:
            # Detektuj ugao rotacije
            coords = np.column_stack(np.where(image > 0))
            angle = cv2.minAreaRect(coords)[-1]
            
            # Ako je ugao manji od -45, rotiraj za 90 stepeni
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            
            # Rotiraj sliku
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            
            return rotated
            
        except Exception as e:
            self.logger.error(f"Deskew greška: {str(e)}")
            return image
    
    def get_ocr_statistics(self) -> Dict[str, Any]:
        """
        Vraća statistike OCR servisa
        
        Returns:
            Dict sa OCR statistikama
        """
        try:
            return {
                'status': 'success',
                'tesseract_version': pytesseract.get_tesseract_version(),
                'tesseract_path': pytesseract.pytesseract.tesseract_cmd,
                'supported_formats': self.supported_formats,
                'supported_languages': self.supported_languages,
                'available_languages': pytesseract.get_languages(),
                'total_available_languages': len(pytesseract.get_languages()),
                'ocr_capabilities': {
                    'batch_processing': True,
                    'confidence_filtering': True,
                    'custom_preprocessing': True,
                    'deskew': True,
                    'image_resize': True
                }
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Greška pri dobavljanju OCR statistika: {str(e)}'
            } 