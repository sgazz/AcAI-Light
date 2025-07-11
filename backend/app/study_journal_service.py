"""
Study Journal Service - Lokalna verzija
Upravlja study journal entrijima bez Supabase integracije
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .config import Config

logger = logging.getLogger(__name__)

class StudyJournalService:
    """Study Journal servis za lokalni storage"""
    
    def __init__(self):
        """Inicijalizuj Study Journal servis"""
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'study_journal')
        self.entries_file = os.path.join(self.data_dir, 'entries.json')
        self.metadata_file = os.path.join(self.data_dir, 'metadata.json')
        
        # Kreiraj direktorijum ako ne postoji
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Učitaj postojeće entrije
        self.entries = self._load_entries()
    
    def _load_entries(self) -> List[Dict[str, Any]]:
        """Učitaj entrije iz lokalnog storage-a"""
        try:
            if os.path.exists(self.entries_file):
                with open(self.entries_file, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
                logger.info(f"Učitano {len(entries)} study journal entrija")
                return entries
            else:
                logger.info("Nema postojećih study journal entrija")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju study journal entrija: {e}")
            return []
    
    def _save_entries(self):
        """Sačuvaj entrije u lokalni storage"""
        try:
            with open(self.entries_file, 'w', encoding='utf-8') as f:
                json.dump(self.entries, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.entries)} study journal entrija")
        except Exception as e:
            logger.error(f"Greška pri čuvanju study journal entrija: {e}")
    
    def create_entry(self, entry_data: Dict[str, Any]) -> str:
        """Kreira novi study journal entry"""
        try:
            entry_id = f"entry_{len(self.entries)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            entry = {
                'id': entry_id,
                'title': entry_data.get('title', 'Bez naslova'),
                'content': entry_data.get('content', ''),
                'subject': entry_data.get('subject', 'Opšte'),
                'tags': entry_data.get('tags', []),
                'mood': entry_data.get('mood', 'neutral'),
                'study_time_minutes': entry_data.get('study_time_minutes', 0),
                'difficulty': entry_data.get('difficulty', 'medium'),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': entry_data.get('metadata', {})
            }
            
            self.entries.append(entry)
            self._save_entries()
            
            logger.info(f"Study journal entry {entry_id} uspešno kreiran")
            return entry_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju study journal entry-ja: {e}")
            raise
    
    def get_entry(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati entry po ID-u"""
        for entry in self.entries:
            if entry['id'] == entry_id:
                return entry
        return None
    
    def update_entry(self, entry_id: str, update_data: Dict[str, Any]) -> bool:
        """Ažuriraj postojeći entry"""
        try:
            for entry in self.entries:
                if entry['id'] == entry_id:
                    # Ažuriraj polja
                    for key, value in update_data.items():
                        if key in ['title', 'content', 'subject', 'tags', 'mood', 'study_time_minutes', 'difficulty', 'metadata']:
                            entry[key] = value
                    
                    entry['updated_at'] = datetime.now().isoformat()
                    self._save_entries()
                    
                    logger.info(f"Study journal entry {entry_id} uspešno ažuriran")
                    return True
            
            logger.warning(f"Study journal entry {entry_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju study journal entry-ja: {e}")
            return False
    
    def delete_entry(self, entry_id: str) -> bool:
        """Obriši entry"""
        try:
            for i, entry in enumerate(self.entries):
                if entry['id'] == entry_id:
                    removed_entry = self.entries.pop(i)
                    self._save_entries()
                    
                    logger.info(f"Study journal entry {entry_id} uspešno obrisan")
                    return True
            
            logger.warning(f"Study journal entry {entry_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri brisanju study journal entry-ja: {e}")
            return False
    
    def list_entries(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Lista svih entrija sa opcionim filterima"""
        try:
            entries = self.entries.copy()
            
            if filters:
                # Primeni filtere
                if 'subject' in filters:
                    entries = [e for e in entries if e.get('subject') == filters['subject']]
                
                if 'tags' in filters:
                    tag_filter = filters['tags']
                    if isinstance(tag_filter, list):
                        entries = [e for e in entries if any(tag in e.get('tags', []) for tag in tag_filter)]
                    else:
                        entries = [e for e in entries if tag_filter in e.get('tags', [])]
                
                if 'mood' in filters:
                    entries = [e for e in entries if e.get('mood') == filters['mood']]
                
                if 'difficulty' in filters:
                    entries = [e for e in entries if e.get('difficulty') == filters['difficulty']]
                
                if 'date_from' in filters:
                    date_from = datetime.fromisoformat(filters['date_from'])
                    entries = [e for e in entries if datetime.fromisoformat(e['created_at']) >= date_from]
                
                if 'date_to' in filters:
                    date_to = datetime.fromisoformat(filters['date_to'])
                    entries = [e for e in entries if datetime.fromisoformat(e['created_at']) <= date_to]
            
            # Sortiraj po datumu kreiranja (najnoviji prvi)
            entries.sort(key=lambda x: x['created_at'], reverse=True)
            
            return entries
            
        except Exception as e:
            logger.error(f"Greška pri listanju study journal entrija: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike study journal-a"""
        try:
            if not self.entries:
                return {
                    'total_entries': 0,
                    'total_study_time': 0,
                    'subjects': {},
                    'moods': {},
                    'difficulties': {},
                    'tags': {},
                    'last_entry': None
                }
            
            # Osnovne statistike
            total_entries = len(self.entries)
            total_study_time = sum(entry.get('study_time_minutes', 0) for entry in self.entries)
            
            # Statistike po kategorijama
            subjects = {}
            moods = {}
            difficulties = {}
            tags = {}
            
            for entry in self.entries:
                # Subjects
                subject = entry.get('subject', 'Opšte')
                subjects[subject] = subjects.get(subject, 0) + 1
                
                # Moods
                mood = entry.get('mood', 'neutral')
                moods[mood] = moods.get(mood, 0) + 1
                
                # Difficulties
                difficulty = entry.get('difficulty', 'medium')
                difficulties[difficulty] = difficulties.get(difficulty, 0) + 1
                
                # Tags
                for tag in entry.get('tags', []):
                    tags[tag] = tags.get(tag, 0) + 1
            
            # Najnoviji entry
            last_entry = max(self.entries, key=lambda x: x['created_at']) if self.entries else None
            
            return {
                'total_entries': total_entries,
                'total_study_time': total_study_time,
                'subjects': subjects,
                'moods': moods,
                'difficulties': difficulties,
                'tags': tags,
                'last_entry': last_entry['created_at'] if last_entry else None
            }
            
        except Exception as e:
            logger.error(f"Greška pri dohvatanju study journal statistika: {e}")
            return {}
    
    def search_entries(self, query: str) -> List[Dict[str, Any]]:
        """Pretraži entrije po tekstu"""
        try:
            query_lower = query.lower()
            results = []
            
            for entry in self.entries:
                # Pretraži u naslovu, sadržaju, tagovima i subject-u
                if (query_lower in entry.get('title', '').lower() or
                    query_lower in entry.get('content', '').lower() or
                    query_lower in entry.get('subject', '').lower() or
                    any(query_lower in tag.lower() for tag in entry.get('tags', []))):
                    results.append(entry)
            
            # Sortiraj po relevantnosti (jednostavna implementacija)
            results.sort(key=lambda x: x['created_at'], reverse=True)
            
            return results
            
        except Exception as e:
            logger.error(f"Greška pri pretraživanju study journal entrija: {e}")
            return []

# Globalna instanca
study_journal_service = StudyJournalService() 