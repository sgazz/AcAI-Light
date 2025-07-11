"""
WebSocket Service - Lokalna verzija
Upravlja WebSocket konekcijama bez Supabase integracije
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
from fastapi import WebSocket, WebSocketDisconnect
from .config import Config
import uuid

logger = logging.getLogger(__name__)

class MessageType(str, Enum):
    """Tipovi WebSocket poruka"""
    CHAT = "chat"
    SYSTEM = "system"
    TYPING = "typing"
    STATUS = "status"
    JOIN = "join"
    LEAVE = "leave"
    ERROR = "error"

class WebSocketMessage:
    """WebSocket poruka"""
    
    def __init__(self, message_type: MessageType, content: Dict[str, Any], 
                 sender: str = "system", session_id: str = None, timestamp: str = None):
        self.message_type = message_type
        self.content = content
        self.sender = sender
        self.session_id = session_id
        self.timestamp = timestamp or datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertuj u dictionary"""
        return {
            "type": self.message_type.value,
            "content": self.content,
            "sender": self.sender,
            "session_id": self.session_id,
            "timestamp": self.timestamp
        }
    
    def to_json(self) -> str:
        """Konvertuj u JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WebSocketMessage':
        """Kreiraj WebSocketMessage iz dictionary-ja"""
        return cls(
            message_type=MessageType(data.get("type", "system")),
            content=data.get("content", {}),
            sender=data.get("sender", "system"),
            session_id=data.get("session_id"),
            timestamp=data.get("timestamp")
        )

class ConnectionManager:
    """Manager za WebSocket konekcije"""
    
    def __init__(self):
        """Inicijalizuj Connection Manager"""
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_data: Dict[str, Dict[str, Any]] = {}
        self.rooms: Dict[str, List[str]] = {}
        self.message_history: Dict[str, List[Dict[str, Any]]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str, user_data: Dict[str, Any] = None):
        """Prihvati novu WebSocket konekciju"""
        try:
            await websocket.accept()
            self.active_connections[client_id] = websocket
            self.connection_data[client_id] = {
                'connected_at': datetime.now().isoformat(),
                'user_data': user_data or {},
                'last_activity': datetime.now().isoformat(),
                'rooms': []
            }
            logger.info(f"WebSocket konekcija uspostavljena: {client_id}")
            
            # Pošalji welcome poruku
            await self.send_personal_message({
                'type': 'connection_established',
                'client_id': client_id,
                'timestamp': datetime.now().isoformat(),
                'message': 'WebSocket konekcija uspostavljena'
            }, client_id)
            
        except Exception as e:
            logger.error(f"Greška pri uspostavljanju WebSocket konekcije: {e}")
            raise
    
    def disconnect(self, client_id: str):
        """Prekini WebSocket konekciju"""
        try:
            if client_id in self.active_connections:
                del self.active_connections[client_id]
            
            if client_id in self.connection_data:
                # Ukloni iz svih soba
                user_rooms = self.connection_data[client_id].get('rooms', [])
                for room in user_rooms:
                    if room in self.rooms and client_id in self.rooms[room]:
                        self.rooms[room].remove(client_id)
                        if not self.rooms[room]:
                            del self.rooms[room]
                
                del self.connection_data[client_id]
            
            logger.info(f"WebSocket konekcija prekinuta: {client_id}")
            
        except Exception as e:
            logger.error(f"Greška pri prekidanju WebSocket konekcije: {e}")
    
    async def send_personal_message(self, message: Dict[str, Any], client_id: str):
        """Pošalji poruku specifičnom klijentu"""
        try:
            if client_id in self.active_connections:
                websocket = self.active_connections[client_id]
                await websocket.send_text(json.dumps(message))
                
                # Ažuriraj last activity
                if client_id in self.connection_data:
                    self.connection_data[client_id]['last_activity'] = datetime.now().isoformat()
                    
        except Exception as e:
            logger.error(f"Greška pri slanju personal poruke: {e}")
            # Ako ne može da pošalje poruku, prekini konekciju
            self.disconnect(client_id)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Pošalji poruku svim povezanim klijentima"""
        try:
            disconnected_clients = []
            
            for client_id, websocket in self.active_connections.items():
                try:
                    await websocket.send_text(json.dumps(message))
                    # Ažuriraj last activity
                    if client_id in self.connection_data:
                        self.connection_data[client_id]['last_activity'] = datetime.now().isoformat()
                except Exception as e:
                    logger.error(f"Greška pri broadcast-u za klijenta {client_id}: {e}")
                    disconnected_clients.append(client_id)
            
            # Prekini konekcije za klijente koji nisu dostupni
            for client_id in disconnected_clients:
                self.disconnect(client_id)
                
        except Exception as e:
            logger.error(f"Greška pri broadcast-u: {e}")
    
    async def send_to_room(self, message: Dict[str, Any], room_id: str, exclude_client: str = None):
        """Pošalji poruku svim klijentima u sobi"""
        try:
            if room_id not in self.rooms:
                logger.warning(f"Soba {room_id} ne postoji")
                return
            
            disconnected_clients = []
            
            for client_id in self.rooms[room_id]:
                if client_id == exclude_client:
                    continue
                
                try:
                    await self.send_personal_message(message, client_id)
                except Exception as e:
                    logger.error(f"Greška pri slanju u sobu za klijenta {client_id}: {e}")
                    disconnected_clients.append(client_id)
            
            # Prekini konekcije za klijente koji nisu dostupni
            for client_id in disconnected_clients:
                self.disconnect(client_id)
                
        except Exception as e:
            logger.error(f"Greška pri slanju u sobu: {e}")
    
    def join_room(self, client_id: str, room_id: str) -> bool:
        """Dodaj klijenta u sobu"""
        try:
            if client_id not in self.active_connections:
                logger.warning(f"Klijent {client_id} nije povezan")
                return False
            
            if room_id not in self.rooms:
                self.rooms[room_id] = []
            
            if client_id not in self.rooms[room_id]:
                self.rooms[room_id].append(client_id)
            
            if client_id in self.connection_data:
                if room_id not in self.connection_data[client_id]['rooms']:
                    self.connection_data[client_id]['rooms'].append(room_id)
            
            logger.info(f"Klijent {client_id} pridružen sobi {room_id}")
            return True
            
        except Exception as e:
            logger.error(f"Greška pri pridruživanju sobi: {e}")
            return False
    
    def leave_room(self, client_id: str, room_id: str) -> bool:
        """Ukloni klijenta iz sobe"""
        try:
            if room_id in self.rooms and client_id in self.rooms[room_id]:
                self.rooms[room_id].remove(client_id)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]
            
            if client_id in self.connection_data:
                if room_id in self.connection_data[client_id]['rooms']:
                    self.connection_data[client_id]['rooms'].remove(room_id)
            
            logger.info(f"Klijent {client_id} napustio sobu {room_id}")
            return True
            
        except Exception as e:
            logger.error(f"Greška pri napuštanju sobe: {e}")
            return False
    
    def get_room_participants(self, room_id: str) -> List[str]:
        """Dohvati listu učesnika u sobi"""
        return self.rooms.get(room_id, [])
    
    def get_client_rooms(self, client_id: str) -> List[str]:
        """Dohvati sobe u kojima je klijent"""
        if client_id in self.connection_data:
            return self.connection_data[client_id].get('rooms', [])
        return []
    
    def get_connection_info(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati informacije o konekciji"""
        return self.connection_data.get(client_id)
    
    def get_all_connections(self) -> Dict[str, Dict[str, Any]]:
        """Dohvati sve aktivne konekcije"""
        return self.connection_data.copy()
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike WebSocket sistema"""
        try:
            return {
                'total_connections': len(self.active_connections),
                'total_rooms': len(self.rooms),
                'rooms_info': {
                    room_id: {
                        'participant_count': len(participants),
                        'participants': participants
                    }
                    for room_id, participants in self.rooms.items()
                },
                'connection_details': {
                    client_id: {
                        'connected_at': data.get('connected_at'),
                        'last_activity': data.get('last_activity'),
                        'rooms': data.get('rooms', []),
                        'user_data': data.get('user_data', {})
                    }
                    for client_id, data in self.connection_data.items()
                },
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Greška pri dohvatanju WebSocket statistika: {e}")
            return {}

class WebSocketManager:
    """Manager za WebSocket konekcije sa sesijama"""
    
    def __init__(self):
        """Inicijalizuj WebSocket Manager"""
        self.connections: Dict[str, 'WebSocketConnection'] = {}
        self.session_connections: Dict[str, List[str]] = {}
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "total_messages": 0,
            "messages_received": 0,
            "messages_sent": 0,
            "created_at": datetime.now().isoformat()
        }
    
    async def connect(self, websocket: WebSocket, user_id: str = None, session_id: str = None) -> 'WebSocketConnection':
        """Prihvati novu WebSocket konekciju"""
        try:
        await websocket.accept()
        
            connection_id = str(uuid.uuid4())
            connection = WebSocketConnection(
                websocket=websocket,
                connection_id=connection_id,
                user_id=user_id,
                session_id=session_id
            )
            
            self.connections[connection_id] = connection
            
            # Dodaj u sesiju
            if session_id:
                if session_id not in self.session_connections:
                    self.session_connections[session_id] = []
                self.session_connections[session_id].append(connection_id)
            
            # Ažuriraj statistike
            self.stats["total_connections"] += 1
            self.stats["active_connections"] += 1
            
            logger.info(f"WebSocket konekcija uspostavljena: {connection_id}")
        return connection
    
        except Exception as e:
            logger.error(f"Greška pri uspostavljanju WebSocket konekcije: {e}")
            raise
    
    def disconnect(self, connection: 'WebSocketConnection'):
        """Prekini WebSocket konekciju"""
        try:
            connection_id = connection.connection_id
            session_id = connection.session_id
            
            if connection_id in self.connections:
                del self.connections[connection_id]
            
            # Ukloni iz sesije
            if session_id and session_id in self.session_connections:
                if connection_id in self.session_connections[session_id]:
                    self.session_connections[session_id].remove(connection_id)
                
                # Ako je sesija prazna, ukloni je
                if not self.session_connections[session_id]:
                    del self.session_connections[session_id]
            
            # Ažuriraj statistike
            self.stats["active_connections"] = max(0, self.stats["active_connections"] - 1)
            
            logger.info(f"WebSocket konekcija prekinuta: {connection_id}")
            
        except Exception as e:
            logger.error(f"Greška pri prekidanju WebSocket konekcije: {e}")
    
    async def broadcast_to_session(self, message: WebSocketMessage, session_id: str, exclude_user: str = None):
        """Pošalji poruku svim konekcijama u sesiji"""
        try:
            if session_id not in self.session_connections:
                return
            
            disconnected_connections = []
            
            for connection_id in self.session_connections[session_id]:
                if connection_id not in self.connections:
                    continue
                
                connection = self.connections[connection_id]
                
                # Preskoči ako je exclude_user
            if exclude_user and connection.user_id == exclude_user:
                continue
            
            try:
                await connection.send_message(message)
                self.stats["messages_sent"] += 1
            except Exception as e:
                    logger.error(f"Greška pri slanju poruke: {e}")
                    disconnected_connections.append(connection)
            
            # Prekini konekcije koje nisu dostupne
            for connection in disconnected_connections:
                self.disconnect(connection)
                
        except Exception as e:
            logger.error(f"Greška pri broadcast-u u sesiju: {e}")
    
    async def send_typing_indicator(self, session_id: str, user_id: str, is_typing: bool):
        """Pošalji typing indicator"""
        try:
        typing_message = WebSocketMessage(
            message_type=MessageType.TYPING,
            content={
                "user_id": user_id,
                "is_typing": is_typing
            },
            sender=user_id,
            session_id=session_id
        )
        
            await self.broadcast_to_session(typing_message, session_id)
            
        except Exception as e:
            logger.error(f"Greška pri slanju typing indicator-a: {e}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Dohvati statistike konekcija"""
        return {
            **self.stats,
            "sessions_count": len(self.session_connections),
            "connections_per_session": {
                session_id: len(connections) 
                for session_id, connections in self.session_connections.items()
            }
        }
    
    def get_session_info(self, session_id: str) -> Dict[str, Any]:
        """Dohvati informacije o sesiji"""
        if session_id not in self.session_connections:
            return {"error": "Sesija ne postoji"}
        
        connections = self.session_connections[session_id]
        active_connections = []
        
        for connection_id in connections:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                active_connections.append({
                    "connection_id": connection_id,
                    "user_id": connection.user_id,
                    "connected_at": connection.connected_at
                })
        
        return {
            "session_id": session_id,
            "connections_count": len(active_connections),
            "connections": active_connections
        }
    
    async def close_all_connections(self):
        """Zatvori sve konekcije"""
        try:
            for connection in list(self.connections.values()):
            try:
                await connection.websocket.close()
                except:
                    pass
        
            self.connections.clear()
        self.session_connections.clear()
        self.stats["active_connections"] = 0
        
            logger.info("Sve WebSocket konekcije zatvorene")
            
        except Exception as e:
            logger.error(f"Greška pri zatvaranju konekcija: {e}")

class WebSocketConnection:
    """WebSocket konekcija"""
    
    def __init__(self, websocket: WebSocket, connection_id: str, user_id: str = None, session_id: str = None):
        self.websocket = websocket
        self.connection_id = connection_id
        self.user_id = user_id
        self.session_id = session_id
        self.connected_at = datetime.now().isoformat()
        self.is_typing = False
    
    async def send_message(self, message: WebSocketMessage):
        """Pošalji poruku kroz konekciju"""
        try:
            await self.websocket.send_text(message.to_json())
        except Exception as e:
            logger.error(f"Greška pri slanju poruke: {e}")
            raise

# Globalne instance
manager = ConnectionManager()
websocket_manager = WebSocketManager()

class WebSocketService:
    """WebSocket servis za upravljanje konekcijama"""
    
    def __init__(self):
        """Inicijalizuj WebSocket servis"""
        self.manager = manager
        self.message_handlers = {
            'join_room': self._handle_join_room,
            'leave_room': self._handle_leave_room,
            'send_message': self._handle_send_message,
            'get_rooms': self._handle_get_rooms,
            'get_participants': self._handle_get_participants,
            'ping': self._handle_ping,
            'pong': self._handle_pong
        }
    
    async def handle_websocket(self, websocket: WebSocket, client_id: str, user_data: Dict[str, Any] = None):
        """Glavni handler za WebSocket konekcije"""
        try:
            await self.manager.connect(websocket, client_id, user_data)
            
            # Glavna petlja za primanje poruka
            while True:
                try:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    # Ažuriraj last activity
                    if client_id in self.manager.connection_data:
                        self.manager.connection_data[client_id]['last_activity'] = datetime.now().isoformat()
                    
                    # Obradi poruku
                    await self._process_message(client_id, message)
                    
                except WebSocketDisconnect:
                    logger.info(f"WebSocket prekinut za klijenta: {client_id}")
                    break
                except json.JSONDecodeError:
                    logger.error(f"Nevažeći JSON format od klijenta: {client_id}")
                    await self.manager.send_personal_message({
                        'type': 'error',
                        'message': 'Nevažeći format poruke'
                    }, client_id)
                except Exception as e:
                    logger.error(f"Greška pri obradi poruke od klijenta {client_id}: {e}")
                    await self.manager.send_personal_message({
                        'type': 'error',
                        'message': 'Greška pri obradi poruke'
                    }, client_id)
                    
        except Exception as e:
            logger.error(f"Greška u WebSocket handler-u za klijenta {client_id}: {e}")
        finally:
            self.manager.disconnect(client_id)
    
    async def _process_message(self, client_id: str, message: Dict[str, Any]):
        """Obradi primljenu poruku"""
        try:
            message_type = message.get('type')
            
            if message_type in self.message_handlers:
                await self.message_handlers[message_type](client_id, message)
            else:
                logger.warning(f"Nepoznat tip poruke: {message_type}")
                await self.manager.send_personal_message({
                    'type': 'error',
                    'message': f'Nepoznat tip poruke: {message_type}'
                }, client_id)
                
        except Exception as e:
            logger.error(f"Greška pri obradi poruke: {e}")
            await self.manager.send_personal_message({
                'type': 'error',
                'message': 'Greška pri obradi poruke'
            }, client_id)
    
    async def _handle_join_room(self, client_id: str, message: Dict[str, Any]):
        """Obradi zahtev za pridruživanje sobi"""
        try:
            room_id = message.get('room_id')
            if not room_id:
                await self.manager.send_personal_message({
                    'type': 'error',
                    'message': 'room_id je obavezan'
                }, client_id)
                return
            
            success = self.manager.join_room(client_id, room_id)
            
            if success:
                # Obavesti ostale u sobi
                await self.manager.send_to_room({
                    'type': 'user_joined',
                    'room_id': room_id,
                    'client_id': client_id,
                    'timestamp': datetime.now().isoformat()
                }, room_id, exclude_client=client_id)
                
                # Potvrdi klijentu
                await self.manager.send_personal_message({
                    'type': 'room_joined',
                    'room_id': room_id,
                    'participants': self.manager.get_room_participants(room_id),
                    'timestamp': datetime.now().isoformat()
                }, client_id)
            else:
                await self.manager.send_personal_message({
                    'type': 'error',
                    'message': 'Greška pri pridruživanju sobi'
                }, client_id)
                
        except Exception as e:
            logger.error(f"Greška pri pridruživanju sobi: {e}")
            await self.manager.send_personal_message({
                'type': 'error',
                'message': 'Greška pri pridruživanju sobi'
            }, client_id)
    
    async def _handle_leave_room(self, client_id: str, message: Dict[str, Any]):
        """Obradi zahtev za napuštanje sobe"""
        try:
            room_id = message.get('room_id')
            if not room_id:
                await self.manager.send_personal_message({
                    'type': 'error',
                    'message': 'room_id je obavezan'
                }, client_id)
                return
            
            success = self.manager.leave_room(client_id, room_id)
            
            if success:
                # Obavesti ostale u sobi
                await self.manager.send_to_room({
                    'type': 'user_left',
                    'room_id': room_id,
                    'client_id': client_id,
                    'timestamp': datetime.now().isoformat()
                }, room_id, exclude_client=client_id)
                
                # Potvrdi klijentu
                await self.manager.send_personal_message({
                    'type': 'room_left',
                    'room_id': room_id,
                    'timestamp': datetime.now().isoformat()
                }, client_id)
            else:
                await self.manager.send_personal_message({
                    'type': 'error',
                    'message': 'Greška pri napuštanju sobe'
                }, client_id)
                
        except Exception as e:
            logger.error(f"Greška pri napuštanju sobe: {e}")
            await self.manager.send_personal_message({
                'type': 'error',
                'message': 'Greška pri napuštanju sobe'
            }, client_id)
    
    async def _handle_send_message(self, client_id: str, message: Dict[str, Any]):
        """Obradi slanje poruke"""
        try:
            room_id = message.get('room_id')
            content = message.get('content')
            
            if not room_id or not content:
                await self.manager.send_personal_message({
                    'type': 'error',
                    'message': 'room_id i content su obavezni'
                }, client_id)
                return
            
            # Kreiraj poruku
            chat_message = {
                'type': 'chat_message',
                'room_id': room_id,
                'client_id': client_id,
                'content': content,
                'timestamp': datetime.now().isoformat()
            }
            
            # Pošalji u sobu
            await self.manager.send_to_room(chat_message, room_id)
            
            # Sačuvaj u istoriju
            if room_id not in self.manager.message_history:
                self.manager.message_history[room_id] = []
            
            self.manager.message_history[room_id].append(chat_message)
            
            # Održi samo poslednjih 100 poruka
            if len(self.manager.message_history[room_id]) > 100:
                self.manager.message_history[room_id] = self.manager.message_history[room_id][-100:]
                
        except Exception as e:
            logger.error(f"Greška pri slanju poruke: {e}")
            await self.manager.send_personal_message({
                'type': 'error',
                'message': 'Greška pri slanju poruke'
            }, client_id)
    
    async def _handle_get_rooms(self, client_id: str, message: Dict[str, Any]):
        """Obradi zahtev za listu soba"""
        try:
            rooms_info = {}
            for room_id, participants in self.manager.rooms.items():
                rooms_info[room_id] = {
                    'participant_count': len(participants),
                    'participants': participants
                }
            
            await self.manager.send_personal_message({
                'type': 'rooms_list',
                'rooms': rooms_info,
                'timestamp': datetime.now().isoformat()
            }, client_id)
            
        except Exception as e:
            logger.error(f"Greška pri dohvatanju soba: {e}")
            await self.manager.send_personal_message({
                'type': 'error',
                'message': 'Greška pri dohvatanju soba'
            }, client_id)
    
    async def _handle_get_participants(self, client_id: str, message: Dict[str, Any]):
        """Obradi zahtev za listu učesnika u sobi"""
        try:
            room_id = message.get('room_id')
            if not room_id:
                await self.manager.send_personal_message({
                    'type': 'error',
                    'message': 'room_id je obavezan'
                }, client_id)
                return
            
            participants = self.manager.get_room_participants(room_id)
            
            await self.manager.send_personal_message({
                'type': 'participants_list',
                'room_id': room_id,
                'participants': participants,
                'timestamp': datetime.now().isoformat()
            }, client_id)
            
        except Exception as e:
            logger.error(f"Greška pri dohvatanju učesnika: {e}")
            await self.manager.send_personal_message({
                'type': 'error',
                'message': 'Greška pri dohvatanju učesnika'
            }, client_id)
    
    async def _handle_ping(self, client_id: str, message: Dict[str, Any]):
        """Obradi ping poruku"""
        try:
            await self.manager.send_personal_message({
                'type': 'pong',
                'timestamp': datetime.now().isoformat()
            }, client_id)
            
        except Exception as e:
            logger.error(f"Greška pri ping/pong: {e}")
    
    async def _handle_pong(self, client_id: str, message: Dict[str, Any]):
        """Obradi pong poruku"""
        # Samo loguj da je pong primljen
        logger.debug(f"Pong primljen od klijenta: {client_id}")

# Globalna instanca
websocket_service = WebSocketService() 