#!/usr/bin/env python3
import sqlite3
import sys
import os
from datetime import datetime

def view_database():
    db_path = "chat_history.db"
    
    if not os.path.exists(db_path):
        print("Baza podataka ne postoji!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Prikaži sve tabele
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tabele u bazi:")
        for table in tables:
            print(f"  - {table[0]}")
        print()
        
        # Prikaži strukturu chat_messages tabele
        cursor.execute("PRAGMA table_info(chat_messages);")
        columns = cursor.fetchall()
        print("Struktura chat_messages tabele:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        print()
        
        # Prikaži sve poruke
        cursor.execute("""
            SELECT id, sender, content, timestamp, session_id 
            FROM chat_messages 
            ORDER BY timestamp ASC
        """)
        messages = cursor.fetchall()
        
        if not messages:
            print("Nema poruka u bazi podataka.")
        else:
            print(f"Ukupno poruka: {len(messages)}")
            print("\nPoruke:")
            print("-" * 80)
            
            for msg in messages:
                msg_id, sender, content, timestamp, session_id = msg
                # Formatiraj timestamp
                if timestamp:
                    try:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        formatted_time = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except:
                        formatted_time = timestamp
                else:
                    formatted_time = "N/A"
                
                print(f"ID: {msg_id}")
                print(f"Pošiljalac: {sender}")
                print(f"Vreme: {formatted_time}")
                print(f"Sesija: {session_id}")
                print(f"Sadržaj: {content[:100]}{'...' if len(content) > 100 else ''}")
                print("-" * 80)
        
        # Prikaži statistiku po sesijama
        cursor.execute("""
            SELECT session_id, COUNT(*) as message_count,
                   MIN(timestamp) as first_message,
                   MAX(timestamp) as last_message
            FROM chat_messages 
            GROUP BY session_id
            ORDER BY last_message DESC
        """)
        sessions = cursor.fetchall()
        
        if sessions:
            print("\nStatistika po sesijama:")
            print("-" * 80)
            for session in sessions:
                session_id, count, first, last = session
                print(f"Sesija: {session_id}")
                print(f"Broj poruka: {count}")
                print(f"Prva poruka: {first}")
                print(f"Poslednja poruka: {last}")
                print("-" * 40)
        
        conn.close()
        
    except Exception as e:
        print(f"Greška pri čitanju baze: {e}")

if __name__ == "__main__":
    view_database() 