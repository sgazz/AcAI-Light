import time
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import numpy as np
import asyncio
from dataclasses import dataclass, asdict
from enum import Enum

class QueryType(Enum):
    """Tipovi upita"""
    DEFINITION = "definition"
    COMPARISON = "comparison"
    PROCESS = "process"
    EXAMPLE = "example"
    GENERAL = "general"
    COMPLEX = "complex"

class ResponseQuality(Enum):
    """Kvalitet odgovora"""
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    POOR = "poor"

@dataclass
class QueryMetrics:
    """Metrike za pojedinačni upit"""
    query_id: str
    query_text: str
    query_type: QueryType
    query_length: int
    word_count: int
    processing_time: float
    cache_hit: bool
    sources_count: int
    response_length: int
    user_feedback: Optional[str] = None
    quality_score: Optional[float] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class SessionMetrics:
    """Metrike za sesiju"""
    session_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_queries: int = 0
    avg_processing_time: float = 0.0
    cache_hit_rate: float = 0.0
    avg_sources_count: float = 0.0
    avg_response_length: float = 0.0
    user_satisfaction: float = 0.0
    query_types: Dict[str, int] = None
    
    def __post_init__(self):
        if self.query_types is None:
            self.query_types = defaultdict(int)

@dataclass
class SystemMetrics:
    """Sistemske metrike"""
    timestamp: datetime
    total_requests: int
    avg_response_time: float
    cache_hit_rate: float
    memory_usage: float
    cpu_usage: float
    active_sessions: int
    error_rate: float

class RAGAnalytics:
    """Napredni analytics sistem za RAG"""
    
    def __init__(self, storage_path: str = "data/analytics"):
        self.storage_path = storage_path
        self.logger = logging.getLogger(__name__)
        
        # In-memory storage za real-time analytics
        self.query_metrics: List[QueryMetrics] = []
        self.session_metrics: Dict[str, SessionMetrics] = {}
        self.system_metrics: List[SystemMetrics] = []
        
        # Performance tracking
        self.performance_data = {
            'response_times': [],
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': 0,
            'total_requests': 0
        }
        
        # User behavior tracking
        self.user_behavior = {
            'query_patterns': defaultdict(int),
            'session_durations': [],
            'feedback_scores': [],
            'popular_topics': Counter()
        }
        
        # Quality metrics
        self.quality_metrics = {
            'source_relevance': [],
            'response_accuracy': [],
            'user_satisfaction': [],
            'fact_check_results': []
        }
        
        # Kreiraj storage direktorijum
        import os
        os.makedirs(storage_path, exist_ok=True)
    
    def track_query(self, query_metrics: QueryMetrics):
        """Prati metrike za pojedinačni upit"""
        try:
            # Dodaj u memoriju
            self.query_metrics.append(query_metrics)
            
            # Ažuriraj performance data
            self.performance_data['response_times'].append(query_metrics.processing_time)
            self.performance_data['total_requests'] += 1
            
            if query_metrics.cache_hit:
                self.performance_data['cache_hits'] += 1
            else:
                self.performance_data['cache_misses'] += 1
            
            # Ažuriraj user behavior
            self.user_behavior['query_patterns'][query_metrics.query_type.value] += 1
            
            # Ažuriraj session metrics
            self._update_session_metrics(query_metrics)
            
            # Sačuvaj na disk
            self._save_query_metrics(query_metrics)
            
        except Exception as e:
            self.logger.error(f"Greška pri tracking-u query metrika: {e}")
    
    def track_session_start(self, session_id: str):
        """Prati početak sesije"""
        try:
            session_metrics = SessionMetrics(
                session_id=session_id,
                start_time=datetime.now()
            )
            self.session_metrics[session_id] = session_metrics
            
        except Exception as e:
            self.logger.error(f"Greška pri tracking-u session start: {e}")
    
    def track_session_end(self, session_id: str, user_feedback: Optional[str] = None):
        """Prati kraj sesije"""
        try:
            if session_id in self.session_metrics:
                session = self.session_metrics[session_id]
                session.end_time = datetime.now()
                
                # Izračunaj session metrike
                if session.total_queries > 0:
                    session.avg_processing_time = sum(
                        qm.processing_time for qm in self.query_metrics 
                        if qm.query_id.startswith(session_id)
                    ) / session.total_queries
                    
                    session.cache_hit_rate = sum(
                        1 for qm in self.query_metrics 
                        if qm.query_id.startswith(session_id) and qm.cache_hit
                    ) / session.total_queries
                    
                    session.avg_sources_count = sum(
                        qm.sources_count for qm in self.query_metrics 
                        if qm.query_id.startswith(session_id)
                    ) / session.total_queries
                    
                    session.avg_response_length = sum(
                        qm.response_length for qm in self.query_metrics 
                        if qm.query_id.startswith(session_id)
                    ) / session.total_queries
                
                # Dodaj session duration
                if session.end_time and session.start_time:
                    duration = (session.end_time - session.start_time).total_seconds()
                    self.user_behavior['session_durations'].append(duration)
                
                # Sačuvaj session metrics
                self._save_session_metrics(session)
                
        except Exception as e:
            self.logger.error(f"Greška pri tracking-u session end: {e}")
    
    def track_user_feedback(self, query_id: str, feedback: str, score: float):
        """Prati korisnički feedback"""
        try:
            # Ažuriraj query metrics
            for qm in self.query_metrics:
                if qm.query_id == query_id:
                    qm.user_feedback = feedback
                    qm.quality_score = score
                    break
            
            # Dodaj u quality metrics
            self.quality_metrics['user_satisfaction'].append(score)
            
            # Ažuriraj user behavior
            self.user_behavior['feedback_scores'].append(score)
            
        except Exception as e:
            self.logger.error(f"Greška pri tracking-u user feedback: {e}")
    
    def track_system_metrics(self, system_metrics: SystemMetrics):
        """Prati sistemske metrike"""
        try:
            self.system_metrics.append(system_metrics)
            
            # Održi samo poslednjih 1000 sistemskih metrika
            if len(self.system_metrics) > 1000:
                self.system_metrics = self.system_metrics[-1000:]
            
            # Sačuvaj na disk
            self._save_system_metrics(system_metrics)
            
        except Exception as e:
            self.logger.error(f"Greška pri tracking-u system metrics: {e}")
    
    def get_performance_analytics(self, time_range: str = "24h") -> Dict[str, Any]:
        """Dohvata performance analytics"""
        try:
            cutoff_time = self._get_cutoff_time(time_range)
            
            # Filtriraj metrike za zadati period
            recent_metrics = [
                qm for qm in self.query_metrics 
                if qm.timestamp >= cutoff_time
            ]
            
            if not recent_metrics:
                return self._empty_analytics()
            
            # Izračunaj performance metrike
            response_times = [qm.processing_time for qm in recent_metrics]
            cache_hits = sum(1 for qm in recent_metrics if qm.cache_hit)
            cache_misses = len(recent_metrics) - cache_hits
            
            return {
                'total_queries': len(recent_metrics),
                'avg_response_time': np.mean(response_times),
                'median_response_time': np.median(response_times),
                'p95_response_time': np.percentile(response_times, 95),
                'p99_response_time': np.percentile(response_times, 99),
                'cache_hit_rate': cache_hits / len(recent_metrics) if recent_metrics else 0,
                'cache_hits': cache_hits,
                'cache_misses': cache_misses,
                'avg_sources_count': np.mean([qm.sources_count for qm in recent_metrics]),
                'avg_response_length': np.mean([qm.response_length for qm in recent_metrics]),
                'query_types_distribution': self._get_query_types_distribution(recent_metrics),
                'hourly_distribution': self._get_hourly_distribution(recent_metrics)
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri dohvatanju performance analytics: {e}")
            return self._empty_analytics()
    
    def get_user_behavior_analytics(self, time_range: str = "24h") -> Dict[str, Any]:
        """Dohvata user behavior analytics"""
        try:
            cutoff_time = self._get_cutoff_time(time_range)
            
            # Filtriraj sesije za zadati period
            recent_sessions = [
                session for session in self.session_metrics.values()
                if session.start_time >= cutoff_time
            ]
            
            if not recent_sessions:
                return self._empty_user_analytics()
            
            # Izračunaj user behavior metrike
            session_durations = [
                (session.end_time - session.start_time).total_seconds()
                for session in recent_sessions
                if session.end_time
            ]
            
            return {
                'total_sessions': len(recent_sessions),
                'avg_session_duration': np.mean(session_durations) if session_durations else 0,
                'avg_queries_per_session': np.mean([s.total_queries for s in recent_sessions]),
                'popular_query_types': dict(self.user_behavior['query_patterns'].most_common(5)),
                'user_satisfaction': {
                    'avg_score': np.mean(self.user_behavior['feedback_scores']) if self.user_behavior['feedback_scores'] else 0,
                    'total_feedback': len(self.user_behavior['feedback_scores'])
                },
                'session_retention': self._calculate_session_retention(recent_sessions)
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri dohvatanju user behavior analytics: {e}")
            return self._empty_user_analytics()
    
    def get_quality_analytics(self, time_range: str = "24h") -> Dict[str, Any]:
        """Dohvata quality analytics"""
        try:
            cutoff_time = self._get_cutoff_time(time_range)
            
            # Filtriraj quality metrike za zadati period
            recent_queries = [
                qm for qm in self.query_metrics 
                if qm.timestamp >= cutoff_time and qm.quality_score is not None
            ]
            
            if not recent_queries:
                return self._empty_quality_analytics()
            
            quality_scores = [qm.quality_score for qm in recent_queries]
            
            return {
                'total_rated_queries': len(recent_queries),
                'avg_quality_score': np.mean(quality_scores),
                'quality_distribution': {
                    'excellent': sum(1 for score in quality_scores if score >= 0.9),
                    'good': sum(1 for score in quality_scores if 0.7 <= score < 0.9),
                    'average': sum(1 for score in quality_scores if 0.5 <= score < 0.7),
                    'poor': sum(1 for score in quality_scores if score < 0.5)
                },
                'source_relevance': {
                    'avg_sources': np.mean([qm.sources_count for qm in recent_queries]),
                    'high_relevance_rate': sum(1 for qm in recent_queries if qm.sources_count >= 3) / len(recent_queries)
                },
                'response_accuracy': {
                    'avg_length': np.mean([qm.response_length for qm in recent_queries]),
                    'comprehensive_rate': sum(1 for qm in recent_queries if qm.response_length >= 200) / len(recent_queries)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri dohvatanju quality analytics: {e}")
            return self._empty_quality_analytics()
    
    def get_system_health_analytics(self, time_range: str = "24h") -> Dict[str, Any]:
        """Dohvata system health analytics"""
        try:
            cutoff_time = self._get_cutoff_time(time_range)
            
            # Filtriraj system metrike za zadati period
            recent_metrics = [
                sm for sm in self.system_metrics 
                if sm.timestamp >= cutoff_time
            ]
            
            if not recent_metrics:
                return self._empty_system_analytics()
            
            return {
                'avg_memory_usage': np.mean([sm.memory_usage for sm in recent_metrics]),
                'avg_cpu_usage': np.mean([sm.cpu_usage for sm in recent_metrics]),
                'avg_error_rate': np.mean([sm.error_rate for sm in recent_metrics]),
                'peak_memory_usage': max([sm.memory_usage for sm in recent_metrics]),
                'peak_cpu_usage': max([sm.cpu_usage for sm in recent_metrics]),
                'total_errors': sum([sm.total_requests * sm.error_rate for sm in recent_metrics]),
                'system_uptime': self._calculate_system_uptime(recent_metrics)
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri dohvatanju system health analytics: {e}")
            return self._empty_system_analytics()
    
    def _update_session_metrics(self, query_metrics: QueryMetrics):
        """Ažurira session metrike"""
        session_id = query_metrics.query_id.split('_')[0]  # Pretpostavljamo format session_id_query_id
        
        if session_id in self.session_metrics:
            session = self.session_metrics[session_id]
            session.total_queries += 1
            session.query_types[query_metrics.query_type.value] += 1
    
    def _get_cutoff_time(self, time_range: str) -> datetime:
        """Računa cutoff time na osnovu time range"""
        now = datetime.now()
        
        if time_range == "1h":
            return now - timedelta(hours=1)
        elif time_range == "6h":
            return now - timedelta(hours=6)
        elif time_range == "24h":
            return now - timedelta(days=1)
        elif time_range == "7d":
            return now - timedelta(days=7)
        elif time_range == "30d":
            return now - timedelta(days=30)
        else:
            return now - timedelta(hours=24)  # Default
    
    def _get_query_types_distribution(self, metrics: List[QueryMetrics]) -> Dict[str, int]:
        """Računa distribuciju tipova upita"""
        distribution = defaultdict(int)
        for qm in metrics:
            distribution[qm.query_type.value] += 1
        return dict(distribution)
    
    def _get_hourly_distribution(self, metrics: List[QueryMetrics]) -> Dict[str, int]:
        """Računa hourly distribuciju upita"""
        hourly_dist = defaultdict(int)
        for qm in metrics:
            hour = qm.timestamp.strftime("%H:00")
            hourly_dist[hour] += 1
        return dict(hourly_dist)
    
    def _calculate_session_retention(self, sessions: List[SessionMetrics]) -> float:
        """Računa session retention rate"""
        if not sessions:
            return 0.0
        
        long_sessions = sum(1 for s in sessions if s.total_queries > 1)
        return long_sessions / len(sessions)
    
    def _calculate_system_uptime(self, metrics: List[SystemMetrics]) -> float:
        """Računa system uptime"""
        if not metrics:
            return 0.0
        
        total_time = len(metrics)  # Pretpostavljamo da su metrike u minutnim intervalima
        error_time = sum(1 for m in metrics if m.error_rate > 0.1)  # 10% error rate threshold
        
        return (total_time - error_time) / total_time if total_time > 0 else 0.0
    
    def _save_query_metrics(self, query_metrics: QueryMetrics):
        """Sačuvaj query metrike na disk"""
        try:
            filename = f"query_metrics_{query_metrics.timestamp.strftime('%Y%m%d')}.json"
            filepath = f"{self.storage_path}/{filename}"
            
            # Učitaj postojeće metrike
            existing_metrics = []
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    existing_metrics = json.load(f)
            except FileNotFoundError:
                pass
            
            # Dodaj novu metriku
            existing_metrics.append(asdict(query_metrics))
            
            # Sačuvaj
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(existing_metrics, f, ensure_ascii=False, indent=2, default=str)
                
        except Exception as e:
            self.logger.error(f"Greška pri čuvanju query metrika: {e}")
    
    def _save_session_metrics(self, session_metrics: SessionMetrics):
        """Sačuvaj session metrike na disk"""
        try:
            filename = f"session_metrics_{session_metrics.start_time.strftime('%Y%m%d')}.json"
            filepath = f"{self.storage_path}/{filename}"
            
            # Učitaj postojeće metrike
            existing_metrics = {}
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    existing_metrics = json.load(f)
            except FileNotFoundError:
                pass
            
            # Dodaj novu metriku
            existing_metrics[session_metrics.session_id] = asdict(session_metrics)
            
            # Sačuvaj
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(existing_metrics, f, ensure_ascii=False, indent=2, default=str)
                
        except Exception as e:
            self.logger.error(f"Greška pri čuvanju session metrika: {e}")
    
    def _save_system_metrics(self, system_metrics: SystemMetrics):
        """Sačuvaj system metrike na disk"""
        try:
            filename = f"system_metrics_{system_metrics.timestamp.strftime('%Y%m%d')}.json"
            filepath = f"{self.storage_path}/{filename}"
            
            # Učitaj postojeće metrike
            existing_metrics = []
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    existing_metrics = json.load(f)
            except FileNotFoundError:
                pass
            
            # Dodaj novu metriku
            existing_metrics.append(asdict(system_metrics))
            
            # Sačuvaj
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(existing_metrics, f, ensure_ascii=False, indent=2, default=str)
                
        except Exception as e:
            self.logger.error(f"Greška pri čuvanju system metrika: {e}")
    
    def _empty_analytics(self) -> Dict[str, Any]:
        """Vraća prazne analytics"""
        return {
            'total_queries': 0,
            'avg_response_time': 0,
            'cache_hit_rate': 0,
            'query_types_distribution': {},
            'hourly_distribution': {}
        }
    
    def _empty_user_analytics(self) -> Dict[str, Any]:
        """Vraća prazne user analytics"""
        return {
            'total_sessions': 0,
            'avg_session_duration': 0,
            'avg_queries_per_session': 0,
            'popular_query_types': {},
            'user_satisfaction': {'avg_score': 0, 'total_feedback': 0}
        }
    
    def _empty_quality_analytics(self) -> Dict[str, Any]:
        """Vraća prazne quality analytics"""
        return {
            'total_rated_queries': 0,
            'avg_quality_score': 0,
            'quality_distribution': {'excellent': 0, 'good': 0, 'average': 0, 'poor': 0},
            'source_relevance': {'avg_sources': 0, 'high_relevance_rate': 0},
            'response_accuracy': {'avg_length': 0, 'comprehensive_rate': 0}
        }
    
    def _empty_system_analytics(self) -> Dict[str, Any]:
        """Vraća prazne system analytics"""
        return {
            'avg_memory_usage': 0,
            'avg_cpu_usage': 0,
            'avg_error_rate': 0,
            'peak_memory_usage': 0,
            'peak_cpu_usage': 0,
            'total_errors': 0,
            'system_uptime': 0
        } 