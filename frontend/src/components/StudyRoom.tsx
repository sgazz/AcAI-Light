'use client';

import { useState, useEffect, useRef } from 'react';
import { FaUsers, FaPlus, FaSignInAlt, FaSignOutAlt, FaCopy, FaCrown, FaUser } from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';
import { useClipboard } from '../utils/clipboard';
import { 
  createStudyRoom, 
  listStudyRooms, 
  joinStudyRoom, 
  getStudyRoomMembers, 
  sendStudyRoomMessage, 
  getStudyRoomMessages, 
  leaveStudyRoom,
  STUDY_ROOM_WS_URL
} from '../utils/api';

interface StudyRoom {
  room_id: string;
  name: string;
  description: string;
  subject: string;
  admin_user_id: string;
  user_role: string;
  invite_code: string;
  created_at: string;
}

interface RoomMember {
  user_id: string;
  username: string;
  role: 'admin' | 'member' | 'guest';
  joined_at: string;
  is_active: boolean;
}

interface RoomMessage {
  message_id: string;
  user_id: string;
  username: string;
  content: string;
  message_type: string;
  timestamp: string;
}

export default function StudyRoom() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    subject: '',
    max_participants: 10
  });
  const [joinForm, setJoinForm] = useState({
    invite_code: '',
    username: ''
  });
  
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`);
  const [currentUsername, setCurrentUsername] = useState(`Student_${Math.random().toString(36).substr(2, 4)}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showError, showSuccess } = useErrorToast();
  const { copyToClipboard } = useClipboard();

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Automatsko osvežavanje poruka kada je korisnik u sobi
  useEffect(() => {
    if (!currentRoom) return;

    const refreshMessages = async () => {
      try {
        const messagesResponse = await getStudyRoomMessages(currentRoom.room_id);
        if (messagesResponse.status === 'success') {
          const newMessages = messagesResponse.messages || [];
          console.log('🔍 Učitane poruke:', newMessages.map((msg: RoomMessage) => ({
            user_id: msg.user_id,
            username: msg.username,
            message_type: msg.message_type,
            isAI: msg.user_id === 'ai_assistant' || msg.username === 'AI Asistent'
          })));
          setMessages(newMessages);
        }
      } catch (error) {
        console.error('Greška pri osvežavanju poruka:', error);
      }
    };

    // Osveži poruke svakih 3 sekunde
    const interval = setInterval(refreshMessages, 3000);

    return () => clearInterval(interval);
  }, [currentRoom]);

  const refreshMessages = async () => {
    if (!currentRoom) return;
    
    try {
      const messagesResponse = await getStudyRoomMessages(currentRoom.room_id);
      if (messagesResponse.status === 'success') {
        const newMessages = messagesResponse.messages || [];
        console.log('🔍 Učitane poruke:', newMessages.map((msg: RoomMessage) => ({
          user_id: msg.user_id,
          username: msg.username,
          message_type: msg.message_type,
          isAI: msg.user_id === 'ai_assistant' || msg.username === 'AI Asistent'
        })));
        setMessages(newMessages);
        showSuccess('Poruke osvežene', 'Osvežavanje');
      }
    } catch (error: any) {
      showError('Greška pri osvežavanju poruka', 'Greška osvežavanja');
    }
  };

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const response = await listStudyRooms(currentUserId);
      if (response.status === 'success') {
        setRooms(response.rooms || []);
      } else {
        throw new Error(response.message || 'Greška pri učitavanju soba');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri učitavanju soba', 'Greška učitavanja');
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async () => {
    try {
      if (!createForm.name.trim()) {
        showError('Naziv sobe je obavezan', 'Validacija');
        return;
      }

      const response = await createStudyRoom({
        ...createForm,
        admin_user_id: currentUserId
      });

      if (response.status === 'success') {
        showSuccess('Soba uspešno kreirana', 'Kreiranje sobe');
        setShowCreateModal(false);
        setCreateForm({ name: '', description: '', subject: '', max_participants: 10 });
        await loadRooms();
      } else {
        throw new Error(response.message || 'Greška pri kreiranju sobe');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju sobe', 'Greška kreiranja');
    }
  };

  const joinRoom = async () => {
    try {
      if (!joinForm.invite_code.trim() || !joinForm.username.trim()) {
        showError('Kod sobe i korisničko ime su obavezni', 'Validacija');
        return;
      }

      const response = await joinStudyRoom({
        invite_code: joinForm.invite_code,
        user_id: currentUserId,
        username: joinForm.username
      });

      if (response.status === 'success') {
        showSuccess('Uspešno pridružili sobi', 'Pridruživanje');
        setCurrentUsername(joinForm.username);
        setShowJoinModal(false);
        setJoinForm({ invite_code: '', username: '' });
        await loadRooms();
      } else {
        throw new Error(response.message || 'Greška pri pridruživanju sobi');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri pridruživanju sobi', 'Greška pridruživanja');
    }
  };

  const enterRoom = async (room: StudyRoom) => {
    try {
      setCurrentRoom(room);
      
      const membersResponse = await getStudyRoomMembers(room.room_id);
      if (membersResponse.status === 'success') {
        setMembers(membersResponse.members || []);
      }

      const messagesResponse = await getStudyRoomMessages(room.room_id);
      if (messagesResponse.status === 'success') {
        const loadedMessages = messagesResponse.messages || [];
        console.log('📥 Učitane poruke iz baze:', loadedMessages.length);
        
        // Test da li se AI poruke prepoznaju
        loadedMessages.forEach((msg: RoomMessage, index: number) => {
          const isAI = msg.user_id === 'ai_assistant' || msg.username === 'AI Asistent';
          console.log(`📝 Poruka ${index + 1}:`, {
            user_id: msg.user_id,
            username: msg.username,
            message_type: msg.message_type,
            isAI: isAI,
            content: msg.content.substring(0, 50) + '...'
          });
        });
        
        setMessages(loadedMessages);
      }

      connectWebSocket(room.room_id);
      
    } catch (error: any) {
      showError(error.message || 'Greška pri ulasku u sobu', 'Greška ulaska');
    }
  };

  const connectWebSocket = (roomId: string) => {
    try {
      const wsUrl = STUDY_ROOM_WS_URL(roomId, currentUserId, currentUsername);
      console.log('🔌 Povezivanje na WebSocket:', wsUrl);
      console.log('🔌 Room ID:', roomId);
      console.log('🔌 User ID:', currentUserId);
      console.log('🔌 Username:', currentUsername);
      
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('✅ WebSocket konekcija uspostavljena');
        console.log('✅ WebSocket readyState:', websocket.readyState);
        
        // Pošalji inicijalnu poruku sa korisničkim podacima
        websocket.send(JSON.stringify({
          user_id: currentUserId,
          username: currentUsername
        }));
        
        setIsConnected(true);
        showSuccess('Povezani sa sobom', 'WebSocket');
      };

      websocket.onmessage = (event) => {
        console.log('📨 WebSocket poruka primljena:', event.data);
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat') {
          const isAI = data.content.user_id === 'ai_assistant' || data.content.username === 'AI Asistent';
          setMessages(prev => [...prev, {
            message_id: data.message_id || Date.now().toString(),
            user_id: data.content.user_id,
            username: data.content.username,
            content: data.content.content,
            message_type: isAI ? 'ai' : 'chat',
            timestamp: data.content.timestamp
          }]);
        }
      };

      websocket.onclose = (event) => {
        console.log('❌ WebSocket konekcija zatvorena:', event.code, event.reason);
        console.log('❌ Close event details:', event);
        setIsConnected(false);
        showError('Veza sa sobom je prekinuta', 'WebSocket');
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket greška:', error);
        console.error('❌ Error event details:', error);
        console.error('❌ WebSocket readyState:', websocket.readyState);
        setIsConnected(false);
        showError('Greška pri povezivanju sa sobom', 'WebSocket');
      };

      setWs(websocket);
    } catch (error: any) {
      console.error('❌ Greška pri kreiranju WebSocket-a:', error);
      setIsConnected(false);
      showError('Greška pri povezivanju sa sobom', 'WebSocket');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !currentRoom) return;

    try {
      // Pošalji kroz WebSocket ako je povezan, inače kroz HTTP
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('📤 Slanje poruke kroz WebSocket');
        ws.send(JSON.stringify({
          type: 'chat',
          content: input
        }));
      } else {
        console.log('📤 Slanje poruke kroz HTTP (WebSocket nije povezan)');
        // Pošalji kroz HTTP endpoint samo ako WebSocket nije povezan
      await sendStudyRoomMessage(currentRoom.room_id, {
        user_id: currentUserId,
        username: currentUsername,
        content: input,
        type: 'chat'
      });
      }

      setInput('');
      
      // Osveži poruke nakon slanja (samo ako nismo povezani kroz WebSocket)
      if (!ws || ws.readyState !== WebSocket.OPEN) {
      setTimeout(() => {
        refreshMessages();
      }, 1000);
      }
      
    } catch (error: any) {
      showError('Greška pri slanju poruke', 'Greška slanja');
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom) return;

    try {
      if (ws) {
        ws.close();
        setWs(null);
      }

      await leaveStudyRoom(currentRoom.room_id, currentUserId);
      
      setCurrentRoom(null);
      setMembers([]);
      setMessages([]);
      setIsConnected(false);
      
      showSuccess('Uspešno napustili sobu', 'Napuštanje sobe');
    } catch (error: any) {
      showError(error.message || 'Greška pri napuštanju sobe', 'Greška napuštanja');
    }
  };

  const copyInviteCode = (code: string) => {
    copyToClipboard(code, 'Kod sobe kopiran');
  };

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  if (currentRoom) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <FaUsers className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{currentRoom.name}</h2>
              <p className="text-sm text-slate-300">{currentRoom.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Povezan' : 'Nepovezan'}
              </span>
            </div>
            
            <button
              onClick={refreshMessages}
              className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
              title="Osveži poruke"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm">Osveži</span>
            </button>
            
            <button
              onClick={() => copyInviteCode(currentRoom.invite_code)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              <FaCopy size={14} />
              <span className="text-sm font-mono">{currentRoom.invite_code}</span>
            </button>
            
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <FaSignOutAlt size={14} />
              <span>Napusti</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 mt-8">
                  <FaUsers size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Nema poruka u ovoj sobi</p>
                  <p className="text-sm">Počnite razgovor!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isAI = message.user_id === 'ai_assistant' || message.username === 'AI Asistent';
                  const isMe = message.user_id === currentUserId;
                  return (
                    <div key={message.message_id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg flex items-start gap-3 transition-all duration-300 hover:scale-[1.02]
                        ${isAI
                          ? 'bg-gradient-to-br from-slate-800/50 to-slate-700/50 text-white border border-white/10 rounded-bl-md'
                          : isMe
                            ? 'bg-gradient-to-br from-blue-500/20 to-purple-600/20 text-white border border-blue-500/30 rounded-br-md'
                            : 'bg-slate-700/50 text-slate-200 border border-slate-600/30 rounded-bl-md'}
                      `}>
                        {/* Avatar - samo za AI i druge korisnike, ne za mene */}
                        {!isMe && (
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white font-bold text-lg
                            ${isAI 
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                              : 'bg-gradient-to-br from-blue-500/40 to-purple-500/40'
                            }`}>
                            {isAI ? '🤖' : (message.username?.[0]?.toUpperCase() || 'U')}
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium ${isAI ? 'text-green-300' : isMe ? 'text-blue-300' : 'text-slate-300'}`}>
                              {isAI ? 'AI Asistent' : isMe ? 'Vi' : message.username}
                            </span>
                            {message.user_id === currentRoom.admin_user_id && !isAI && (
                              <FaCrown className="text-yellow-400" size={12} />
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                          <p className="text-xs opacity-60 mt-2">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {/* Avatar za moje poruke - desno */}
                        {isMe && (
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                            U
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Upišite poruku..."
                  className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Pošalji
                </button>
              </div>
            </form>
          </div>

          <div className="w-64 bg-slate-800/30 border-l border-white/10 p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FaUsers size={16} />
              Članovi ({members.length})
            </h3>
            
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                    {member.role === 'admin' ? (
                      <FaCrown className="text-yellow-400" size={14} />
                    ) : (
                      <FaUser className="text-slate-300" size={14} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{member.username}</p>
                    <p className="text-xs text-slate-400 capitalize">{member.role}</p>
                  </div>
                  {member.user_id === currentUserId && (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
            <FaUsers className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Study Room</h1>
            <p className="text-slate-400">Kolaborativno učenje sa drugima</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-xl hover:bg-green-500/30 transition-colors"
          >
            <FaSignInAlt size={16} />
            <span>Pridruži se</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            <FaPlus size={16} />
            <span>Kreiraj sobu</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Učitavanje soba...</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center h-full flex items-center justify-center">
            <div>
              <FaUsers size={64} className="mx-auto mb-6 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Nema soba</h3>
              <p className="text-slate-400 mb-6">Kreirajte novu sobu ili se pridružite postojećoj</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  <FaPlus size={16} />
                  <span>Kreiraj sobu</span>
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-300 rounded-xl hover:bg-green-500/30 transition-colors"
                >
                  <FaSignInAlt size={16} />
                  <span>Pridruži se</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.room_id} className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                      <FaUsers className="text-blue-400" size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{room.name}</h3>
                      <p className="text-sm text-slate-400">{room.subject || 'Opšta tema'}</p>
                    </div>
                  </div>
                  {room.user_role === 'admin' && (
                    <FaCrown className="text-yellow-400" size={16} />
                  )}
                </div>
                
                <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                  {room.description || 'Nema opisa'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Kod:</span>
                    <code className="text-xs bg-slate-700 px-2 py-1 rounded text-blue-300 font-mono">
                      {room.invite_code}
                    </code>
                  </div>
                  
                  <button
                    onClick={() => enterRoom(room)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <span className="text-sm">Uđi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Kreiraj novu sobu</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Naziv sobe *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Unesite naziv sobe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Opis</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Opis sobe (opciono)"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Predmet</label>
                <input
                  type="text"
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({...createForm, subject: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Predmet (opciono)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Maksimalan broj članova</label>
                <input
                  type="number"
                  value={createForm.max_participants}
                  onChange={(e) => setCreateForm({...createForm, max_participants: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  min="2"
                  max="50"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={createRoom}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                Kreiraj
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Pridruži se sobi</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Kod sobe *</label>
                <input
                  type="text"
                  value={joinForm.invite_code}
                  onChange={(e) => setJoinForm({...joinForm, invite_code: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 font-mono"
                  placeholder="Unesite kod sobe"
                  maxLength={8}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Vaše ime *</label>
                <input
                  type="text"
                  value={joinForm.username}
                  onChange={(e) => setJoinForm({...joinForm, username: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Unesite vaše ime"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={joinRoom}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                Pridruži se
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 