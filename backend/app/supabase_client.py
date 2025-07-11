"""
Mock Supabase Client - Lokalna verzija
Vraća mock podatke umesto Supabase integracije
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class MockSupabaseManager:
    """Mock Supabase manager koji vraća prazne podatke"""
    
    def __init__(self):
        """Inicijalizuj mock manager"""
        self.client = MockSupabaseClient()
        logger.info("Mock Supabase manager inicijalizovan")
    
    def is_available(self) -> bool:
        """Proveri da li je Supabase dostupan"""
        return False  # Uvek false jer koristimo mock

class MockSupabaseClient:
    """Mock Supabase klijent"""
    
    def __init__(self):
        """Inicijalizuj mock klijent"""
        self.tables = {}
        logger.info("Mock Supabase klijent inicijalizovan")
    
    def table(self, table_name: str) -> 'MockTable':
        """Dohvati mock tabelu"""
        return MockTable(table_name)

class MockTable:
    """Mock Supabase tabela"""
    
    def __init__(self, table_name: str):
        """Inicijalizuj mock tabelu"""
        self.table_name = table_name
        self.data = []
    
    def select(self, *args) -> 'MockTable':
        """Mock select operacija"""
        return self
    
    def insert(self, data: Dict[str, Any]) -> 'MockTable':
        """Mock insert operacija"""
        if isinstance(data, dict):
            data['id'] = f"mock_{self.table_name}_{len(self.data)}"
            data['created_at'] = datetime.now().isoformat()
            data['updated_at'] = datetime.now().isoformat()
            self.data.append(data)
        elif isinstance(data, list):
            for item in data:
                item['id'] = f"mock_{self.table_name}_{len(self.data)}"
                item['created_at'] = datetime.now().isoformat()
                item['updated_at'] = datetime.now().isoformat()
                self.data.append(item)
        return self
    
    def update(self, data: Dict[str, Any]) -> 'MockTable':
        """Mock update operacija"""
        return self
    
    def delete(self) -> 'MockTable':
        """Mock delete operacija"""
        return self
    
    def eq(self, column: str, value: Any) -> 'MockTable':
        """Mock equals filter"""
        return self
    
    def neq(self, column: str, value: Any) -> 'MockTable':
        """Mock not equals filter"""
        return self
    
    def gt(self, column: str, value: Any) -> 'MockTable':
        """Mock greater than filter"""
        return self
    
    def gte(self, column: str, value: Any) -> 'MockTable':
        """Mock greater than or equal filter"""
        return self
    
    def lt(self, column: str, value: Any) -> 'MockTable':
        """Mock less than filter"""
        return self
    
    def lte(self, column: str, value: Any) -> 'MockTable':
        """Mock less than or equal filter"""
        return self
    
    def like(self, column: str, value: str) -> 'MockTable':
        """Mock like filter"""
        return self
    
    def ilike(self, column: str, value: str) -> 'MockTable':
        """Mock ilike filter"""
        return self
    
    def in_(self, column: str, values: List[Any]) -> 'MockTable':
        """Mock in filter"""
        return self
    
    def not_in(self, column: str, values: List[Any]) -> 'MockTable':
        """Mock not in filter"""
        return self
    
    def is_(self, column: str, value: Any) -> 'MockTable':
        """Mock is filter"""
        return self
    
    def is_not(self, column: str, value: Any) -> 'MockTable':
        """Mock is not filter"""
        return self
    
    def order(self, column: str, desc: bool = False) -> 'MockTable':
        """Mock order by"""
        return self
    
    def limit(self, count: int) -> 'MockTable':
        """Mock limit"""
        return self
    
    def range(self, start: int, end: int) -> 'MockTable':
        """Mock range"""
        return self
    
    def execute(self) -> 'MockResult':
        """Mock execute operacija"""
        return MockResult(self.data)

class MockResult:
    """Mock rezultat Supabase operacije"""
    
    def __init__(self, data: List[Dict[str, Any]]):
        """Inicijalizuj mock rezultat"""
        self.data = data
        self.count = len(data)
        self.error = None

# Globalna instanca
_supabase_manager = None

def get_supabase_manager() -> Optional[MockSupabaseManager]:
    """Dohvati mock Supabase manager"""
    global _supabase_manager
    if _supabase_manager is None:
        _supabase_manager = MockSupabaseManager()
    return _supabase_manager

def is_supabase_available() -> bool:
    """Proveri da li je Supabase dostupan"""
    return False  # Uvek false jer koristimo mock

def create_supabase_client():
    """Kreiraj mock Supabase klijent"""
    return MockSupabaseClient()
