# 🧪 Test Plan - Kritične Ispravke UI/UX

## 📋 Pregled

Ovaj dokument sadrži test plan za proveru implementiranih kritičnih ispravki UI/UX interfejsa AcAIA aplikacije.

## 🎯 Implementirane Ispravke

### **1. Responsive Mobile Dizajn**
- ✅ Hamburger meni za mobile
- ✅ Responsive sidebar
- ✅ Mobile-friendly chat interface

### **2. Moderni Chat Interface**
- ✅ Full-width poruke
- ✅ Syntax highlighting za kod
- ✅ Virtual scrolling
- ✅ Auto-resize textarea

### **3. Accessibility Poboljšanja**
- ✅ ARIA labele
- ✅ Keyboard navigacija
- ✅ Screen reader podrška

### **4. Performanse Optimizacije**
- ✅ Debouncing input polja
- ✅ Virtual scrolling
- ✅ Optimizovani re-renderi

## 🧪 Test Scenariji

### **Test 1: Responsive Dizajn**

#### **1.1 Mobile View (320px - 768px)**
```bash
# Otvorite DevTools -> Toggle Device Toolbar
# Testirajte različite veličine ekrana
```

**Očekivano ponašanje:**
- [ ] Hamburger meni se prikazuje
- [ ] Sidebar se sakriva automatski
- [ ] Chat interface je full-width
- [ ] Poruke su čitljive na malim ekranima

#### **1.2 Tablet View (768px - 1024px)**
**Očekivano ponašanje:**
- [ ] Sidebar se može otvoriti/zatvoriti
- [ ] Chat interface se prilagođava
- [ ] Hamburger meni je dostupan

#### **1.3 Desktop View (1024px+)**
**Očekivano ponašanje:**
- [ ] Sidebar je uvek vidljiv
- [ ] Chat interface koristi dostupan prostor
- [ ] Hamburger meni se ne prikazuje

### **Test 2: Chat Interface**

#### **2.1 Poruke sa Kodom**
```javascript
// Testirajte slanje poruke sa kodom
const testCode = `
function hello() {
    console.log("Hello World!");
    return "success";
}
`;
```

**Očekivano ponašanje:**
- [ ] Kod se prikazuje sa syntax highlightingom
- [ ] Boje su konzistentne
- [ ] Kod je čitljiv

#### **2.2 Virtual Scrolling**
**Očekivano ponašanje:**
- [ ] Scroll je glatak
- [ ] Performanse su dobre sa 100+ poruka
- [ ] Poruke se učitavaju na zahtev

#### **2.3 Auto-resize Textarea**
**Očekivano ponašanje:**
- [ ] Textarea se proširuje sa sadržajem
- [ ] Maksimalna visina je ograničena
- [ ] Scroll se pojavljuje kada je potreban

### **Test 3: Accessibility**

#### **3.1 Keyboard Navigacija**
```bash
# Koristite Tab za navigaciju
# Koristite Enter za aktivaciju
# Koristite Escape za zatvaranje
```

**Očekivano ponašanje:**
- [ ] Tab navigacija radi kroz sve elemente
- [ ] Focus je vidljiv
- [ ] Enter aktivira dugmad
- [ ] Escape zatvara modalne prozore

#### **3.2 Screen Reader**
**Očekivano ponašanje:**
- [ ] ARIA labele su prisutne
- [ ] Alt tekstovi za slike
- [ ] Semantic HTML struktura

### **Test 4: Performanse**

#### **4.1 Debouncing**
**Očekivano ponašanje:**
- [ ] Input polja ne šalju zahteve na svaki keystroke
- [ ] Zahtevi se šalju nakon pauze u kucanju

#### **4.2 Virtual Scrolling**
**Očekivano ponašanje:**
- [ ] Scroll je glatak sa 1000+ poruka
- [ ] Memorija se ne povećava značajno
- [ ] CPU usage je nizak

## 🚀 Kako Pokrenuti Testove

### **1. Pokrenite Frontend**
```bash
cd frontend
npm run dev
```

### **2. Pokrenite Backend**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

### **3. Otvorite Aplikaciju**
```
http://localhost:3000
```

## 📊 Test Checklist

### **Responsive Dizajn**
- [ ] Mobile (320px) - hamburger meni radi
- [ ] Mobile (768px) - sidebar se sakriva
- [ ] Tablet (1024px) - sidebar se može otvoriti
- [ ] Desktop (1200px+) - sidebar je uvek vidljiv

### **Chat Interface**
- [ ] Kod se prikazuje sa syntax highlightingom
- [ ] Virtual scrolling radi glatko
- [ ] Auto-resize textarea funkcioniše
- [ ] Poruke su full-width

### **Accessibility**
- [ ] Tab navigacija radi
- [ ] ARIA labele su prisutne
- [ ] Focus je vidljiv
- [ ] Screen reader kompatibilnost

### **Performanse**
- [ ] Debouncing radi
- [ ] Virtual scrolling je glatak
- [ ] Memorija se ne povećava
- [ ] CPU usage je nizak

## 🐛 Poznati Problemi

### **Ako Hamburger Meni Ne Radi:**
1. Proverite da li je `useState` importovan
2. Proverite da li je `useEffect` importovan
3. Proverite da li je `window` definisan

### **Ako Syntax Highlighting Ne Radi:**
1. Proverite da li je `react-syntax-highlighter` instaliran
2. Proverite da li je `prismjs` instaliran
3. Proverite da li su stilovi importovani

### **Ako Virtual Scrolling Ne Radi:**
1. Proverite da li je `react-window` instaliran
2. Proverite da li je `react-virtualized-auto-sizer` instaliran
3. Proverite da li su komponente pravilno importovane

## 📈 Metrike Uspeha

### **Performanse**
- **Scroll FPS:** > 60 FPS
- **Memory Usage:** < 100MB za 1000 poruka
- **CPU Usage:** < 10% tokom scroll-a

### **Accessibility**
- **WCAG 2.1 AA Compliance:** 100%
- **Keyboard Navigation:** 100% funkcionalnost
- **Screen Reader:** 100% kompatibilnost

### **Responsive**
- **Mobile:** 100% funkcionalnost
- **Tablet:** 100% funkcionalnost
- **Desktop:** 100% funkcionalnost

## 🎉 Uspešan Test

Test je uspešan kada:
1. ✅ Svi responsive testovi prolaze
2. ✅ Chat interface radi glatko
3. ✅ Accessibility testovi prolaze
4. ✅ Performanse su unutar granica
5. ✅ Nema console grešaka

---

*Test Plan kreiran: 2025-01-06*
*Status: Spreman za testiranje* 