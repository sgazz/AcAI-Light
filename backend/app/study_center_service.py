"""
Study Center Service - Lokalna verzija
Upravlja study center funkcionalnostima bez Supabase integracije
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .config import Config

logger = logging.getLogger(__name__)

class StudyCenterService:
    """Study Center servis za lokalni storage"""
    
    def __init__(self):
        """Inicijalizuj Study Center servis"""
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'study_center')
        self.rooms_file = os.path.join(self.data_dir, 'rooms.json')
        self.sessions_file = os.path.join(self.data_dir, 'sessions.json')
        self.materials_file = os.path.join(self.data_dir, 'materials.json')
        
        # Kreiraj direktorijum ako ne postoji
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Učitaj postojeće podatke
        self.rooms = self._load_rooms()
        self.sessions = self._load_sessions()
        self.materials = self._load_materials()
    
    def _load_rooms(self) -> List[Dict[str, Any]]:
        """Učitaj sobe iz lokalnog storage-a"""
        try:
            if os.path.exists(self.rooms_file):
                with open(self.rooms_file, 'r', encoding='utf-8') as f:
                    rooms = json.load(f)
                logger.info(f"Učitano {len(rooms)} study soba")
                return rooms
            else:
                logger.info("Nema postojećih study soba")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju study soba: {e}")
            return []
    
    def _save_rooms(self):
        """Sačuvaj sobe u lokalni storage"""
        try:
            with open(self.rooms_file, 'w', encoding='utf-8') as f:
                json.dump(self.rooms, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.rooms)} study soba")
        except Exception as e:
            logger.error(f"Greška pri čuvanju study soba: {e}")
    
    def _load_sessions(self) -> List[Dict[str, Any]]:
        """Učitaj sesije iz lokalnog storage-a"""
        try:
            if os.path.exists(self.sessions_file):
                with open(self.sessions_file, 'r', encoding='utf-8') as f:
                    sessions = json.load(f)
                logger.info(f"Učitano {len(sessions)} study sesija")
                return sessions
            else:
                logger.info("Nema postojećih study sesija")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju study sesija: {e}")
            return []
    
    def _save_sessions(self):
        """Sačuvaj sesije u lokalni storage"""
        try:
            with open(self.sessions_file, 'w', encoding='utf-8') as f:
                json.dump(self.sessions, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.sessions)} study sesija")
        except Exception as e:
            logger.error(f"Greška pri čuvanju study sesija: {e}")
    
    def _load_materials(self) -> List[Dict[str, Any]]:
        """Učitaj materijale iz lokalnog storage-a"""
        try:
            if os.path.exists(self.materials_file):
                with open(self.materials_file, 'r', encoding='utf-8') as f:
                    materials = json.load(f)
                logger.info(f"Učitano {len(materials)} study materijala")
                return materials
            else:
                logger.info("Nema postojećih study materijala")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju study materijala: {e}")
            return []
    
    def _save_materials(self):
        """Sačuvaj materijale u lokalni storage"""
        try:
            with open(self.materials_file, 'w', encoding='utf-8') as f:
                json.dump(self.materials, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.materials)} study materijala")
        except Exception as e:
            logger.error(f"Greška pri čuvanju study materijala: {e}")
    
    def create_room(self, room_data: Dict[str, Any]) -> str:
        """Kreira novu study sobu"""
        try:
            room_id = f"room_{len(self.rooms)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            room = {
                'id': room_id,
                'name': room_data.get('name', 'Bez imena'),
                'description': room_data.get('description', ''),
                'subject': room_data.get('subject', 'Opšte'),
                'capacity': room_data.get('capacity', 10),
                'is_public': room_data.get('is_public', True),
                'created_by': room_data.get('created_by', 'system'),
                'tags': room_data.get('tags', []),
                'settings': room_data.get('settings', {}),
                'is_active': room_data.get('is_active', True),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': room_data.get('metadata', {})
            }
            
            self.rooms.append(room)
            self._save_rooms()
            
            logger.info(f"Study soba {room_id} uspešno kreirana")
            return room_id
                
        except Exception as e:
            logger.error(f"Greška pri kreiranju study sobe: {e}")
            raise
    
    def get_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati sobu po ID-u"""
        for room in self.rooms:
            if room['id'] == room_id:
                return room
        return None
    
    def update_room(self, room_id: str, update_data: Dict[str, Any]) -> bool:
        """Ažuriraj postojeću sobu"""
        try:
            for room in self.rooms:
                if room['id'] == room_id:
                    # Ažuriraj polja
                    for key, value in update_data.items():
                        if key in ['name', 'description', 'subject', 'capacity', 'is_public', 
                                 'tags', 'settings', 'is_active', 'metadata']:
                            room[key] = value
                    
                    room['updated_at'] = datetime.now().isoformat()
                    self._save_rooms()
                    
                    logger.info(f"Study soba {room_id} uspešno ažurirana")
                    return True
            
            logger.warning(f"Study soba {room_id} nije pronađena")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju study sobe: {e}")
            return False
    
    def delete_room(self, room_id: str) -> bool:
        """Obriši sobu"""
        try:
            for i, room in enumerate(self.rooms):
                if room['id'] == room_id:
                    removed_room = self.rooms.pop(i)
                    self._save_rooms()
                    
                    logger.info(f"Study soba {room_id} uspešno obrisana")
                    return True
            
            logger.warning(f"Study soba {room_id} nije pronađena")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri brisanju study sobe: {e}")
            return False
    
    def list_rooms(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Lista svih soba sa opcionim filterima"""
        try:
            rooms = self.rooms.copy()
            
            if filters:
                # Primeni filtere
                if 'subject' in filters:
                    rooms = [r for r in rooms if r.get('subject') == filters['subject']]
                
                if 'is_public' in filters:
                    rooms = [r for r in rooms if r.get('is_public') == filters['is_public']]
                
                if 'is_active' in filters:
                    rooms = [r for r in rooms if r.get('is_active') == filters['is_active']]
                
                if 'created_by' in filters:
                    rooms = [r for r in rooms if r.get('created_by') == filters['created_by']]
                
                if 'tags' in filters:
                    tag_filter = filters['tags']
                    if isinstance(tag_filter, list):
                        rooms = [r for r in rooms if any(tag in r.get('tags', []) for tag in tag_filter)]
                    else:
                        rooms = [r for r in rooms if tag_filter in r.get('tags', [])]
            
            # Sortiraj po datumu kreiranja (najnoviji prvi)
            rooms.sort(key=lambda x: x['created_at'], reverse=True)
            
            return rooms
            
        except Exception as e:
            logger.error(f"Greška pri listanju study soba: {e}")
            return []
    
    def create_session(self, session_data: Dict[str, Any]) -> str:
        """Kreira novu study sesiju"""
        try:
            session_id = f"session_{len(self.sessions)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            session = {
                'id': session_id,
                'room_id': session_data.get('room_id'),
                'title': session_data.get('title', 'Bez naslova'),
                'description': session_data.get('description', ''),
                'subject': session_data.get('subject', 'Opšte'),
                'start_time': session_data.get('start_time', datetime.now().isoformat()),
                'end_time': session_data.get('end_time'),
                'duration_minutes': session_data.get('duration_minutes', 60),
                'max_participants': session_data.get('max_participants', 10),
                'participants': session_data.get('participants', []),
                'materials': session_data.get('materials', []),
                'status': session_data.get('status', 'scheduled'),  # scheduled, active, completed, cancelled
                'created_by': session_data.get('created_by', 'system'),
                'notes': session_data.get('notes', ''),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': session_data.get('metadata', {})
            }
            
            self.sessions.append(session)
            self._save_sessions()
            
            logger.info(f"Study sesija {session_id} uspešno kreirana")
            return session_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju study sesije: {e}")
            raise
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati sesiju po ID-u"""
        for session in self.sessions:
            if session['id'] == session_id:
                return session
        return None
    
    def update_session(self, session_id: str, update_data: Dict[str, Any]) -> bool:
        """Ažuriraj postojeću sesiju"""
        try:
            for session in self.sessions:
                if session['id'] == session_id:
                    # Ažuriraj polja
                    for key, value in update_data.items():
                        if key in ['title', 'description', 'subject', 'start_time', 'end_time', 
                                 'duration_minutes', 'max_participants', 'participants', 'materials', 
                                 'status', 'notes', 'metadata']:
                            session[key] = value
                    
                    session['updated_at'] = datetime.now().isoformat()
                    self._save_sessions()
                    
                    logger.info(f"Study sesija {session_id} uspešno ažurirana")
                    return True
            
            logger.warning(f"Study sesija {session_id} nije pronađena")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju study sesije: {e}")
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """Obriši sesiju"""
        try:
            for i, session in enumerate(self.sessions):
                if session['id'] == session_id:
                    removed_session = self.sessions.pop(i)
                    self._save_sessions()
                    
                    logger.info(f"Study sesija {session_id} uspešno obrisana")
                    return True
            
            logger.warning(f"Study sesija {session_id} nije pronađena")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri brisanju study sesije: {e}")
            return False
    
    def list_sessions(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Lista svih sesija sa opcionim filterima"""
        try:
            sessions = self.sessions.copy()
            
            if filters:
                # Primeni filtere
                if 'room_id' in filters:
                    sessions = [s for s in sessions if s.get('room_id') == filters['room_id']]
                
                if 'subject' in filters:
                    sessions = [s for s in sessions if s.get('subject') == filters['subject']]
                
                if 'status' in filters:
                    sessions = [s for s in sessions if s.get('status') == filters['status']]
                
                if 'created_by' in filters:
                    sessions = [s for s in sessions if s.get('created_by') == filters['created_by']]
                
                if 'date_from' in filters:
                    date_from = datetime.fromisoformat(filters['date_from'])
                    sessions = [s for s in sessions if datetime.fromisoformat(s['start_time']) >= date_from]
                
                if 'date_to' in filters:
                    date_to = datetime.fromisoformat(filters['date_to'])
                    sessions = [s for s in sessions if datetime.fromisoformat(s['start_time']) <= date_to]
            
            # Sortiraj po vremenu početka (najnoviji prvi)
            sessions.sort(key=lambda x: x['start_time'], reverse=True)
            
            return sessions
            
        except Exception as e:
            logger.error(f"Greška pri listanju study sesija: {e}")
            return []
    
    def join_session(self, session_id: str, user_id: str) -> bool:
        """Pridruži se sesiji"""
        try:
            session = self.get_session(session_id)
            if not session:
                raise Exception(f"Sesija {session_id} nije pronađena")
            
            if session.get('status') != 'scheduled' and session.get('status') != 'active':
                raise Exception(f"Sesija {session_id} nije dostupna za pridruživanje")
            
            participants = session.get('participants', [])
            if user_id in participants:
                logger.warning(f"Korisnik {user_id} je već u sesiji {session_id}")
                return True
            
            max_participants = session.get('max_participants', 10)
            if len(participants) >= max_participants:
                raise Exception(f"Sesija {session_id} je puna")
            
            participants.append(user_id)
            self.update_session(session_id, {'participants': participants})
            
            logger.info(f"Korisnik {user_id} uspešno pridružen sesiji {session_id}")
            return True
                
        except Exception as e:
            logger.error(f"Greška pri pridruživanju sesiji: {e}")
            return False
    
    def leave_session(self, session_id: str, user_id: str) -> bool:
        """Napusti sesiju"""
        try:
            session = self.get_session(session_id)
            if not session:
                raise Exception(f"Sesija {session_id} nije pronađena")
            
            participants = session.get('participants', [])
            if user_id not in participants:
                logger.warning(f"Korisnik {user_id} nije u sesiji {session_id}")
                return True
            
            participants.remove(user_id)
            self.update_session(session_id, {'participants': participants})
            
            logger.info(f"Korisnik {user_id} uspešno napustio sesiju {session_id}")
            return True
                
        except Exception as e:
            logger.error(f"Greška pri napuštanju sesije: {e}")
            return False
    
    def create_material(self, material_data: Dict[str, Any]) -> str:
        """Kreira novi study materijal"""
        try:
            material_id = f"material_{len(self.materials)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            material = {
                'id': material_id,
                'title': material_data.get('title', 'Bez naslova'),
                'description': material_data.get('description', ''),
                'subject': material_data.get('subject', 'Opšte'),
                'type': material_data.get('type', 'document'),  # document, video, link, etc.
                'content': material_data.get('content', ''),
                'file_path': material_data.get('file_path', ''),
                'url': material_data.get('url', ''),
                'tags': material_data.get('tags', []),
                'difficulty': material_data.get('difficulty', 'medium'),
                'duration_minutes': material_data.get('duration_minutes', 0),
                'is_public': material_data.get('is_public', True),
                'created_by': material_data.get('created_by', 'system'),
                'is_active': material_data.get('is_active', True),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': material_data.get('metadata', {})
            }
            
            self.materials.append(material)
            self._save_materials()
            
            logger.info(f"Study materijal {material_id} uspešno kreiran")
            return material_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju study materijala: {e}")
            raise
    
    def get_material(self, material_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati materijal po ID-u"""
        for material in self.materials:
            if material['id'] == material_id:
                return material
        return None
    
    def list_materials(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Lista svih materijala sa opcionim filterima"""
        try:
            materials = self.materials.copy()
            
            if filters:
                # Primeni filtere
                if 'subject' in filters:
                    materials = [m for m in materials if m.get('subject') == filters['subject']]
                
                if 'type' in filters:
                    materials = [m for m in materials if m.get('type') == filters['type']]
                
                if 'difficulty' in filters:
                    materials = [m for m in materials if m.get('difficulty') == filters['difficulty']]
                
                if 'is_public' in filters:
                    materials = [m for m in materials if m.get('is_public') == filters['is_public']]
                
                if 'is_active' in filters:
                    materials = [m for m in materials if m.get('is_active') == filters['is_active']]
                
                if 'created_by' in filters:
                    materials = [m for m in materials if m.get('created_by') == filters['created_by']]
                
                if 'tags' in filters:
                    tag_filter = filters['tags']
                    if isinstance(tag_filter, list):
                        materials = [m for m in materials if any(tag in m.get('tags', []) for tag in tag_filter)]
                    else:
                        materials = [m for m in materials if tag_filter in m.get('tags', [])]
            
            # Sortiraj po datumu kreiranja (najnoviji prvi)
            materials.sort(key=lambda x: x['created_at'], reverse=True)
            
            return materials
            
        except Exception as e:
            logger.error(f"Greška pri listanju study materijala: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike study center sistema"""
        try:
            return {
                'total_rooms': len(self.rooms),
                'total_sessions': len(self.sessions),
                'total_materials': len(self.materials),
                'active_rooms': len([r for r in self.rooms if r.get('is_active', True)]),
                'active_sessions': len([s for s in self.sessions if s.get('status') in ['scheduled', 'active']]),
                'active_materials': len([m for m in self.materials if m.get('is_active', True)]),
                'sessions_by_status': {
                    'scheduled': len([s for s in self.sessions if s.get('status') == 'scheduled']),
                    'active': len([s for s in self.sessions if s.get('status') == 'active']),
                    'completed': len([s for s in self.sessions if s.get('status') == 'completed']),
                    'cancelled': len([s for s in self.sessions if s.get('status') == 'cancelled'])
                },
                'materials_by_type': {
                    'document': len([m for m in self.materials if m.get('type') == 'document']),
                    'video': len([m for m in self.materials if m.get('type') == 'video']),
                    'link': len([m for m in self.materials if m.get('type') == 'link'])
                },
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Greška pri dohvatanju study center statistika: {e}")
            return {}

# Globalna instanca
study_center_service = StudyCenterService() 