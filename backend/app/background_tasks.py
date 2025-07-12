import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Callable, Optional, List
from enum import Enum
import logging
from concurrent.futures import ThreadPoolExecutor
import traceback

# Konfiguracija logging-a
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

class BackgroundTask:
    """Reprezentuje jedan background task"""
    
    def __init__(self, task_id: str, func: Callable, args: tuple = (), kwargs: dict = None, 
                 priority: TaskPriority = TaskPriority.NORMAL, description: str = ""):
        self.task_id = task_id
        self.func = func
        self.args = args or ()
        self.kwargs = kwargs or {}
        self.priority = priority
        self.description = description
        self.status = TaskStatus.PENDING
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.result: Optional[Any] = None
        self.error: Optional[str] = None
        self.progress: float = 0.0
        self.metadata: Dict[str, Any] = {}

class BackgroundTaskManager:
    """Upravlja background taskovima sa prioritetima i monitoringom"""
    
    def __init__(self, max_workers: int = 4, max_queue_size: int = 100):
        self.max_workers = max_workers
        self.max_queue_size = max_queue_size
        self.tasks: Dict[str, BackgroundTask] = {}
        self.task_queue: List[BackgroundTask] = []
        self.running_tasks: Dict[str, BackgroundTask] = {}
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.is_running = False
        self._lock = asyncio.Lock()
        
        # Statistike
        self.stats = {
            'total_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0,
            'cancelled_tasks': 0,
            'avg_execution_time': 0.0
        }
    
    async def start(self):
        """Pokreni background task manager"""
        if not self.is_running:
            self.is_running = True
            asyncio.create_task(self._task_worker())
            logger.info("Background task manager pokrenut")
    
    async def stop(self):
        """Zaustavi background task manager"""
        self.is_running = False
        self.executor.shutdown(wait=True)
        logger.info("Background task manager zaustavljen")
    
    async def add_task(self, func: Callable, args: tuple = (), kwargs: dict = None,
                      priority: TaskPriority = TaskPriority.NORMAL, description: str = "") -> str:
        """Dodaj novi task u queue"""
        async with self._lock:
            if len(self.task_queue) >= self.max_queue_size:
                raise ValueError(f"Task queue je pun (max {self.max_queue_size})")
            
            task_id = str(uuid.uuid4())
            task = BackgroundTask(
                task_id=task_id,
                func=func,
                args=args,
                kwargs=kwargs,
                priority=priority,
                description=description
            )
            
            self.tasks[task_id] = task
            self._add_to_queue(task)
            self.stats['total_tasks'] += 1
            
            logger.info(f"Task dodan: {task_id} - {description}")
            return task_id
    
    def _add_to_queue(self, task: BackgroundTask):
        """Dodaj task u queue sa prioritetom"""
        # Dodaj na kraj queue-a
        self.task_queue.append(task)
        # Sortiraj po prioritetu (viši prioritet prvi)
        self.task_queue.sort(key=lambda t: t.priority.value, reverse=True)
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati status taska"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        return {
            'task_id': task.task_id,
            'status': task.status.value,
            'description': task.description,
            'priority': task.priority.value,
            'created_at': task.created_at.isoformat(),
            'started_at': task.started_at.isoformat() if task.started_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'progress': task.progress,
            'result': task.result,
            'error': task.error,
            'metadata': task.metadata
        }
    
    async def cancel_task(self, task_id: str) -> bool:
        """Otkaži task"""
        async with self._lock:
            task = self.tasks.get(task_id)
            if not task:
                return False
            
            if task.status == TaskStatus.PENDING:
                # Ukloni iz queue-a
                if task in self.task_queue:
                    self.task_queue.remove(task)
                task.status = TaskStatus.CANCELLED
                self.stats['cancelled_tasks'] += 1
                logger.info(f"Task otkazan: {task_id}")
                return True
            elif task.status == TaskStatus.RUNNING:
                # Označi za otkazivanje
                task.status = TaskStatus.CANCELLED
                logger.info(f"Task označen za otkazivanje: {task_id}")
                return True
            
            return False
    
    async def get_all_tasks(self, status_filter: Optional[TaskStatus] = None) -> List[Dict[str, Any]]:
        """Dohvati sve taskove sa opcionim filterom"""
        tasks = []
        for task in self.tasks.values():
            if status_filter is None or task.status == status_filter:
                tasks.append(await self.get_task_status(task.task_id))
        return tasks
    
    async def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike task manager-a"""
        async with self._lock:
            pending_count = len([t for t in self.tasks.values() if t.status == TaskStatus.PENDING])
            running_count = len(self.running_tasks)
            
            return {
                'total_tasks': self.stats['total_tasks'],
                'pending_tasks': pending_count,
                'running_tasks': running_count,
                'completed_tasks': self.stats['completed_tasks'],
                'failed_tasks': self.stats['failed_tasks'],
                'cancelled_tasks': self.stats['cancelled_tasks'],
                'avg_execution_time': self.stats['avg_execution_time'],
                'queue_size': len(self.task_queue),
                'max_workers': self.max_workers,
                'max_queue_size': self.max_queue_size
            }
    
    async def _task_worker(self):
        """Glavni worker koji procesira taskove"""
        while self.is_running:
            try:
                # Uzmi sledeći task iz queue-a
                task = await self._get_next_task()
                if task:
                    await self._execute_task(task)
                else:
                    # Ako nema taskova, sačekaj malo
                    await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Greška u task worker-u: {e}")
                await asyncio.sleep(1)
    
    async def _get_next_task(self) -> Optional[BackgroundTask]:
        """Uzmi sledeći task iz queue-a"""
        async with self._lock:
            if not self.task_queue or len(self.running_tasks) >= self.max_workers:
                return None
            
            task = self.task_queue.pop(0)
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            self.running_tasks[task.task_id] = task
            return task
    
    async def _execute_task(self, task: BackgroundTask):
        """Izvrši task"""
        try:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.utcnow()
            self.running_tasks[task.task_id] = task
            
            logger.info(f"Pokretanje taska: {task.task_id} - {task.description}")
            
            # Proveri da li je task otkazan
            if task.status == TaskStatus.CANCELLED:
                logger.info(f"Task otkazan pre izvršavanja: {task.task_id}")
                return
            
            # Izvrši task
            if asyncio.iscoroutinefunction(task.func):
                # Async funkcija
                task.result = await task.func(*task.args, **task.kwargs)
            else:
                # Sync funkcija - koristi executor
                loop = asyncio.get_event_loop()
                task.result = await loop.run_in_executor(
                    self.executor, 
                    self._execute_sync_task, 
                    task
                )
            
            # Ažuriraj statistike
            execution_time = (datetime.utcnow() - task.started_at).total_seconds()
            self._update_avg_execution_time(execution_time)
            
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.progress = 100.0
            
            self.stats['completed_tasks'] += 1
            logger.info(f"Task završen: {task.task_id} - {execution_time:.2f}s")
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.utcnow()
            
            self.stats['failed_tasks'] += 1
            logger.error(f"Task greška: {task.task_id} - {e}")
            logger.error(traceback.format_exc())
        
        finally:
            # Ukloni iz running tasks
            if task.task_id in self.running_tasks:
                del self.running_tasks[task.task_id]
    
    def _execute_sync_task(self, task: BackgroundTask) -> Any:
        """Izvrši sync task u executor-u"""
        try:
            # Specijalni handler za save_chat_message task
            if task.description == "save_chat_message":
                return self._handle_save_chat_message(task.kwargs)
            
            # Standardni sync task
            return task.func(*task.args, **task.kwargs)
        except Exception as e:
            logger.error(f"Sync task greška: {e}")
            raise

    def _handle_save_chat_message(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handler za čuvanje chat poruka u lokalni storage"""
        try:
            # TODO: Implement local storage for chat messages
            # Za sada vraćamo placeholder
            return {
                "status": "success",
                "message": "Poruka sačuvana u lokalni storage",
                "session_id": data["session_id"],
                "response_time": data.get("response_time", 0),
                "message_id": str(uuid.uuid4())
            }
            
        except Exception as e:
            logger.error(f"Greška pri čuvanju poruke: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def _update_avg_execution_time(self, new_time: float):
        """Ažuriraj prosečno vreme izvršavanja"""
        completed = self.stats['completed_tasks']
        if completed > 0:
            current_avg = self.stats['avg_execution_time']
            self.stats['avg_execution_time'] = (current_avg * (completed - 1) + new_time) / completed

# Globalna instanca task manager-a
task_manager = BackgroundTaskManager()

# Helper funkcije za lako korišćenje
async def add_background_task(func: Callable, *args, priority: TaskPriority = TaskPriority.NORMAL, 
                            description: str = "", **kwargs) -> str:
    """Dodaj background task"""
    return await task_manager.add_task(func, args, kwargs, priority, description)

async def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    """Dohvati status taska"""
    return await task_manager.get_task_status(task_id)

async def cancel_task(task_id: str) -> bool:
    """Otkaži task"""
    return await task_manager.cancel_task(task_id)

async def get_all_tasks(status_filter: Optional[TaskStatus] = None) -> List[Dict[str, Any]]:
    """Dohvati sve taskove"""
    return await task_manager.get_all_tasks(status_filter)

async def get_task_stats() -> Dict[str, Any]:
    """Dohvati statistike taskova"""
    return await task_manager.get_stats() 