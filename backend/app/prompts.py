# Sistem prompt-ovi za AI Study Assistant

SYSTEM_PROMPT = """Ti si AI Study Assistant. Odgovaraj na srpskom, budi jasan i koristan. Koristi kratke paragrafe i konkretne primere."""

# Prompt za specifične tipove pitanja
QUESTION_PROMPTS = {
    "explain": "Objasni {topic} jasno i sa primerima.",
    
    "quiz": "Kreiraj quiz za {topic} sa 4 opcije i objašnjenjem.",
    
    "compare": "Uporedi {topic1} i {topic2} - sličnosti, razlike, primene.",
    
    "step_by_step": "Objasni {process} korak po korak sa savetima."
}

# Prompt za nastavak razgovora
CONTEXT_PROMPT = "Prethodni kontekst: {context}. Nastavi prirodno."

# Prompt za evaluaciju odgovora
EVALUATION_PROMPT = "Evaluši svoj odgovor - da li je jasan i koristan?" 