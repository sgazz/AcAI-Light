import redis
import json
import hashlib
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheManager:
    """
    Redis-based cache manager za AcAIA aplikaciju.
    Podržava caching za RAG upite, sesije, i druge podatke.
    """
    
    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0):
        """
        Inicijalizacija Cache Manager-a
        
        Args:
            host: Redis host
            port: Redis port
            db: Redis database number
        """
        try:
            self.redis = redis.Redis(
                host=host, 
                port=port, 
                db=db, 
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test konekcije
            self.redis.ping()
            logger.info(f"Cache Manager uspešno povezan sa Redis-om na {host}:{port}")
        except Exception as e:
            logger.error(f"Greška pri povezivanju sa Redis-om: {e}")
            self.redis = None
    
    def _generate_key(self, prefix: str, *args) -> str:
        """
        Generiše cache ključ na osnovu prefix-a i argumenata
        
        Args:
            prefix: Prefix za ključ
            *args: Argumenti za generisanje ključa
            
        Returns:
            Cache ključ
        """
        # Kombinuj sve argumente
        key_parts = [prefix] + [str(arg) for arg in args]
        key_string = ":".join(key_parts)
        
        # Hash za duže ključeve
        if len(key_string) > 100:
            return f"{prefix}:{hashlib.md5(key_string.encode()).hexdigest()}"
        
        return key_string
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Dohvati podatak iz cache-a
        
        Args:
            key: Cache ključ
            
        Returns:
            Podatak iz cache-a ili None ako ne postoji
        """
        if not self.redis:
            return None
            
        try:
            data = self.redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Greška pri dohvatanju iz cache-a: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """
        Sačuvaj podatak u cache
        
        Args:
            key: Cache ključ
            value: Vrednost za čuvanje
            ttl: Time to live u sekundama (default: 1 sat)
            
        Returns:
            True ako je uspešno sačuvano, False inače
        """
        if not self.redis:
            return False
            
        try:
            serialized_value = json.dumps(value, default=str)
            self.redis.setex(key, ttl, serialized_value)
            logger.debug(f"Podatak sačuvan u cache: {key}")
            return True
        except Exception as e:
            logger.error(f"Greška pri čuvanju u cache: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Obriši podatak iz cache-a
        
        Args:
            key: Cache ključ
            
        Returns:
            True ako je uspešno obrisano, False inače
        """
        if not self.redis:
            return False
            
        try:
            result = self.redis.delete(key)
            logger.debug(f"Podatak obrisan iz cache-a: {key}")
            return result > 0
        except Exception as e:
            logger.error(f"Greška pri brisanju iz cache-a: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """
        Proveri da li ključ postoji u cache-u
        
        Args:
            key: Cache ključ
            
        Returns:
            True ako postoji, False inače
        """
        if not self.redis:
            return False
            
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.error(f"Greška pri proveri postojanja ključa: {e}")
            return False
    
    async def expire(self, key: str, ttl: int) -> bool:
        """
        Postavi TTL za ključ
        
        Args:
            key: Cache ključ
            ttl: Time to live u sekundama
            
        Returns:
            True ako je uspešno postavljeno, False inače
        """
        if not self.redis:
            return False
            
        try:
            return bool(self.redis.expire(key, ttl))
        except Exception as e:
            logger.error(f"Greška pri postavljanju TTL: {e}")
            return False
    
    # RAG-specific cache metode
    async def get_rag_result(self, query: str, context: str = "") -> Optional[Dict]:
        """
        Dohvati RAG rezultat iz cache-a
        
        Args:
            query: Korisnički upit
            context: Kontekst (opciono)
            
        Returns:
            RAG rezultat ili None
        """
        key = self._generate_key("rag", query, context)
        return await self.get(key)
    
    async def set_rag_result(self, query: str, result: Dict, context: str = "", ttl: int = 1800) -> bool:
        """
        Sačuvaj RAG rezultat u cache
        
        Args:
            query: Korisnički upit
            result: RAG rezultat
            context: Kontekst (opciono)
            ttl: Time to live u sekundama (default: 30 minuta)
            
        Returns:
            True ako je uspešno sačuvano
        """
        key = self._generate_key("rag", query, context)
        return await self.set(key, result, ttl)
    
    async def get_session_data(self, session_id: str) -> Optional[Dict]:
        """
        Dohvati podatke sesije iz cache-a
        
        Args:
            session_id: ID sesije
            
        Returns:
            Podaci sesije ili None
        """
        key = self._generate_key("session", session_id)
        return await self.get(key)
    
    async def set_session_data(self, session_id: str, data: Dict, ttl: int = 86400) -> bool:
        """
        Sačuvaj podatke sesije u cache
        
        Args:
            session_id: ID sesije
            data: Podaci sesije
            ttl: Time to live u sekundama (default: 24 sata)
            
        Returns:
            True ako je uspešno sačuvano
        """
        key = self._generate_key("session", session_id)
        return await self.set(key, data, ttl)
    
    async def get_document_embeddings(self, document_id: str) -> Optional[List]:
        """
        Dohvati embeddings dokumenta iz cache-a
        
        Args:
            document_id: ID dokumenta
            
        Returns:
            Embeddings ili None
        """
        key = self._generate_key("embeddings", document_id)
        return await self.get(key)
    
    async def set_document_embeddings(self, document_id: str, embeddings: List, ttl: int = 7200) -> bool:
        """
        Sačuvaj embeddings dokumenta u cache
        
        Args:
            document_id: ID dokumenta
            embeddings: Embeddings za čuvanje
            ttl: Time to live u sekundama (default: 2 sata)
            
        Returns:
            True ako je uspešno sačuvano
        """
        key = self._generate_key("embeddings", document_id)
        return await self.set(key, embeddings, ttl)
    
    # Cache statistike
    async def get_stats(self) -> Dict:
        """
        Dohvati statistike cache-a
        
        Returns:
            Statistike cache-a
        """
        if not self.redis:
            return {"error": "Redis nije dostupan"}
            
        try:
            info = self.redis.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0)
            }
        except Exception as e:
            logger.error(f"Greška pri dohvatanju statistika: {e}")
            return {"error": str(e)}
    
    async def clear_cache(self, pattern: str = "*") -> int:
        """
        Obriši sve ključeve koji odgovaraju pattern-u
        
        Args:
            pattern: Pattern za brisanje (default: sve)
            
        Returns:
            Broj obrisanih ključeva
        """
        if not self.redis:
            return 0
            
        try:
            keys = self.redis.keys(pattern)
            if keys:
                deleted = self.redis.delete(*keys)
                logger.info(f"Obrisano {deleted} ključeva iz cache-a")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Greška pri brisanju cache-a: {e}")
            return 0
    
    async def health_check(self) -> Dict:
        """
        Provera zdravlja cache-a
        
        Returns:
            Status cache-a
        """
        if not self.redis:
            return {"status": "error", "message": "Redis nije dostupan"}
            
        try:
            # Test konekcije
            self.redis.ping()
            
            # Test čitanja/pisanja
            test_key = "health_check_test"
            test_value = {"timestamp": datetime.now().isoformat()}
            
            await self.set(test_key, test_value, 10)
            retrieved_value = await self.get(test_key)
            await self.delete(test_key)
            
            if retrieved_value and retrieved_value.get("timestamp"):
                return {
                    "status": "healthy",
                    "message": "Cache radi normalno",
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "status": "warning",
                    "message": "Cache radi ali ima problema sa čitanjem/pisanjem"
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Cache nije dostupan: {str(e)}"
            }

# Globalna instanca cache manager-a
cache_manager = CacheManager()

# Convenience funkcije
async def get_cached_rag_result(query: str, context: str = "") -> Optional[Dict]:
    """Dohvati RAG rezultat iz cache-a"""
    return await cache_manager.get_rag_result(query, context)

async def set_cached_rag_result(query: str, result: Dict, context: str = "", ttl: int = 1800) -> bool:
    """Sačuvaj RAG rezultat u cache"""
    return await cache_manager.set_rag_result(query, result, context, ttl)

async def get_cached_session(session_id: str) -> Optional[Dict]:
    """Dohvati sesiju iz cache-a"""
    return await cache_manager.get_session_data(session_id)

async def set_cached_session(session_id: str, data: Dict, ttl: int = 86400) -> bool:
    """Sačuvaj sesiju u cache"""
    return await cache_manager.set_session_data(session_id, data, ttl) 