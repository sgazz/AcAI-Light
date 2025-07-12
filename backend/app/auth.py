"""
Authentication i User Management sistem za AcAIA
"""

import os
import jwt
import bcrypt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
import uuid

logger = logging.getLogger(__name__)

class AuthManager:
    """Manager klasa za autentifikaciju i upravljanje korisnicima"""
    
    def __init__(self):
        self.jwt_secret = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        
    def create_access_token(self, data: dict) -> str:
        """Kreira JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verifikuje JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token je istekao")
            return None
        except jwt.JWTError as e:
            logger.error(f"Greška pri verifikaciji tokena: {e}")
            return None
    
    def hash_password(self, password: str) -> str:
        """Hash-uje lozinku"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verifikuje lozinku"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

class UserManager:
    """Manager klasa za upravljanje korisnicima"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.auth_manager = AuthManager()
    
    def create_user(self, email: str, password: str, name: str) -> Dict[str, Any]:
        """Kreira novog korisnika"""
        try:
            # Proveri da li korisnik već postoji
            existing_user = self.db_manager.get_user_by_email(email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Korisnik sa ovim email-om već postoji"
                )
            
            # Hash-uj lozinku
            hashed_password = self.auth_manager.hash_password(password)
            
            # Kreiraj korisnika
            user_id = str(uuid.uuid4())
            user_data = {
                'user_id': user_id,
                'email': email,
                'name': name,
                'hashed_password': hashed_password,
                'is_active': True,
                'is_premium': False,
                'created_at': datetime.now().isoformat(),
                'last_login': None
            }
            
            success = self.db_manager.create_user(user_data)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Greška pri kreiranju korisnika"
                )
            
            # Kreiraj access token
            access_token = self.auth_manager.create_access_token(
                data={"sub": user_id, "email": email, "name": name}
            )
            
            return {
                "user_id": user_id,
                "email": email,
                "name": name,
                "access_token": access_token,
                "token_type": "bearer"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Greška pri kreiranju korisnika: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Greška pri kreiranju korisnika"
            )
    
    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Autentifikuje korisnika"""
        try:
            # Dohvati korisnika
            user = self.db_manager.get_user_by_email(email)
            if not user:
                return None
            
            # Proveri lozinku
            if not self.auth_manager.verify_password(password, user['hashed_password']):
                return None
            
            # Proveri da li je korisnik aktivan
            if not user.get('is_active', True):
                return None
            
            # Ažuriraj last_login
            self.db_manager.update_user(user['user_id'], {'last_login': datetime.now().isoformat()})
            
            # Kreiraj access token
            access_token = self.auth_manager.create_access_token(
                data={"sub": user['user_id'], "email": user['email'], "name": user['name']}
            )
            
            return {
                "user_id": user['user_id'],
                "email": user['email'],
                "name": user['name'],
                "is_premium": user.get('is_premium', False),
                "access_token": access_token,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.error(f"Greška pri autentifikaciji korisnika: {e}")
            return None
    
    def get_current_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Dohvata trenutnog korisnika iz tokena"""
        try:
            payload = self.auth_manager.verify_token(token)
            if not payload:
                return None
            
            user_id = payload.get("sub")
            if not user_id:
                return None
            
            user = self.db_manager.get_user_by_id(user_id)
            if not user or not user.get('is_active', True):
                return None
            
            return user
            
        except Exception as e:
            logger.error(f"Greška pri dohvatanju trenutnog korisnika: {e}")
            return None
    
    def update_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> bool:
        """Ažurira korisnički profil"""
        try:
            # Ukloni osetljive podatke
            safe_data = {k: v for k, v in profile_data.items() 
                        if k in ['name', 'avatar_url', 'bio', 'preferences']}
            
            return self.db_manager.update_user(user_id, safe_data)
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju korisničkog profila: {e}")
            return False

# Globalna instanca
auth_manager = AuthManager() 