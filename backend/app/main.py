import os
import sys
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ollama import Client
from sqlalchemy.orm import Session
from typing import List
import uuid

# Učitaj environment varijable
load_dotenv()

# Inicijalizuj Ollama klijenta
client = Client(host='http://localhost:11434')

app = FastAPI()

# Dodaj CORS middleware za frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import models i prompts nakon što je app kreiran
from .models import get_db, ChatMessage
from .prompts import SYSTEM_PROMPT, CONTEXT_PROMPT

def get_conversation_context(session_id: str, db: Session, max_messages: int = 5) -> str:
    """Dohvati prethodne poruke za kontekst"""
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.desc()).limit(max_messages).all()
        
        if not messages:
            return ""
        
        # Obrni redosled da bude hronološki
        messages.reverse()
        
        context = []
        for msg in messages:
            role = "korisnik" if msg.sender == "user" else "AI"
            context.append(f"{role}: {msg.content}")
        
        return "\n".join(context)
    except Exception as e:
        print(f"Greška pri dohvatanju konteksta: {e}")
        return ""

def create_enhanced_prompt(user_message: str, context: str = "") -> str:
    """Kreira poboljšani prompt sa sistem instrukcijama i kontekstom"""
    prompt_parts = [SYSTEM_PROMPT]
    
    if context:
        context_prompt = CONTEXT_PROMPT.format(context=context)
        prompt_parts.append(context_prompt)
    
    prompt_parts.append(f"\nKorisnik: {user_message}")
    prompt_parts.append("\nAI Study Assistant:")
    
    return "\n\n".join(prompt_parts)

@app.get("/")
def read_root():
    return {"message": "Backend radi!"}

@app.get("/test-model")
async def test_model():
    try:
        # Test poziv ka Ollama API-ju koristeći Mistral model (bez await)
        enhanced_prompt = create_enhanced_prompt("Zdravo! Kako si?")
        response = client.chat(model='mistral', 
            messages=[{
                'role': 'user',
                'content': enhanced_prompt
            }]
        )
        return {"status": "success", "response": response['message']['content']}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat")
async def chat_endpoint(message: dict, db: Session = Depends(get_db)):
    try:
        user_message = message.get("message", "")
        session_id = message.get("session_id", "default")
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Sačuvaj korisničku poruku u bazu
        user_db_message = ChatMessage(
            sender="user",
            content=user_message,
            session_id=session_id
        )
        db.add(user_db_message)
        db.commit()
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id, db)
        
        # Kreiraj poboljšani prompt
        enhanced_prompt = create_enhanced_prompt(user_message, context)
        
        # Pozovi Ollama API (bez await)
        response = client.chat(model='mistral', 
            messages=[{
                'role': 'user',
                'content': enhanced_prompt
            }]
        )
        
        ai_response = response['message']['content']
        
        # Sačuvaj AI odgovor u bazu
        ai_db_message = ChatMessage(
            sender="ai",
            content=ai_response,
            session_id=session_id
        )
        db.add(ai_db_message)
        db.commit()
        
        return {
            "status": "success",
            "response": ai_response,
            "session_id": session_id
        }
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        return {
            "status": "success",
            "messages": [
                {
                    "id": msg.id,
                    "sender": msg.sender,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
            ]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/new-session")
async def create_new_session():
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

@app.get("/chat/sessions")
async def get_sessions(db: Session = Depends(get_db)):
    try:
        # Dohvati sve sesije sa brojem poruka i vremenom
        result = db.execute("""
            SELECT 
                session_id,
                COUNT(*) as message_count,
                MIN(timestamp) as first_message,
                MAX(timestamp) as last_message
            FROM chat_messages 
            GROUP BY session_id
            ORDER BY last_message DESC
        """).fetchall()
        
        sessions = [
            {
                "session_id": row[0],
                "message_count": row[1],
                "first_message": row[2],
                "last_message": row[3]
            }
            for row in result
        ]
        
        return {
            "status": "success",
            "sessions": sessions
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/chat/session/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    try:
        # Obriši sve poruke za datu sesiju
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        db.commit()
        
        return {
            "status": "success",
            "message": f"Sesija {session_id} je obrisana"
        }
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
