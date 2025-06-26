#!/bin/bash

# Cache Status Monitor za AcAIA
# Prikazuje status Redis cache-a i RAG performansi

# Boje za terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Funkcija za prikaz zaglavlja
show_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🚀 AcAIA Cache Monitor                    ║"
    echo "║                    Redis Status & Analytics                  ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Funkcija za proveru da li Redis radi
check_redis_status() {
    echo -e "${BLUE}🔍 Provera Redis statusa...${NC}"
    
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis server je aktivan${NC}"
        return 0
    else
        echo -e "${RED}❌ Redis server nije dostupan${NC}"
        echo -e "${YELLOW}💡 Pokušajte: brew services start redis${NC}"
        return 1
    fi
}

# Funkcija za prikaz Redis statistika
show_redis_stats() {
    echo -e "${BLUE}📊 Redis statistike:${NC}"
    
    # Dohvati osnovne informacije
    INFO=$(redis-cli info 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Parsiraj informacije
        CONNECTED_CLIENTS=$(echo "$INFO" | grep "connected_clients:" | cut -d: -f2 | tr -d '\r')
        USED_MEMORY=$(echo "$INFO" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
        TOTAL_COMMANDS=$(echo "$INFO" | grep "total_commands_processed:" | cut -d: -f2 | tr -d '\r')
        KEYS_HITS=$(echo "$INFO" | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r')
        KEYS_MISSES=$(echo "$INFO" | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r')
        UPTIME=$(echo "$INFO" | grep "uptime_in_seconds:" | cut -d: -f2 | tr -d '\r')
        
        # Izračunaj hit rate
        if [ "$KEYS_HITS" -gt 0 ] || [ "$KEYS_MISSES" -gt 0 ]; then
            TOTAL_KEYS=$((KEYS_HITS + KEYS_MISSES))
            HIT_RATE=$(echo "scale=2; $KEYS_HITS * 100 / $TOTAL_KEYS" | bc -l 2>/dev/null || echo "0")
        else
            HIT_RATE="0"
        fi
        
        # Formatiraj uptime
        if [ -n "$UPTIME" ] && [ "$UPTIME" -gt 0 ]; then
            HOURS=$((UPTIME / 3600))
            MINUTES=$(((UPTIME % 3600) / 60))
            SECONDS=$((UPTIME % 60))
            UPTIME_STR="${HOURS}h ${MINUTES}m ${SECONDS}s"
        else
            UPTIME_STR="N/A"
        fi
        
        # Prikaži statistike
        echo -e "  ${WHITE}Povezani klijenti:${NC} $CONNECTED_CLIENTS"
        echo -e "  ${WHITE}Korišćena memorija:${NC} $USED_MEMORY"
        echo -e "  ${WHITE}Ukupno komandi:${NC} $TOTAL_COMMANDS"
        echo -e "  ${WHITE}Cache hits:${NC} $KEYS_HITS"
        echo -e "  ${WHITE}Cache misses:${NC} $KEYS_MISSES"
        echo -e "  ${WHITE}Hit rate:${NC} ${GREEN}${HIT_RATE}%${NC}"
        echo -e "  ${WHITE}Uptime:${NC} $UPTIME_STR"
    else
        echo -e "${RED}❌ Nije moguće dohvatiti Redis statistike${NC}"
    fi
}

# Funkcija za prikaz cache ključeva
show_cache_keys() {
    echo -e "${BLUE}🔑 Cache ključevi:${NC}"
    
    # Dohvati sve ključeve
    KEYS=$(redis-cli keys "*" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$KEYS" ]; then
        # Grupiši ključeve po tipu
        RAG_KEYS=$(echo "$KEYS" | grep "^rag:" | wc -l)
        SESSION_KEYS=$(echo "$KEYS" | grep "^session:" | wc -l)
        EMBEDDING_KEYS=$(echo "$KEYS" | grep "^embeddings:" | wc -l)
        OTHER_KEYS=$(echo "$KEYS" | grep -v "^rag:\|^session:\|^embeddings:" | wc -l)
        
        echo -e "  ${WHITE}RAG rezultati:${NC} $RAG_KEYS"
        echo -e "  ${WHITE}Session podaci:${NC} $SESSION_KEYS"
        echo -e "  ${WHITE}Embeddings:${NC} $EMBEDDING_KEYS"
        echo -e "  ${WHITE}Ostali:${NC} $OTHER_KEYS"
        echo -e "  ${WHITE}Ukupno:${NC} $(echo "$KEYS" | wc -l)"
        
        # Prikaži nekoliko primera ključeva
        echo -e "\n${YELLOW}📋 Primeri ključeva:${NC}"
        echo "$KEYS" | head -5 | while read key; do
            TTL=$(redis-cli ttl "$key" 2>/dev/null)
            if [ "$TTL" -eq -1 ]; then
                TTL_STR="bez TTL"
            elif [ "$TTL" -eq -2 ]; then
                TTL_STR="ne postoji"
            else
                TTL_STR="${TTL}s"
            fi
            echo -e "  ${CYAN}$key${NC} (TTL: $TTL_STR)"
        done
    else
        echo -e "  ${YELLOW}Cache je prazan${NC}"
    fi
}

# Funkcija za proveru backend statusa
check_backend_status() {
    echo -e "${BLUE}🔍 Provera backend statusa...${NC}"
    
    if curl -s http://localhost:8001/cache/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server je aktivan na portu 8001${NC}"
        
        # Dohvati cache health
        HEALTH=$(curl -s http://localhost:8001/cache/health)
        STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$STATUS" = "healthy" ]; then
            echo -e "${GREEN}✅ Cache health check: ZDRAV${NC}"
        elif [ "$STATUS" = "warning" ]; then
            echo -e "${YELLOW}⚠️  Cache health check: UPOZORENJE${NC}"
        else
            echo -e "${RED}❌ Cache health check: GREŠKA${NC}"
        fi
    else
        echo -e "${RED}❌ Backend server nije dostupan na portu 8001${NC}"
        echo -e "${YELLOW}💡 Pokušajte: cd backend && uvicorn app.main:app --reload --port 8001${NC}"
    fi
}

# Funkcija za prikaz performansi
show_performance() {
    echo -e "${BLUE}⚡ Performanse:${NC}"
    
    # Test brzine pisanja
    START_TIME=$(date +%s%N)
    redis-cli set "perf_test_$(date +%s)" "test_value" > /dev/null 2>&1
    END_TIME=$(date +%s%N)
    WRITE_TIME=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000" | bc -l 2>/dev/null || echo "0")
    
    # Test brzine čitanja
    START_TIME=$(date +%s%N)
    redis-cli get "perf_test_$(date +%s)" > /dev/null 2>&1
    END_TIME=$(date +%s%N)
    READ_TIME=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000" | bc -l 2>/dev/null || echo "0")
    
    echo -e "  ${WHITE}Write latency:${NC} ${WRITE_TIME}ms"
    echo -e "  ${WHITE}Read latency:${NC} ${READ_TIME}ms"
    
    # Očisti test ključeve
    redis-cli del "perf_test_$(date +%s)" > /dev/null 2>&1
}

# Funkcija za prikaz memorije
show_memory_usage() {
    echo -e "${BLUE}💾 Memorija:${NC}"
    
    INFO=$(redis-cli info memory 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        USED_MEMORY=$(echo "$INFO" | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
        USED_MEMORY_HUMAN=$(echo "$INFO" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
        USED_MEMORY_PEAK=$(echo "$INFO" | grep "used_memory_peak_human:" | cut -d: -f2 | tr -d '\r')
        MEMORY_FRAGMENTATION=$(echo "$INFO" | grep "mem_fragmentation_ratio:" | cut -d: -f2 | tr -d '\r')
        
        echo -e "  ${WHITE}Trenutno korišćeno:${NC} $USED_MEMORY_HUMAN"
        echo -e "  ${WHITE}Peak korišćeno:${NC} $USED_MEMORY_PEAK"
        echo -e "  ${WHITE}Fragmentacija:${NC} $MEMORY_FRAGMENTATION"
        
        # Procena efikasnosti
        if [ -n "$MEMORY_FRAGMENTATION" ]; then
            FRAG=$(echo "$MEMORY_FRAGMENTATION" | bc -l 2>/dev/null || echo "1")
            if (( $(echo "$FRAG < 1.1" | bc -l) )); then
                echo -e "  ${WHITE}Efikasnost:${NC} ${GREEN}ODLIČNA${NC}"
            elif (( $(echo "$FRAG < 1.5" | bc -l) )); then
                echo -e "  ${WHITE}Efikasnost:${NC} ${YELLOW}DOBRA${NC}"
            else
                echo -e "  ${WHITE}Efikasnost:${NC} ${RED}SLABA${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ Nije moguće dohvatiti informacije o memoriji${NC}"
    fi
}

# Funkcija za prikaz aktivnih konekcija
show_connections() {
    echo -e "${BLUE}🔌 Konekcije:${NC}"
    
    INFO=$(redis-cli info clients 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        CONNECTED_CLIENTS=$(echo "$INFO" | grep "connected_clients:" | cut -d: -f2 | tr -d '\r')
        BLOCKED_CLIENTS=$(echo "$INFO" | grep "blocked_clients:" | cut -d: -f2 | tr -d '\r')
        
        echo -e "  ${WHITE}Aktivne konekcije:${NC} $CONNECTED_CLIENTS"
        echo -e "  ${WHITE}Blokirane konekcije:${NC} $BLOCKED_CLIENTS"
        
        if [ "$BLOCKED_CLIENTS" -gt 0 ]; then
            echo -e "  ${YELLOW}⚠️  Postoje blokirane konekcije${NC}"
        fi
    else
        echo -e "${RED}❌ Nije moguće dohvatiti informacije o konekcijama${NC}"
    fi
}

# Funkcija za prikaz preporuka
show_recommendations() {
    echo -e "${BLUE}💡 Preporuke:${NC}"
    
    # Proveri hit rate
    INFO=$(redis-cli info 2>/dev/null)
    KEYS_HITS=$(echo "$INFO" | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r')
    KEYS_MISSES=$(echo "$INFO" | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r')
    
    if [ "$KEYS_HITS" -gt 0 ] || [ "$KEYS_MISSES" -gt 0 ]; then
        TOTAL_KEYS=$((KEYS_HITS + KEYS_MISSES))
        HIT_RATE=$(echo "scale=2; $KEYS_HITS * 100 / $TOTAL_KEYS" | bc -l 2>/dev/null || echo "0")
        
        if (( $(echo "$HIT_RATE < 50" | bc -l) )); then
            echo -e "  ${YELLOW}⚠️  Nizak cache hit rate (${HIT_RATE}%) - razmislite o optimizaciji${NC}"
        elif (( $(echo "$HIT_RATE < 80" | bc -l) )); then
            echo -e "  ${YELLOW}📈 Srednji cache hit rate (${HIT_RATE}%) - moguće poboljšanje${NC}"
        else
            echo -e "  ${GREEN}✅ Odličan cache hit rate (${HIT_RATE}%)${NC}"
        fi
    fi
    
    # Proveri memoriju
    USED_MEMORY=$(echo "$INFO" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
    if [[ "$USED_MEMORY" == *"MB"* ]]; then
        MEMORY_VALUE=$(echo "$USED_MEMORY" | sed 's/MB//')
        if (( $(echo "$MEMORY_VALUE > 100" | bc -l) )); then
            echo -e "  ${YELLOW}⚠️  Visoka memorija (${USED_MEMORY}) - razmislite o čišćenju${NC}"
        fi
    fi
    
    # Proveri TTL
    KEYS_WITHOUT_TTL=$(redis-cli keys "*" | xargs -I {} redis-cli ttl {} | grep -c "^-1$" 2>/dev/null || echo "0")
    if [ "$KEYS_WITHOUT_TTL" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  $KEYS_WITHOUT_TTL ključeva bez TTL - postavite expiration${NC}"
    fi
}

# Funkcija za interaktivne opcije
show_interactive_menu() {
    echo -e "\n${PURPLE}🎮 Interaktivne opcije:${NC}"
    echo -e "  ${WHITE}1.${NC} Očisti cache"
    echo -e "  ${WHITE}2.${NC} Prikaži detaljne informacije o ključevima"
    echo -e "  ${WHITE}3.${NC} Test cache performansi"
    echo -e "  ${WHITE}4.${NC} Osvježi prikaz"
    echo -e "  ${WHITE}5.${NC} Izlaz"
    echo -e "\n${YELLOW}Unesite opciju (1-5):${NC} "
    
    read -r choice
    
    case $choice in
        1)
            echo -e "${BLUE}🧹 Čišćenje cache-a...${NC}"
            DELETED=$(redis-cli flushdb 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Cache je očišćen${NC}"
            else
                echo -e "${RED}❌ Greška pri čišćenju cache-a${NC}"
            fi
            ;;
        2)
            echo -e "${BLUE}📋 Detaljne informacije o ključevima:${NC}"
            redis-cli keys "*" | while read key; do
                TTL=$(redis-cli ttl "$key")
                SIZE=$(redis-cli memory usage "$key" 2>/dev/null || echo "N/A")
                echo -e "  ${CYAN}$key${NC} - TTL: ${TTL}s, Size: ${SIZE} bytes"
            done
            ;;
        3)
            echo -e "${BLUE}⚡ Test performansi...${NC}"
            show_performance
            ;;
        4)
            clear
            show_header
            check_redis_status
            show_redis_stats
            show_cache_keys
            check_backend_status
            show_performance
            show_memory_usage
            show_connections
            show_recommendations
            show_interactive_menu
            ;;
        5)
            echo -e "${GREEN}👋 Doviđenja!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Nevažeća opcija${NC}"
            show_interactive_menu
            ;;
    esac
}

# Glavna funkcija
main() {
    clear
    show_header
    
    # Proveri Redis status
    if check_redis_status; then
        # Prikaži sve informacije
        show_redis_stats
        echo
        show_cache_keys
        echo
        check_backend_status
        echo
        show_performance
        echo
        show_memory_usage
        echo
        show_connections
        echo
        show_recommendations
        echo
        show_interactive_menu
    else
        echo -e "${RED}❌ Redis nije dostupan. Proverite da li je pokrenut.${NC}"
        echo -e "${YELLOW}💡 Komande za pokretanje:${NC}"
        echo -e "  brew services start redis"
        echo -e "  redis-server"
        exit 1
    fi
}

# Pokreni glavnu funkciju
main 