import asyncio
import aiohttp
import time
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ConnectionType(Enum):
    SUPABASE = "supabase"
    OLLAMA = "ollama"
    REDIS = "redis"
    HTTP = "http"

@dataclass
class ConnectionConfig:
    """Konfiguracija za konekciju"""
    max_connections: int = 10
    max_keepalive: int = 30
    timeout: int = 30
    retry_attempts: int = 3
    retry_delay: float = 1.0

class ConnectionPool:
    """Upravlja pool-om konekcija za različite servise"""
    
    def __init__(self):
        self.sessions: Dict[ConnectionType, aiohttp.ClientSession] = {}
        self.configs: Dict[ConnectionType, ConnectionConfig] = {}
        self.stats: Dict[ConnectionType, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        
        # Inicijalizuj default konfiguracije
        self._init_default_configs()
    
    def _init_default_configs(self):
        """Inicijalizuj default konfiguracije za različite tipove konekcija"""
        self.configs[ConnectionType.SUPABASE] = ConnectionConfig(
            max_connections=20,
            max_keepalive=60,
            timeout=60,
            retry_attempts=3,
            retry_delay=2.0
        )
        
        self.configs[ConnectionType.OLLAMA] = ConnectionConfig(
            max_connections=5,
            max_keepalive=30,
            timeout=120,  # Ollama može biti spor
            retry_attempts=2,
            retry_delay=1.0
        )
        
        self.configs[ConnectionType.REDIS] = ConnectionConfig(
            max_connections=10,
            max_keepalive=30,
            timeout=10,
            retry_attempts=3,
            retry_delay=0.5
        )
        
        self.configs[ConnectionType.HTTP] = ConnectionConfig(
            max_connections=50,
            max_keepalive=30,
            timeout=30,
            retry_attempts=2,
            retry_delay=1.0
        )
    
    async def get_session(self, connection_type: ConnectionType) -> aiohttp.ClientSession:
        """Dohvati ili kreiraj session za dati tip konekcije"""
        async with self._lock:
            if connection_type not in self.sessions or self.sessions[connection_type].closed:
                await self._create_session(connection_type)
            
            return self.sessions[connection_type]
    
    async def _create_session(self, connection_type: ConnectionType):
        """Kreiraj novi session za dati tip konekcije"""
        config = self.configs[connection_type]
        
        connector = aiohttp.TCPConnector(
            limit=config.max_connections,
            limit_per_host=config.max_connections,
            keepalive_timeout=config.max_keepalive,
            enable_cleanup_closed=True
        )
        
        timeout = aiohttp.ClientTimeout(total=config.timeout)
        
        session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'AcAIA-ConnectionPool/1.0'
            }
        )
        
        self.sessions[connection_type] = session
        
        # Inicijalizuj statistike
        self.stats[connection_type] = {
            'requests_total': 0,
            'requests_successful': 0,
            'requests_failed': 0,
            'avg_response_time': 0.0,
            'last_request_time': None,
            'connection_errors': 0
        }
        
        logger.info(f"Session kreiran za {connection_type.value}")
    
    @asynccontextmanager
    async def request(self, connection_type: ConnectionType, method: str, url: str, 
                     **kwargs) -> aiohttp.ClientResponse:
        """Kontekst manager za HTTP zahteve sa retry logikom"""
        session = await self.get_session(connection_type)
        config = self.configs[connection_type]
        
        start_time = time.time()
        last_error = None
        
        for attempt in range(config.retry_attempts):
            try:
                async with session.request(method, url, **kwargs) as response:
                    # Ažuriraj statistike
                    await self._update_stats(connection_type, True, time.time() - start_time)
                    yield response
                    return
                    
            except Exception as e:
                last_error = e
                await self._update_stats(connection_type, False, time.time() - start_time)
                
                if attempt < config.retry_attempts - 1:
                    logger.warning(f"Pokušaj {attempt + 1} neuspešan za {connection_type.value}: {e}")
                    await asyncio.sleep(config.retry_delay * (attempt + 1))
                else:
                    logger.error(f"Svi pokušaji neuspešni za {connection_type.value}: {e}")
                    raise last_error
    
    async def _update_stats(self, connection_type: ConnectionType, success: bool, response_time: float):
        """Ažuriraj statistike konekcije"""
        stats = self.stats[connection_type]
        stats['requests_total'] += 1
        stats['last_request_time'] = time.time()
        
        if success:
            stats['requests_successful'] += 1
            # Ažuriraj prosečno vreme odgovora
            total_successful = stats['requests_successful']
            current_avg = stats['avg_response_time']
            stats['avg_response_time'] = (current_avg * (total_successful - 1) + response_time) / total_successful
        else:
            stats['requests_failed'] += 1
            stats['connection_errors'] += 1
    
    async def health_check(self, connection_type: ConnectionType) -> Dict[str, Any]:
        """Proveri zdravlje konekcije"""
        try:
            session = await self.get_session(connection_type)
            
            # Test konekcije
            if connection_type == ConnectionType.SUPABASE:
                # Test Supabase konekcije
                test_url = "https://api.supabase.com/health"
            elif connection_type == ConnectionType.OLLAMA:
                # Test Ollama konekcije
                test_url = "http://localhost:11434/api/tags"
            else:
                test_url = "http://httpbin.org/get"
            
            start_time = time.time()
            async with session.get(test_url) as response:
                response_time = time.time() - start_time
                
                return {
                    'status': 'healthy' if response.status == 200 else 'unhealthy',
                    'response_time': response_time,
                    'status_code': response.status,
                    'stats': self.stats[connection_type]
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'stats': self.stats[connection_type]
            }
    
    async def get_stats(self, connection_type: Optional[ConnectionType] = None) -> Dict[str, Any]:
        """Dohvati statistike konekcija"""
        if connection_type:
            return {
                'connection_type': connection_type.value,
                'config': {
                    'max_connections': self.configs[connection_type].max_connections,
                    'timeout': self.configs[connection_type].timeout,
                    'retry_attempts': self.configs[connection_type].retry_attempts
                },
                'stats': self.stats[connection_type]
            }
        else:
            return {
                'all_connections': {
                    conn_type.value: {
                        'config': {
                            'max_connections': config.max_connections,
                            'timeout': config.timeout,
                            'retry_attempts': config.retry_attempts
                        },
                        'stats': self.stats[conn_type]
                    }
                    for conn_type, config in self.configs.items()
                }
            }
    
    async def close_all(self):
        """Zatvori sve konekcije"""
        async with self._lock:
            for conn_type, session in self.sessions.items():
                if not session.closed:
                    await session.close()
                    logger.info(f"Session zatvoren za {conn_type.value}")
            
            self.sessions.clear()
    
    async def reset_stats(self, connection_type: Optional[ConnectionType] = None):
        """Resetuj statistike"""
        if connection_type:
            self.stats[connection_type] = {
                'requests_total': 0,
                'requests_successful': 0,
                'requests_failed': 0,
                'avg_response_time': 0.0,
                'last_request_time': None,
                'connection_errors': 0
            }
        else:
            for conn_type in self.stats:
                self.stats[conn_type] = {
                    'requests_total': 0,
                    'requests_successful': 0,
                    'requests_failed': 0,
                    'avg_response_time': 0.0,
                    'last_request_time': None,
                    'connection_errors': 0
                }

# Globalna instanca connection pool-a
connection_pool = ConnectionPool()

# Helper funkcije za lako korišćenje
async def get_http_session(connection_type: ConnectionType = ConnectionType.HTTP) -> aiohttp.ClientSession:
    """Dohvati HTTP session"""
    return await connection_pool.get_session(connection_type)

async def make_request(connection_type: ConnectionType, method: str, url: str, **kwargs) -> aiohttp.ClientResponse:
    """Napravi HTTP zahtev sa retry logikom"""
    async with connection_pool.request(connection_type, method, url, **kwargs) as response:
        return response

async def check_connection_health(connection_type: ConnectionType) -> Dict[str, Any]:
    """Proveri zdravlje konekcije"""
    return await connection_pool.health_check(connection_type)

async def get_connection_stats(connection_type: Optional[ConnectionType] = None) -> Dict[str, Any]:
    """Dohvati statistike konekcija"""
    return await connection_pool.get_stats(connection_type)

async def close_all_connections():
    """Zatvori sve konekcije"""
    await connection_pool.close_all() 