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

    # AI Response Cache metode
    async def get_ai_response(self, query: str, model: str = "mistral:latest", context: str = "") -> Optional[Dict]:
        """
        Dohvati AI odgovor iz cache-a
        
        Args:
            query: Korisnički upit
            model: AI model koji je korišćen
            context: Kontekst (opciono)
            
        Returns:
            AI odgovor ili None
        """
        key = self._generate_key("ai_response", query, model, context)
        return await self.get(key)
    
    async def set_ai_response(self, query: str, response: str, model: str = "mistral:latest", 
                            context: str = "", response_time: float = 0.0, ttl: int = 3600) -> bool:
        """
        Sačuvaj AI odgovor u cache
        
        Args:
            query: Korisnički upit
            response: AI odgovor
            model: AI model koji je korišćen
            context: Kontekst (opciono)
            response_time: Vreme odgovora
            ttl: Time to live u sekundama (default: 1 sat)
            
        Returns:
            True ako je uspešno sačuvano
        """
        cache_data = {
            "query": query,
            "response": response,
            "model": model,
            "context": context,
            "response_time": response_time,
            "cached_at": datetime.now().isoformat(),
            "cached": True
        }
        key = self._generate_key("ai_response", query, model, context)
        return await self.set(key, cache_data, ttl)
    
    # Semantic Cache metode (za slične upite)
    async def get_semantic_cache(self, query: str, similarity_threshold: float = 0.8) -> Optional[Dict]:
        """
        Dohvati semantički sličan odgovor iz cache-a
        
        Args:
            query: Korisnički upit
            similarity_threshold: Prag sličnosti (0.0 - 1.0)
            
        Returns:
            Sličan odgovor ili None
        """
        try:
            # Dohvati sve AI response ključeve
            pattern = "ai_response:*"
            keys = self.redis.keys(pattern)
            
            best_match = None
            best_similarity = 0.0
            
            for key in keys:
                cached_data = await self.get(key)
                if cached_data and "query" in cached_data:
                    # Jednostavna sličnost na osnovu ključnih reči
                    similarity = self._calculate_similarity(query, cached_data["query"])
                    if similarity > best_similarity and similarity >= similarity_threshold:
                        best_similarity = similarity
                        best_match = cached_data
                        best_match["similarity_score"] = similarity
            
            return best_match
            
        except Exception as e:
            logger.error(f"Greška pri semantic cache lookup: {e}")
            return None
    
    def _calculate_similarity(self, query1: str, query2: str) -> float:
        """
        Izračunaj sličnost između dva upita
        
        Args:
            query1: Prvi upit
            query2: Drugi upit
            
        Returns:
            Sličnost (0.0 - 1.0)
        """
        try:
            # Jednostavna implementacija - broj zajedničkih reči
            words1 = set(query1.lower().split())
            words2 = set(query2.lower().split())
            
            if not words1 or not words2:
                return 0.0
            
            intersection = words1.intersection(words2)
            union = words1.union(words2)
            
            return len(intersection) / len(union)
            
        except Exception as e:
            logger.error(f"Greška pri računanju sličnosti: {e}")
            return 0.0
    
    # Query Cache metode
    async def get_query_cache(self, query: str, session_id: str = "") -> Optional[Dict]:
        """
        Dohvati keširan upit
        
        Args:
            query: Korisnički upit
            session_id: ID sesije (opciono)
            
        Returns:
            Keširani upit ili None
        """
        key = self._generate_key("query", query, session_id)
        return await self.get(key)
    
    async def set_query_cache(self, query: str, result: Dict, session_id: str = "", ttl: int = 1800) -> bool:
        """
        Sačuvaj upit u cache
        
        Args:
            query: Korisnički upit
            result: Rezultat upita
            session_id: ID sesije (opciono)
            ttl: Time to live u sekundama
            
        Returns:
            True ako je uspešno sačuvano
        """
        cache_data = {
            "query": query,
            "result": result,
            "session_id": session_id,
            "cached_at": datetime.now().isoformat(),
            "cached": True
        }
        key = self._generate_key("query", query, session_id)
        return await self.set(key, cache_data, ttl)
    
    # Cache Analytics
    async def get_cache_analytics(self) -> Dict[str, Any]:
        """
        Dohvati analitiku cache-a
        
        Returns:
            Cache analitika
        """
        try:
            analytics = {
                "total_keys": 0,
                "ai_responses": 0,
                "rag_results": 0,
                "queries": 0,
                "sessions": 0,
                "hit_rate": 0.0,
                "avg_ttl": 0.0
            }
            
            # Broj ključeva po kategorijama
            patterns = {
                "ai_responses": "ai_response:*",
                "rag_results": "rag:*",
                "queries": "query:*",
                "sessions": "session:*"
            }
            
            for category, pattern in patterns.items():
                try:
                    keys = self.redis.keys(pattern)
                    analytics[category] = len(keys)
                    analytics["total_keys"] += len(keys)
                except Exception as e:
                    logger.error(f"Greška pri brojanju {category}: {e}")
                    analytics[category] = 0
            
            # Izračunaj hit rate (ako imamo statistike)
            if hasattr(self, '_hit_stats'):
                total_hits = self._hit_stats.get('hits', 0)
                total_misses = self._hit_stats.get('misses', 0)
                total_requests = total_hits + total_misses
                if total_requests > 0:
                    analytics["hit_rate"] = round((total_hits / total_requests) * 100, 2)
            
            return analytics
            
        except Exception as e:
            logger.error(f"Greška pri dohvatanju cache analitike: {e}")
            return {
                "total_keys": 0,
                "ai_responses": 0,
                "rag_results": 0,
                "queries": 0,
                "sessions": 0,
                "hit_rate": 0.0,
                "avg_ttl": 0.0,
                "error": str(e)
            }
    
    def _update_hit_stats(self, hit: bool):
        """Ažurira statistike hit/miss"""
        if not hasattr(self, '_hit_stats'):
            self._hit_stats = {'hits': 0, 'misses': 0}
        
        if hit:
            self._hit_stats['hits'] += 1
        else:
            self._hit_stats['misses'] += 1

# Globalna instanca cache manager-a
cache_manager = CacheManager()

# Convenience funkcije
async def get_cached_rag_result(query: str, context: str = "") -> Optional[Dict]:
    """Helper funkcija za dohvatanje RAG rezultata iz cache-a"""
    return await cache_manager.get_rag_result(query, context)

async def set_cached_rag_result(query: str, result: Dict, context: str = "", ttl: int = 1800) -> bool:
    """Helper funkcija za čuvanje RAG rezultata u cache"""
    return await cache_manager.set_rag_result(query, result, context, ttl)

async def get_cached_session(session_id: str) -> Optional[Dict]:
    """Helper funkcija za dohvatanje sesije iz cache-a"""
    return await cache_manager.get_session_data(session_id)

async def set_cached_session(session_id: str, data: Dict, ttl: int = 86400) -> bool:
    """Helper funkcija za čuvanje sesije u cache"""
    return await cache_manager.set_session_data(session_id, data, ttl)

# Napredne cache helper funkcije
async def get_cached_ai_response(query: str, model: str = "mistral:latest", context: str = "") -> Optional[Dict]:
    """Helper funkcija za dohvatanje AI odgovora iz cache-a"""
    return await cache_manager.get_ai_response(query, model, context)

async def set_cached_ai_response(query: str, response: str, model: str = "mistral:latest", 
                                context: str = "", response_time: float = 0.0, ttl: int = 3600) -> bool:
    """Helper funkcija za čuvanje AI odgovora u cache"""
    return await cache_manager.set_ai_response(query, response, model, context, response_time, ttl)

async def get_semantic_cached_response(query: str, similarity_threshold: float = 0.8) -> Optional[Dict]:
    """Helper funkcija za dohvatanje semantički sličnog odgovora iz cache-a"""
    return await cache_manager.get_semantic_cache(query, similarity_threshold)

async def get_cached_query(query: str, session_id: str = "") -> Optional[Dict]:
    """Helper funkcija za dohvatanje keširanog upita"""
    return await cache_manager.get_query_cache(query, session_id)

async def set_cached_query(query: str, result: Dict, session_id: str = "", ttl: int = 1800) -> bool:
    """Helper funkcija za čuvanje upita u cache"""
    return await cache_manager.set_query_cache(query, result, session_id, ttl)

async def get_cache_analytics() -> Dict[str, Any]:
    """Helper funkcija za dohvatanje cache analitike"""
    return await cache_manager.get_cache_analytics() 