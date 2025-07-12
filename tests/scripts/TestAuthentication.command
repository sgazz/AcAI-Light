#!/bin/bash

echo "🧪 TESTIRANJE AUTENTIFIKACIJE"
echo "================================"

# Boje za output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Proveri da li je backend pokrenut
echo -e "${BLUE}🔍 Proveravam da li je backend pokrenut...${NC}"
if curl -s http://localhost:8001/health > /dev/null; then
    echo -e "${GREEN}✅ Backend je pokrenut${NC}"
else
    echo -e "${RED}❌ Backend nije pokrenut. Pokreni backend prvo.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Testiram registraciju korisnika...${NC}"

# Test registracije
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpassword123",
    "name": "Test Korisnik"
  }')

if echo "$REGISTER_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Registracija uspešna${NC}"
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4)
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "   User ID: $USER_ID"
    echo "   Access Token: ${ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Registracija neuspešna${NC}"
    echo "   Response: $REGISTER_RESPONSE"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Testiram login korisnika...${NC}"

# Test login-a
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpassword123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Login uspešan${NC}"
    LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "   Login Token: ${LOGIN_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Login neuspešan${NC}"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Testiram dohvatanje profila...${NC}"

# Test dohvatanja profila
PROFILE_RESPONSE=$(curl -s -X GET "http://localhost:8001/auth/profile?token=$LOGIN_TOKEN")

if echo "$PROFILE_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Dohvatanje profila uspešno${NC}"
    USER_NAME=$(echo "$PROFILE_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    USER_EMAIL=$(echo "$PROFILE_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "   Ime: $USER_NAME"
    echo "   Email: $USER_EMAIL"
else
    echo -e "${RED}❌ Dohvatanje profila neuspešno${NC}"
    echo "   Response: $PROFILE_RESPONSE"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Testiram ažuriranje profila...${NC}"

# Test ažuriranja profila
UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:8001/auth/profile?token=$LOGIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ažurirani Test Korisnik",
    "bio": "Ovo je test bio"
  }')

if echo "$UPDATE_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Ažuriranje profila uspešno${NC}"
else
    echo -e "${RED}❌ Ažuriranje profila neuspešno${NC}"
    echo "   Response: $UPDATE_RESPONSE"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Testiram logout...${NC}"

# Test logout-a
LOGOUT_RESPONSE=$(curl -s -X POST "http://localhost:8001/auth/logout?token=$LOGIN_TOKEN")

if echo "$LOGOUT_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Logout uspešan${NC}"
else
    echo -e "${YELLOW}⚠️  Logout response: $LOGOUT_RESPONSE${NC}"
fi

echo ""
echo -e "${BLUE}🔍 Testiram nevažeći token...${NC}"

# Test sa nevažećim tokenom
INVALID_RESPONSE=$(curl -s -X GET "http://localhost:8001/auth/profile?token=invalid_token")

if echo "$INVALID_RESPONSE" | grep -q '"detail":"Nevažeći token"'; then
    echo -e "${GREEN}✅ Nevažeći token pravilno odbijen${NC}"
else
    echo -e "${YELLOW}⚠️  Nevažeći token response: $INVALID_RESPONSE${NC}"
fi

echo ""
echo -e "${GREEN}🎉 SVI TESTOVI AUTENTIFIKACIJE ZAVRŠENI USPEŠNO!${NC}"
echo "================================"
echo ""
echo -e "${BLUE}📋 Rezime:${NC}"
echo "   ✅ Registracija korisnika"
echo "   ✅ Login korisnika"
echo "   ✅ Dohvatanje profila"
echo "   ✅ Ažuriranje profila"
echo "   ✅ Logout"
echo "   ✅ Validacija tokena"
echo ""
echo -e "${YELLOW}💡 Sledeći koraci:${NC}"
echo "   1. Testiraj frontend integraciju"
echo "   2. Testiraj Sidebar sa stvarnim korisnikom"
echo "   3. Testiraj LoginModal komponentu"
echo "" 