"""
SQLite Database Manager za AcAIA projekat
Upravlja konekcijom sa SQLite bazom podataka i operacijama sa tabelama
"""

import sqlite3
import json
import logging
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import uuid
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """SQLite Database Manager klasa"""
    
    def __init__(self, db_path: str = "data/acaia.db"):
        """
        Inicijalizuj Database Manager
        
        Args:
            db_path: Putanja do SQLite baze podataka
        """
        self.db_path = db_path
        self._ensure_data_directory()
        self._init_database()
    
    def _ensure_data_directory(self):
        """Osiguraj da data direktorijum postoji"""
        data_dir = os.path.dirname(self.db_path)
        if data_dir and not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)
            logger.info(f"Kreiran data direktorijum: {data_dir}")
    
    def _init_database(self):
        """Inicijalizuj bazu podataka sa tabelama"""
        try:
            with self.get_connection() as conn:
                # Kreiraj osnovne tabele direktno
                self._create_tables(conn)
                conn.commit()
                logger.info("Baza podataka uspešno inicijalizovana")
                    
        except Exception as e:
            logger.error(f"Greška pri inicijalizaciji baze podataka: {e}")
            raise
    
    def _create_tables(self, conn):
        """Kreira osnovne tabele"""
        # Sessions tabela
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                description TEXT,
                user_id VARCHAR(255) DEFAULT 'default_user',
                is_archived BOOLEAN DEFAULT 0,
                archived_at DATETIME,
                archived_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Chat history tabela
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id VARCHAR(255) NOT NULL,
                message_id VARCHAR(255) UNIQUE NOT NULL,
                sender VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                sources TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
            )
        """)
        
        # Documents tabela
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id VARCHAR(255) UNIQUE NOT NULL,
                filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                file_size BIGINT NOT NULL,
                content TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Cache tabela
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key VARCHAR(255) UNIQUE NOT NULL,
                cache_value TEXT NOT NULL,
                cache_type VARCHAR(50) DEFAULT 'general',
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Analytics tabela
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type VARCHAR(100) NOT NULL,
                event_data TEXT,
                user_id VARCHAR(255),
                session_id VARCHAR(255),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Indeksi
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_document_id ON documents(document_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cache_cache_key ON cache(cache_key)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type)")
    
    @contextmanager
    def get_connection(self):
        """Context manager za database konekciju"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row  # Omogući pristup kolonama po imenu
            yield conn
        except Exception as e:
            logger.error(f"Greška pri povezivanju sa bazom: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def test_connection(self) -> bool:
        """Testira povezivanje sa bazom podataka"""
        try:
            with self.get_connection() as conn:
                conn.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Greška pri testiranju konekcije: {e}")
            return False
    
    # ============================================================================
    # SESSION MANAGEMENT METODE
    # ============================================================================
    
    def create_session(self, session_id: str, name: str = None, user_id: str = "default_user") -> bool:
        """Kreira novu sesiju"""
        try:
            with self.get_connection() as conn:
                conn.execute(
                    "INSERT INTO sessions (session_id, name, user_id) VALUES (?, ?, ?)",
                    (session_id, name or f"Session {datetime.now().strftime('%Y-%m-%d %H:%M')}", user_id)
                )
                conn.commit()
                logger.info(f"Kreirana nova sesija: {session_id}")
                return True
        except Exception as e:
            logger.error(f"Greška pri kreiranju sesije: {e}")
            return False
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Dohvata sesiju po ID-u"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    "SELECT * FROM sessions WHERE session_id = ?",
                    (session_id,)
                )
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Greška pri dohvatanju sesije: {e}")
            return None
    
    def get_all_sessions(self, user_id: str = "default_user", include_archived: bool = False) -> List[Dict]:
        """Dohvata sve sesije za korisnika"""
        try:
            with self.get_connection() as conn:
                query = "SELECT * FROM sessions WHERE user_id = ?"
                params = [user_id]
                
                if not include_archived:
                    query += " AND is_archived = 0"
                
                query += " ORDER BY updated_at DESC"
                
                cursor = conn.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Greška pri dohvatanju sesija: {e}")
            return []
    
    def update_session(self, session_id: str, **kwargs) -> bool:
        """Ažurira sesiju"""
        try:
            with self.get_connection() as conn:
                # Dinamički kreiraj SET klauzulu
                set_clause = ", ".join([f"{key} = ?" for key in kwargs.keys()])
                query = f"UPDATE sessions SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?"
                
                params = list(kwargs.values()) + [session_id]
                conn.execute(query, params)
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Greška pri ažuriranju sesije: {e}")
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """Briše sesiju i sve povezane podatke"""
        try:
            with self.get_connection() as conn:
                conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
                conn.commit()
                logger.info(f"Obrisana sesija: {session_id}")
                return True
        except Exception as e:
            logger.error(f"Greška pri brisanju sesije: {e}")
            return False
    
    def archive_session(self, session_id: str, reason: str = None) -> bool:
        """Arhivira sesiju"""
        return self.update_session(
            session_id,
            is_archived=1,
            archived_at=datetime.now().isoformat(),
            archived_reason=reason
        )
    
    # ============================================================================
    # CHAT HISTORY METODE
    # ============================================================================
    
    def save_chat_message(self, session_id: str, message_id: str, sender: str, 
                         content: str, sources: List[Dict] = None, metadata: Dict = None) -> bool:
        """Čuva chat poruku"""
        try:
            with self.get_connection() as conn:
                conn.execute(
                    """INSERT INTO chat_history 
                       (session_id, message_id, sender, content, sources, metadata) 
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        session_id,
                        message_id,
                        sender,
                        content,
                        json.dumps(sources or []),
                        json.dumps(metadata or {})
                    )
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Greška pri čuvanju chat poruke: {e}")
            return False
    
    def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """Dohvata chat istoriju za sesiju"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    """SELECT * FROM chat_history 
                       WHERE session_id = ? 
                       ORDER BY created_at ASC 
                       LIMIT ?""",
                    (session_id, limit)
                )
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Greška pri dohvatanju chat istorije: {e}")
            return []
    
    def get_message_count(self, session_id: str) -> int:
        """Dohvata broj poruka u sesiji"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    "SELECT COUNT(*) as count FROM chat_history WHERE session_id = ?",
                    (session_id,)
                )
                row = cursor.fetchone()
                return row['count'] if row else 0
        except Exception as e:
            logger.error(f"Greška pri brojanju poruka: {e}")
            return 0
    
    # ============================================================================
    # DOCUMENT MANAGEMENT METODE
    # ============================================================================
    
    def save_document(self, document_id: str, filename: str, file_path: str, 
                     file_type: str, file_size: int, content: str = None, 
                     metadata: Dict = None) -> bool:
        """Čuva dokument"""
        try:
            with self.get_connection() as conn:
                conn.execute(
                    """INSERT INTO documents 
                       (document_id, filename, file_path, file_type, file_size, content, metadata) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        document_id,
                        filename,
                        file_path,
                        file_type,
                        file_size,
                        content,
                        json.dumps(metadata or {})
                    )
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Greška pri čuvanju dokumenta: {e}")
            return False
    
    def get_document(self, document_id: str) -> Optional[Dict]:
        """Dohvata dokument po ID-u"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    "SELECT * FROM documents WHERE document_id = ?",
                    (document_id,)
                )
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Greška pri dohvatanju dokumenta: {e}")
            return None
    
    def get_all_documents(self) -> List[Dict]:
        """Dohvata sve dokumente"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    "SELECT * FROM documents ORDER BY created_at DESC"
                )
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Greška pri dohvatanju dokumenata: {e}")
            return []
    
    def delete_document(self, document_id: str) -> bool:
        """Briše dokument"""
        try:
            with self.get_connection() as conn:
                conn.execute("DELETE FROM documents WHERE document_id = ?", (document_id,))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Greška pri brisanju dokumenta: {e}")
            return False
    
    # ============================================================================
    # CACHE METODE
    # ============================================================================
    
    def set_cache(self, key: str, value: Any, cache_type: str = "general", 
                  ttl_seconds: int = 3600) -> bool:
        """Postavlja cache vrednost"""
        try:
            with self.get_connection() as conn:
                expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
                conn.execute(
                    """INSERT OR REPLACE INTO cache 
                       (cache_key, cache_value, cache_type, expires_at) 
                       VALUES (?, ?, ?, ?)""",
                    (key, json.dumps(value), cache_type, expires_at.isoformat())
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Greška pri postavljanju cache-a: {e}")
            return False
    
    def get_cache(self, key: str) -> Optional[Any]:
        """Dohvata cache vrednost"""
        try:
            with self.get_connection() as conn:
                cursor = conn.execute(
                    """SELECT cache_value, expires_at FROM cache 
                       WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > ?)""",
                    (key, datetime.now().isoformat())
                )
                row = cursor.fetchone()
                if row:
                    return json.loads(row['cache_value'])
                return None
        except Exception as e:
            logger.error(f"Greška pri dohvatanju cache-a: {e}")
            return None
    
    def clear_cache(self, cache_type: str = None) -> bool:
        """Briše cache"""
        try:
            with self.get_connection() as conn:
                if cache_type:
                    conn.execute("DELETE FROM cache WHERE cache_type = ?", (cache_type,))
                else:
                    conn.execute("DELETE FROM cache")
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Greška pri brisanju cache-a: {e}")
            return False
    
    # ============================================================================
    # ANALYTICS METODE
    # ============================================================================
    
    def log_event(self, event_type: str, event_data: Dict, user_id: str = None, 
                  session_id: str = None) -> bool:
        """Loguje analytics događaj"""
        try:
            with self.get_connection() as conn:
                conn.execute(
                    """INSERT INTO analytics 
                       (event_type, event_data, user_id, session_id) 
                       VALUES (?, ?, ?, ?)""",
                    (
                        event_type,
                        json.dumps(event_data),
                        user_id,
                        session_id
                    )
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Greška pri logovanju događaja: {e}")
            return False
    
    def get_analytics(self, event_type: str = None, user_id: str = None, 
                     limit: int = 100) -> List[Dict]:
        """Dohvata analytics podatke"""
        try:
            with self.get_connection() as conn:
                query = "SELECT * FROM analytics WHERE 1=1"
                params = []
                
                if event_type:
                    query += " AND event_type = ?"
                    params.append(event_type)
                
                if user_id:
                    query += " AND user_id = ?"
                    params.append(user_id)
                
                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Greška pri dohvatanju analytics podataka: {e}")
            return []
    
    # ============================================================================
    # UTILITY METODE
    # ============================================================================
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Dohvata statistike baze podataka"""
        try:
            with self.get_connection() as conn:
                stats = {}
                
                # Broj redova u svakoj tabeli
                tables = [
                    'sessions', 'chat_history', 'documents', 'document_vectors',
                    'ocr_images', 'study_rooms', 'study_journal_entries',
                    'study_goals', 'flashcards', 'exams', 'problems',
                    'career_profiles', 'skills', 'cache', 'analytics'
                ]
                
                for table in tables:
                    cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table}")
                    row = cursor.fetchone()
                    stats[f"{table}_count"] = row['count'] if row else 0
                
                # Veličina baze podataka
                if os.path.exists(self.db_path):
                    stats['database_size_mb'] = round(os.path.getsize(self.db_path) / (1024 * 1024), 2)
                else:
                    stats['database_size_mb'] = 0
                
                return stats
        except Exception as e:
            logger.error(f"Greška pri dohvatanju statistika: {e}")
            return {}
    
    def backup_database(self, backup_path: str) -> bool:
        """Kreira backup baze podataka"""
        try:
            import shutil
            shutil.copy2(self.db_path, backup_path)
            logger.info(f"Backup kreiran: {backup_path}")
            return True
        except Exception as e:
            logger.error(f"Greška pri kreiranju backup-a: {e}")
            return False
    
    def vacuum_database(self) -> bool:
        """Optimizuje bazu podataka"""
        try:
            with self.get_connection() as conn:
                conn.execute("VACUUM")
                logger.info("Baza podataka optimizovana")
                return True
        except Exception as e:
            logger.error(f"Greška pri optimizaciji baze: {e}")
            return False

# Globalna instanca Database Manager-a
db_manager = None

def get_db_manager() -> DatabaseManager:
    """Dohvata globalnu instancu Database Manager-a"""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager

def init_database():
    """Inicijalizuje bazu podataka"""
    global db_manager
    db_manager = DatabaseManager()
    return db_manager.test_connection() 