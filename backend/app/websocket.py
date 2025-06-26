import asyncio
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class MessageType(Enum):
    CHAT = "chat"
    TYPING = "typing"
    STATUS = "status"
    SYSTEM = "system"
    JOIN = "join"
    LEAVE = "leave"

class ConnectionStatus(Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    TYPING = "typing"
    IDLE = "idle"

class WebSocketMessage:
    """Reprezentuje WebSocket poruku"""
    
    def __init__(self, message_type: MessageType, content: Any, sender: str = None, 
                 session_id: str = None, timestamp: datetime = None):
        self.message_type = message_type
        self.content = content
        self.sender = sender
        self.session_id = session_id
        self.timestamp = timestamp or datetime.utcnow()
        self.message_id = str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertuj u dictionary za JSON serializaciju"""
        return {
            "message_id": self.message_id,
            "type": self.message_type.value,
            "content": self.content,
            "sender": self.sender,
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WebSocketMessage':
        """Kreiraj WebSocketMessage iz dictionary-a"""
        return cls(
            message_type=MessageType(data["type"]),
            content=data["content"],
            sender=data.get("sender"),
            session_id=data.get("session_id"),
            timestamp=datetime.fromisoformat(data["timestamp"]) if data.get("timestamp") else None
        )

class WebSocketConnection:
    """Reprezentuje jednu WebSocket konekciju"""
    
    def __init__(self, websocket: WebSocket, user_id: str = None, session_id: str = None):
        self.websocket = websocket
        self.user_id = user_id or str(uuid.uuid4())
        self.session_id = session_id or str(uuid.uuid4())
        self.status = ConnectionStatus.CONNECTED
        self.connected_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.is_typing = False
    
    async def send_message(self, message: WebSocketMessage):
        """Pošalji poruku kroz WebSocket"""
        try:
            await self.websocket.send_text(json.dumps(message.to_dict()))
            self.last_activity = datetime.utcnow()
        except Exception as e:
            logger.error(f"Greška pri slanju poruke: {e}")
            raise
    
    async def send_json(self, data: Dict[str, Any]):
        """Pošalji JSON podatke"""
        try:
            await self.websocket.send_text(json.dumps(data))
            self.last_activity = datetime.utcnow()
        except Exception as e:
            logger.error(f"Greška pri slanju JSON-a: {e}")
            raise
    
    def update_activity(self):
        """Ažuriraj vreme poslednje aktivnosti"""
        self.last_activity = datetime.utcnow()

class WebSocketManager:
    """Upravlja WebSocket konekcijama i porukama"""
    
    def __init__(self):
        self.active_connections: List[WebSocketConnection] = []
        self.session_connections: Dict[str, List[WebSocketConnection]] = {}
        self.user_connections: Dict[str, WebSocketConnection] = {}
        self._lock = asyncio.Lock()
        
        # Statistike
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "total_messages": 0,
            "messages_sent": 0,
            "messages_received": 0
        }
    
    async def connect(self, websocket: WebSocket, user_id: str = None, session_id: str = None) -> WebSocketConnection:
        """Prihvati novu WebSocket konekciju"""
        await websocket.accept()
        
        connection = WebSocketConnection(websocket, user_id, session_id)
        
        async with self._lock:
            self.active_connections.append(connection)
            self.user_connections[connection.user_id] = connection
            
            # Dodaj u session connections
            if connection.session_id not in self.session_connections:
                self.session_connections[connection.session_id] = []
            self.session_connections[connection.session_id].append(connection)
            
            # Ažuriraj statistike
            self.stats["total_connections"] += 1
            self.stats["active_connections"] = len(self.active_connections)
        
        # Pošalji welcome poruku
        welcome_message = WebSocketMessage(
            message_type=MessageType.SYSTEM,
            content={
                "message": "Uspešno povezan sa chat serverom",
                "user_id": connection.user_id,
                "session_id": connection.session_id
            },
            sender="system"
        )
        
        await connection.send_message(welcome_message)
        
        # Objavi da se korisnik pridružio
        join_message = WebSocketMessage(
            message_type=MessageType.JOIN,
            content={
                "user_id": connection.user_id,
                "session_id": connection.session_id
            },
            sender=connection.user_id
        )
        
        await self.broadcast_to_session(join_message, connection.session_id, exclude_user=connection.user_id)
        
        logger.info(f"Korisnik {connection.user_id} se pridružio sesiji {connection.session_id}")
        return connection
    
    def disconnect(self, connection: WebSocketConnection):
        """Odjavi WebSocket konekciju"""
        if connection in self.active_connections:
            self.active_connections.remove(connection)
        
        if connection.user_id in self.user_connections:
            del self.user_connections[connection.user_id]
        
        # Ukloni iz session connections
        if connection.session_id in self.session_connections:
            if connection in self.session_connections[connection.session_id]:
                self.session_connections[connection.session_id].remove(connection)
            
            # Ako je session prazan, obriši ga
            if not self.session_connections[connection.session_id]:
                del self.session_connections[connection.session_id]
        
        self.stats["active_connections"] = len(self.active_connections)
        
        logger.info(f"Korisnik {connection.user_id} se odjavio iz sesije {connection.session_id}")
    
    async def send_personal_message(self, message: WebSocketMessage, user_id: str):
        """Pošalji poruku specifičnom korisniku"""
        connection = self.user_connections.get(user_id)
        if connection:
            await connection.send_message(message)
            self.stats["messages_sent"] += 1
        else:
            logger.warning(f"Korisnik {user_id} nije povezan")
    
    async def broadcast_to_session(self, message: WebSocketMessage, session_id: str, exclude_user: str = None):
        """Pošalji poruku svim korisnicima u sesiji"""
        connections = self.session_connections.get(session_id, [])
        
        for connection in connections:
            if exclude_user and connection.user_id == exclude_user:
                continue
            
            try:
                await connection.send_message(message)
                self.stats["messages_sent"] += 1
            except Exception as e:
                logger.error(f"Greška pri slanju broadcast poruke: {e}")
                # Označi konekciju za uklanjanje
                connection.status = ConnectionStatus.DISCONNECTED
    
        # Očisti prekinute konekcije
        await self._cleanup_disconnected()
    
    async def broadcast_to_all(self, message: WebSocketMessage, exclude_user: str = None):
        """Pošalji poruku svim povezanim korisnicima"""
        for connection in self.active_connections:
            if exclude_user and connection.user_id == exclude_user:
                continue
            
            try:
                await connection.send_message(message)
                self.stats["messages_sent"] += 1
            except Exception as e:
                logger.error(f"Greška pri slanju broadcast poruke: {e}")
                connection.status = ConnectionStatus.DISCONNECTED
        
        await self._cleanup_disconnected()
    
    async def send_typing_indicator(self, session_id: str, user_id: str, is_typing: bool):
        """Pošalji typing indicator"""
        typing_message = WebSocketMessage(
            message_type=MessageType.TYPING,
            content={
                "user_id": user_id,
                "is_typing": is_typing
            },
            sender=user_id,
            session_id=session_id
        )
        
        await self.broadcast_to_session(typing_message, session_id, exclude_user=user_id)
    
    async def send_status_update(self, user_id: str, status: ConnectionStatus):
        """Pošalji status update"""
        connection = self.user_connections.get(user_id)
        if connection:
            connection.status = status
            
            status_message = WebSocketMessage(
                message_type=MessageType.STATUS,
                content={
                    "user_id": user_id,
                    "status": status.value
                },
                sender=user_id,
                session_id=connection.session_id
            )
            
            await self.broadcast_to_session(status_message, connection.session_id, exclude_user=user_id)
    
    async def _cleanup_disconnected(self):
        """Očisti prekinute konekcije"""
        disconnected = [conn for conn in self.active_connections if conn.status == ConnectionStatus.DISCONNECTED]
        
        for connection in disconnected:
            self.disconnect(connection)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Dohvati statistike konekcija"""
        return {
            "active_connections": len(self.active_connections),
            "total_connections": self.stats["total_connections"],
            "total_messages": self.stats["total_messages"],
            "messages_sent": self.stats["messages_sent"],
            "messages_received": self.stats["messages_received"],
            "active_sessions": len(self.session_connections),
            "unique_users": len(self.user_connections)
        }
    
    def get_session_info(self, session_id: str) -> Dict[str, Any]:
        """Dohvati informacije o sesiji"""
        connections = self.session_connections.get(session_id, [])
        
        return {
            "session_id": session_id,
            "participants": [
                {
                    "user_id": conn.user_id,
                    "status": conn.status.value,
                    "connected_at": conn.connected_at.isoformat(),
                    "last_activity": conn.last_activity.isoformat(),
                    "is_typing": conn.is_typing
                }
                for conn in connections
            ],
            "participant_count": len(connections)
        }

# Globalna instanca WebSocket manager-a
websocket_manager = WebSocketManager()

# Helper funkcije
async def get_websocket_manager() -> WebSocketManager:
    """Dohvati WebSocket manager instancu"""
    return websocket_manager 