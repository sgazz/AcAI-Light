# 🎯 Sidebar Enhancements Plan - AcAIA MVP

## 📋 **Pregled**

Ovaj dokument definiše plan za "popunjavanje" praznih Sidebar stavki sa funkcionalnim komponentama. Fokus je na MVP (Minimum Viable Product) implementaciju koja će maksimalno doprineti korisničkom iskustvu.

---

## 🎯 **Trenutno Stanje Sidebar-a**

### **✅ Implementirano (4/10):**
1. **Active Recall** (case 0) - ChatBox ✅
2. **Audio Mode** (case 2) - AudioMode komponenta ✅  
3. **Dokumenti** (case 8) - File handling ✅
4. **Performance Test** (case 9) - VirtualScrollTest ✅

### **❌ Prazne stavke (6/10):**
1. **Mind Mapping** (case 1) - Samo placeholder
2. **Study Room** (case 3) - Samo placeholder
3. **Exam Simulation** (case 4) - Samo placeholder
4. **Problem Generator** (case 5) - Samo placeholder
5. **Study Journal** (case 6) - Samo placeholder
6. **Career Guidance** (case 7) - Samo placeholder

---

## 🚀 **MVP Implementacijski Plan**

### **Faza 1: Core Learning Tools (2-3 nedelje)**

#### **1. 🧠 Mind Mapping (Visok prioritet)**
**Timeline:** 1-2 nedelje  
**Kompleksnost:** Srednja  
**Impact:** Visok  

**Funkcionalnosti:**
- Drag & drop node creation
- Connection lines sa različitim tipovima
- AI-powered suggestions za povezivanje
- Export kao PNG/PDF
- Real-time collaboration
- Template library
- Undo/redo functionality

**Tehnička implementacija:**
```typescript
// MindMapping.tsx
interface MindMapNode {
  id: string;
  content: string;
  position: { x: number; y: number };
  connections: string[];
  color: string;
  size: 'small' | 'medium' | 'large';
}

interface MindMapConnection {
  id: string;
  from: string;
  to: string;
  type: 'solid' | 'dashed' | 'dotted';
  color: string;
}
```

#### **2. 📚 Study Journal (Srednji prioritet)**
**Timeline:** 1 nedelja  
**Kompleksnost:** Niska  
**Impact:** Srednji  

**Funkcionalnosti:**
- Daily study logs sa timestamp-om
- Progress tracking sa vizualizacijom
- Goal setting i monitoring
- AI-powered reflection prompts
- Mood tracking
- Study session analytics
- Export functionality

**Tehnička implementacija:**
```typescript
// StudyJournal.tsx
interface StudyEntry {
  id: string;
  date: Date;
  subject: string;
  duration: number;
  content: string;
  mood: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible';
  goals: string[];
  achievements: string[];
  nextSteps: string[];
}
```

#### **3. 🎯 Exam Simulation (Srednji prioritet)**
**Timeline:** 1-2 nedelje  
**Kompleksnost:** Srednja  
**Impact:** Visok  

**Funkcionalnosti:**
- Question bank sa kategorijama
- Timer functionality sa pause
- Score tracking i analytics
- Review mode sa explanations
- AI-generated questions
- Progress tracking
- Mock exam creation

**Tehnička implementacija:**
```typescript
// ExamSimulation.tsx
interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'essay' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
}

interface ExamSession {
  id: string;
  questions: Question[];
  timeLimit: number;
  currentQuestion: number;
  answers: Record<string, string>;
  startTime: Date;
  endTime?: Date;
  score?: number;
}
```

### **Faza 2: Advanced Features (2-3 nedelje)**

#### **4. 🔢 Problem Generator (Nizak prioritet)**
**Timeline:** 1 nedelja  
**Kompleksnost:** Niska  
**Impact:** Srednji  

**Funkcionalnosti:**
- Template-based problem generation
- Difficulty level adjustment
- Subject-specific templates
- Export/import functionality
- Sharing sa drugim korisnicima
- AI-powered problem variations

#### **5. 👥 Study Room (Nizak prioritet)**
**Timeline:** 2 nedelje  
**Kompleksnost:** Visoka  
**Impact:** Srednji  

**Funkcionalnosti:**
- Real-time collaboration
- Shared whiteboard
- Voice/video chat integration
- Session recording
- Group analytics
- Breakout rooms

#### **6. 💼 Career Guidance (Nizak prioritet)**
**Timeline:** 1 nedelja  
**Kompleksnost:** Niska  
**Impact:** Nizak  

**Funkcionalnosti:**
- Skills assessment
- Career path suggestions
- Job market analysis
- Resume builder
- Interview preparation

---

## 🛠️ **Tehnička Arhitektura**

### **Nove Komponente:**
```
components/
├── MindMapping/
│   ├── MindMapping.tsx
│   ├── MindMapNode.tsx
│   ├── MindMapConnection.tsx
│   ├── MindMapCanvas.tsx
│   └── MindMapToolbar.tsx
├── StudyJournal/
│   ├── StudyJournal.tsx
│   ├── StudyEntry.tsx
│   ├── ProgressChart.tsx
│   └── GoalTracker.tsx
├── ExamSimulation/
│   ├── ExamSimulation.tsx
│   ├── QuestionBank.tsx
│   ├── ExamTimer.tsx
│   ├── ScoreAnalytics.tsx
│   └── QuestionEditor.tsx
├── ProblemGenerator/
│   ├── ProblemGenerator.tsx
│   ├── TemplateLibrary.tsx
│   └── ProblemEditor.tsx
├── StudyRoom/
│   ├── StudyRoom.tsx
│   ├── Whiteboard.tsx
│   ├── CollaborationPanel.tsx
│   └── SessionRecorder.tsx
└── CareerGuidance/
    ├── CareerGuidance.tsx
    ├── SkillsAssessment.tsx
    ├── ResumeBuilder.tsx
    └── InterviewPrep.tsx
```

### **Nove Dependencies:**
```json
{
  "react-flow-renderer": "^10.3.17",
  "react-beautiful-dnd": "^13.1.1",
  "recharts": "^2.8.0",
  "react-countdown": "^2.3.5",
  "react-quill": "^2.0.0",
  "socket.io-client": "^4.7.2",
  "react-webcam": "^7.1.1",
  "html2canvas": "^1.4.1"
}
```

---

## 📅 **Timeline Implementacije**

### **Nedelja 1-2: Mind Mapping**
- [ ] Osnovna struktura komponente
- [ ] Drag & drop funkcionalnost
- [ ] Node creation i editing
- [ ] Connection management
- [ ] Basic export functionality

### **Nedelja 3: Study Journal**
- [ ] Entry creation i editing
- [ ] Progress tracking
- [ ] Goal setting
- [ ] Basic analytics

### **Nedelja 4-5: Exam Simulation**
- [ ] Question bank management
- [ ] Timer functionality
- [ ] Score tracking
- [ ] Review mode

### **Nedelja 6: Problem Generator**
- [ ] Template system
- [ ] Problem generation
- [ ] Export/import

### **Nedelja 7-8: Study Room**
- [ ] Real-time collaboration
- [ ] Whiteboard functionality
- [ ] Session management

### **Nedelja 9: Career Guidance**
- [ ] Skills assessment
- [ ] Career suggestions
- [ ] Resume builder

---

## 🎨 **Design Guidelines**

### **Mind Mapping:**
- **Color Scheme:** Blue-purple gradient sa accent colors
- **Node Styles:** Rounded rectangles sa shadows
- **Connections:** Smooth bezier curves
- **Animations:** Smooth transitions za sve interakcije

### **Study Journal:**
- **Layout:** Timeline-based sa cards
- **Progress:** Circular progress indicators
- **Mood:** Color-coded mood indicators
- **Analytics:** Clean charts sa gradients

### **Exam Simulation:**
- **Interface:** Clean, distraction-free design
- **Timer:** Prominent countdown sa warnings
- **Questions:** Clear typography sa good spacing
- **Results:** Comprehensive analytics dashboard

---

## 🧪 **Testing Strategy**

### **Unit Tests:**
- [ ] Mind mapping node operations
- [ ] Study journal data persistence
- [ ] Exam timer functionality
- [ ] Problem generation algorithms

### **Integration Tests:**
- [ ] Mind map export functionality
- [ ] Study journal analytics
- [ ] Exam session management
- [ ] Real-time collaboration

### **User Testing:**
- [ ] Usability testing za mind mapping
- [ ] Study journal workflow testing
- [ ] Exam simulation user experience
- [ ] Performance testing za large datasets

---

## 📊 **Success Metrics**

### **User Engagement:**
- [ ] Mind map creation rate
- [ ] Study journal entry frequency
- [ ] Exam simulation completion rate
- [ ] Feature adoption rate

### **Performance:**
- [ ] Mind map rendering performance
- [ ] Study journal load times
- [ ] Exam simulation responsiveness
- [ ] Memory usage optimization

### **User Satisfaction:**
- [ ] Feature usage analytics
- [ ] User feedback scores
- [ ] Retention rate improvement
- [ ] Feature request frequency

---

## 🔄 **Git Workflow**

### **Branch Strategy:**
```
main
├── feature/mind-mapping
├── feature/study-journal
├── feature/exam-simulation
├── feature/problem-generator
├── feature/study-room
└── feature/career-guidance
```

### **Commit Convention:**
```
feat: add mind mapping drag & drop functionality
feat: implement study journal entry system
feat: add exam simulation timer and scoring
fix: resolve mind mapping connection issues
docs: update sidebar enhancements plan
```

---

## 🎯 **MVP Success Criteria**

### **Faza 1 Completion:**
- [ ] Mind Mapping - Osnovna funkcionalnost radi
- [ ] Study Journal - Entry system funkcionalan
- [ ] Exam Simulation - Basic exam flow radi
- [ ] Sidebar - 7/10 stavki implementirane

### **Faza 2 Completion:**
- [ ] Problem Generator - Template system radi
- [ ] Study Room - Basic collaboration radi
- [ ] Career Guidance - Assessment tool radi
- [ ] Sidebar - 10/10 stavki implementirane

### **Overall Success:**
- [ ] 0 critical bugs u production
- [ ] Performance metrics u zelenom
- [ ] User satisfaction > 4.5/5
- [ ] Feature adoption > 60%

---

*Dokument kreiran: ${new Date().toLocaleDateString('sr-RS')}*  
*Grana: advanced-ui-ux-improvements*  
*Status: Plan definisan za MVP implementaciju*  
*Prioritet: Mind Mapping → Study Journal → Exam Simulation* 