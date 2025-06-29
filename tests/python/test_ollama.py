#!/usr/bin/env python3
import sys
import os

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ollama import Client

def test_ollama():
    client = Client(host='http://localhost:11434')
    
    try:
        # Prikaži sve dostupne modele sa više informacija
        models_response = client.list()
        models = models_response.get('models', [])
        if not models:
            print("Nema dostupnih modela na Ollama serveru!")
            return
        print("Dostupni modeli:")
        for idx, model in enumerate(models):
            print(f"{idx+1}) {model.get('model')}")
            print(f"    Model: {model.get('model')}")
            print(f"    Veličina: {model.get('size', 0) // (1024*1024)} MB")
            print(f"    Porodica: {model.get('details', {}).get('family', '-')}")
            print(f"    Parametri: {model.get('details', {}).get('parameter_size', '-')}")
            print(f"    Kvantizacija: {model.get('details', {}).get('quantization_level', '-')}")
            print()
        # Izbor modela
        while True:
            izbor = input(f"Unesite broj modela za testiranje [1-{len(models)}]: ")
            if izbor.isdigit() and 1 <= int(izbor) <= len(models):
                izbor_idx = int(izbor) - 1
                break
            print("Neispravan unos. Pokušajte ponovo.")
        test_model = models[izbor_idx]['model'].split(':')[0]
        print(f"\nTestiram chat sa modelom: {test_model} ...")
        response = client.chat(model=test_model, 
            messages=[{
                'role': 'user',
                'content': 'Zdravo! Kako si?'
            }]
        )
        print(f"Odgovor: {response['message']['content']}")
        
    except Exception as e:
        print(f"Greška: {e}")
        print("\nProverite da li je Ollama pokrenut:")
        print("1. Pokrenite: ollama serve")
        print("2. Preuzmite model: ollama pull <ime_modela>")

if __name__ == "__main__":
    test_ollama() 