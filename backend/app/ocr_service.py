import os
import pytesseract
from PIL import Image
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
import logging

class OCRService:
    """Modularan OCR servis za ekstrakciju teksta iz slika"""
    
    def __init__(self, tesseract_path: Optional[str] = None):
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
    
    def get_supported_formats(self) -> List[str]:
        """Vraća listu podržanih formata slika"""
        return self.supported_formats.copy()
    
    def get_supported_languages(self) -> List[str]:
        """Vraća listu podržanih jezika"""
        return self.supported_languages.copy()
    
    def is_supported_format(self, filename: str) -> bool:
        """Proverava da li je format slike podržan"""
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
            
            # Preprocessing za bolji OCR
            processed_image = self._preprocess_image(image)
            
            # Postavi jezike
            if languages is None:
                languages = ['srp', 'eng']
            
            # Kombinuj jezike za Tesseract
            lang_string = '+'.join(languages)
            
            # OCR ekstrakcija
            text = pytesseract.image_to_string(processed_image, lang=lang_string)
            
            # Dobavi confidence score
            confidence = self._get_confidence(processed_image, lang_string)
            
            # Dobavi bounding boxes za debugging
            boxes = pytesseract.image_to_boxes(processed_image, lang=lang_string)
            
            return {
                'status': 'success',
                'text': text.strip(),
                'confidence': confidence,
                'languages': languages,
                'image_size': image.shape,
                'boxes': boxes,
                'processed_image_path': self._save_processed_image(processed_image, image_path)
            }
            
        except Exception as e:
            self.logger.error(f"OCR greška za {image_path}: {str(e)}")
            return {
                'status': 'error',
                'message': f'OCR greška: {str(e)}'
            }
    
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
            # Konvertuj bytes u numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {
                    'status': 'error',
                    'message': 'Nije moguće dekodirati sliku'
                }
            
            # Preprocessing
            processed_image = self._preprocess_image(image)
            
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
                'filename': filename
            }
            
        except Exception as e:
            self.logger.error(f"OCR greška za bytes: {str(e)}")
            return {
                'status': 'error',
                'message': f'OCR greška: {str(e)}'
            }
    
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