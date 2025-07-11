# 🎨 AcAIA UI Design Guide

## 📋 Pregled UI Dizajna

AcAIA koristi moderan, minimalističan dizajn sa fokusom na **user experience** i **accessibility**. UI je potpuno responsive i optimizovan za sve uređaje, od mobilnih telefona do desktop računara.

### **🎯 Dizajn Principi:**
- **Minimalizam** - Čist i neopterećen interfejs
- **Accessibility** - WCAG 2.1 compliant
- **Responsive** - Mobile-first pristup
- **Dark/Light Mode** - Automatska detekcija sistemske teme
- **Smooth Animations** - Framer Motion integracija
- **Performance** - Optimizovan za 60fps

---

## 🎨 **TEMA SISTEM**

### **ThemeProvider.tsx**
```typescript
// Automatska detekcija sistemske teme
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// CSS Variables za teme
:root {
  /* Light Theme */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --accent-primary: #3b82f6;
  --accent-secondary: #1d4ed8;
  --border-color: #e2e8f0;
  --shadow-color: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  /* Dark Theme */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent-primary: #60a5fa;
  --accent-secondary: #3b82f6;
  --border-color: #334155;
  --shadow-color: rgba(0, 0, 0, 0.3);
}
```

### **Tema Komponente**
- **ThemeToggle.tsx** - Toggle dugme sa animacijom
- **System Theme Detection** - Automatska detekcija
- **Theme Persistence** - Čuvanje u localStorage
- **Smooth Transitions** - 300ms transition za sve promene

---

## 💬 **CHAT INTERFACE**

### **ChatLayout.tsx**
```typescript
// Responsive layout sa sidebar-om
<div className="flex h-screen bg-slate-50 dark:bg-slate-900">
  {/* Sidebar - sakriva se na mobilnim */}
  <div className="hidden md:flex w-80 border-r border-slate-200 dark:border-slate-700">
    <ChatSidebar />
  </div>
  
  {/* Glavna chat oblast */}
  <div className="flex-1 flex flex-col">
    <ChatArea />
  </div>
</div>
```

### **ChatSidebar.tsx**
```typescript
// Glavna sidebar komponenta sa svim funkcionalnostima
<div className="flex flex-col h-full bg-white dark:bg-slate-800">
  {/* Header sa search i new chat */}
  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Chat Sesije
      </h2>
      <button
        onClick={createNewSession}
        className="ml-auto p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        aria-label="Nova sesija"
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </div>
    
    {/* Search bar */}
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        placeholder="Pretraži sesije..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500"
      />
    </div>
  </div>
  
  {/* Session list */}
  <div className="flex-1 overflow-y-auto">
    <AnimatePresence>
      {filteredSessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isSelected={selectedSessionId === session.id}
          onSelect={() => onSessionSelect(session.id)}
          onRename={() => handleRenameSession(session.id)}
          onDelete={() => handleDeleteSession(session.id)}
        />
      ))}
    </AnimatePresence>
  </div>
  
  {/* Footer sa statistike */}
  <div className="p-4 border-t border-slate-200 dark:border-slate-700">
    <div className="text-sm text-slate-500 dark:text-slate-400">
      {sessions.length} sesija • {totalMessages} poruka
    </div>
  </div>
</div>
```

### **SessionItem.tsx**
```typescript
// Pojedinačna session komponenta
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  className={`
    group relative p-3 cursor-pointer border-b border-slate-100 dark:border-slate-700
    hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors
    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}
  `}
  onClick={onSelect}
>
  {/* Session info */}
  <div className="flex items-start gap-3">
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
        {session.name || 'Bez imena'}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {formatDate(session.last_message_time)}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        {session.message_count} poruka
      </p>
    </div>
    
    {/* Action buttons - prikazuju se na hover */}
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
        aria-label="Preimenuj sesiju"
      >
        <EditIcon className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
        aria-label="Obriši sesiju"
      >
        <TrashIcon className="w-3 h-3" />
      </button>
    </div>
  </div>
  
  {/* Selection indicator */}
  {isSelected && (
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
  )}
</motion.div>
```

### **SessionRenameModal.tsx**
```typescript
// Modal za preimenovanje sesije
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl"
  >
    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
      Preimenuj sesiju
    </h3>
    
    <input
      type="text"
      value={newName}
      onChange={(e) => setNewName(e.target.value)}
      placeholder="Unesite novo ime..."
      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
      autoFocus
    />
    
    <div className="flex items-center gap-3 mt-6">
      <button
        onClick={handleSave}
        disabled={!newName.trim()}
        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
      >
        Sačuvaj
      </button>
      <button
        onClick={onClose}
        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg transition-colors"
      >
        Otkaži
      </button>
    </div>
  </motion.div>
</div>
```

### **SessionCategories.tsx**
```typescript
// Kategorisanje sesija
<div className="p-4 border-b border-slate-200 dark:border-slate-700">
  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
    Kategorije
  </h3>
  
  <div className="space-y-2">
    {categories.map((category) => (
      <button
        key={category.id}
        onClick={() => setSelectedCategory(category.id)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
          ${selectedCategory === category.id 
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }
        `}
      >
        <div className={`w-3 h-3 rounded-full ${category.color}`} />
        <span className="text-sm">{category.name}</span>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          {category.count}
        </span>
      </button>
    ))}
  </div>
  
  {/* Add new category */}
  <button
    onClick={() => setShowAddCategory(true)}
    className="w-full mt-3 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
  >
    + Dodaj kategoriju
  </button>
</div>
```

### **SessionArchive.tsx**
```typescript
// Arhiviranje sesija
<div className="p-4 border-b border-slate-200 dark:border-slate-700">
  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
    Arhiva
  </h3>
  
  <div className="space-y-2">
    {archivedSessions.map((session) => (
      <div
        key={session.id}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
            {session.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Arhivirano {formatDate(session.archived_at)}
          </p>
        </div>
        
        <button
          onClick={() => restoreSession(session.id)}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label="Vrati iz arhive"
        >
          <RestoreIcon className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
</div>
```

### **SessionSharing.tsx**
```typescript
// Deljenje sesija
<div className="p-4 border-b border-slate-200 dark:border-slate-700">
  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
    Deljenje
  </h3>
  
  <div className="space-y-3">
    {sharedSessions.map((session) => (
      <div
        key={session.id}
        className="p-3 rounded-lg border border-slate-200 dark:border-slate-600"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShareIcon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {session.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{session.views} pregleda</span>
          <span>•</span>
          <span>{formatDate(session.shared_at)}</span>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => copyShareLink(session.share_id)}
            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Kopiraj link
          </button>
          <button
            onClick={() => revokeShare(session.id)}
            className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Ukloni
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
```

---

## 📋 **SIDEBAR ELEMENTI I FUNKCIONALNOSTI**

### **1. Header Sekcija**
**Komponenta:** `ChatSidebar.tsx` - Header deo  
**Funkcionalnosti:**
- **Naslov "Chat Sesije"** - Jasna identifikacija sidebar-a
- **"Nova sesija" dugme** - Kreiranje nove chat sesije sa plus ikonom
- **Search bar** - Pretraga kroz postojeće sesije sa ikonom
- **Responsive dizajn** - Prilagođava se veličini ekrana

### **2. Session List**
**Komponenta:** `SessionItem.tsx` - Lista sesija  
**Funkcionalnosti:**
- **Prikaz svih sesija** - Scrollable lista sa animacijama
- **Session info** - Ime, datum poslednje poruke, broj poruka
- **Selection indicator** - Plava linija za aktivnu sesiju
- **Hover efekti** - Prikaz action dugmića na hover
- **Action buttons** - Edit i Delete dugmići (prikazuju se na hover)
- **AnimatePresence** - Smooth animacije za dodavanje/brisanje

### **3. Session Rename Modal**
**Komponenta:** `SessionRenameModal.tsx` - Modal za preimenovanje  
**Funkcionalnosti:**
- **Modal overlay** - Backdrop blur efekat
- **Input field** - Za unos novog imena sa auto-focus
- **Validation** - Disabled dugme ako je prazno
- **Action buttons** - Save i Cancel dugmići
- **Smooth animations** - Scale i opacity animacije

### **4. Session Categories**
**Komponenta:** `SessionCategories.tsx` - Kategorisanje  
**Funkcionalnosti:**
- **Kategorije** - Organizovanje sesija po kategorijama
- **Color coding** - Različite boje za različite kategorije
- **Count indicators** - Broj sesija u svakoj kategoriji
- **Selection state** - Highlight aktivne kategorije
- **Add category** - Dugme za dodavanje nove kategorije

### **5. Session Archive**
**Komponenta:** `SessionArchive.tsx` - Arhiva sesija  
**Funkcionalnosti:**
- **Arhivirane sesije** - Prikaz sesija koje su arhivirane
- **Archive info** - Datum arhiviranja
- **Restore button** - Vraćanje sesije iz arhive
- **Hover efekti** - Interaktivnost za restore akciju

### **6. Session Sharing**
**Komponenta:** `SessionSharing.tsx` - Deljenje sesija  
**Funkcionalnosti:**
- **Shared sessions** - Prikaz deljenih sesija
- **Share statistics** - Broj pregleda i datum deljenja
- **Copy link** - Kopiranje share link-a u clipboard
- **Revoke share** - Uklanjanje deljenja
- **Visual indicators** - Share ikona i status informacije

### **7. Footer Statistics**
**Komponenta:** `ChatSidebar.tsx` - Footer deo  
**Funkcionalnosti:**
- **Session count** - Ukupan broj sesija
- **Message count** - Ukupan broj poruka
- **Real-time updates** - Ažuriranje statistika u real-time

### **8. Mobile Responsive Features**
**Funkcionalnosti:**
- **Hamburger menu** - Sakriva sidebar na mobilnim uređajima
- **Overlay system** - Pozadinski overlay za mobile navigation
- **Touch-friendly** - Optimizovano za touch uređaje
- **Smooth transitions** - 300ms animacije za otvaranje/zatvaranje

### **9. Accessibility Features**
**Funkcionalnosti:**
- **ARIA labels** - Screen reader podrška za sve dugmiće
- **Keyboard navigation** - Tab navigation kroz sidebar
- **Focus management** - Automatski focus na input polja
- **Color contrast** - WCAG 2.1 compliant kontrast

### **10. Performance Optimizations**
**Funkcionalnosti:**
- **Virtual scrolling** - Optimizacija za velike liste sesija
- **Debounced search** - 300ms debounce za search input
- **Memoized components** - Optimizovani re-renderi
- **Lazy loading** - Učitavanje komponenti po potrebi

### **11. State Management**
**Funkcionalnosti:**
- **Session selection** - Upravljanje aktivne sesije
- **Search filtering** - Real-time filtriranje sesija
- **Modal states** - Upravljanje modal stanjima
- **Category filtering** - Filtriranje po kategorijama

### **12. Error Handling**
**Funkcionalnosti:**
- **Loading states** - Skeleton loading za sesije
- **Error boundaries** - Graceful error handling
- **Empty states** - Prikaz kada nema sesija
- **Retry logic** - Automatski retry za greške

### **MessageRenderer.tsx**
```typescript
// Full-width message layout
<div className={`flex gap-3 p-4 ${
  message.sender === 'user' 
    ? 'bg-blue-50 dark:bg-blue-900/20' 
    : 'bg-white dark:bg-slate-800'
}`}>
  {/* Avatar */}
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
    {message.sender === 'user' ? '👤' : '🤖'}
  </div>
  
  {/* Message Content */}
  <div className="flex-1 space-y-2">
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
    
    {/* Message Actions */}
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
        <CopyIcon className="w-4 h-4" />
      </button>
      <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
        <EditIcon className="w-4 h-4" />
      </button>
    </div>
  </div>
</div>
```

### **Code Syntax Highlighting**
```typescript
// React Syntax Highlighter sa OneDark temom
<SyntaxHighlighter
  language={detectedLanguage}
  style={oneDark}
  customStyle={{
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '16px 0'
  }}
  showLineNumbers={true}
  wrapLines={true}
>
  {code}
</SyntaxHighlighter>
```

### **ChatInput.tsx**
```typescript
// Auto-resize textarea sa debouncing
<textarea
  ref={textareaRef}
  value={message}
  onChange={handleChange}
  onKeyDown={handleKeyDown}
  placeholder="Napišite poruku..."
  className="flex-1 resize-none bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-500"
  style={{ height: `${textareaHeight}px` }}
/>
```

---

## 📱 **MOBILE RESPONSIVE DESIGN**

### **Hamburger Menu**
```typescript
// Mobile header sa hamburger menu-om
<div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
  <button
    onClick={toggleSidebar}
    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
  >
    <MenuIcon className="w-6 h-6" />
  </button>
  
  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
    AcAIA
  </h1>
  
  <div className="w-10" /> {/* Spacer */}
</div>
```

### **Responsive Sidebar**
```typescript
// Sidebar koji se sakriva na mobilnim
<div className={`
  fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
  transform transition-transform duration-300 ease-in-out
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  md:relative md:translate-x-0
`}>
  <ChatSidebar />
</div>

{/* Overlay za mobile */}
{isOpen && (
  <div 
    className="fixed inset-0 bg-black/50 z-40 md:hidden"
    onClick={closeSidebar}
  />
)}
```

### **Touch-Friendly Buttons**
```typescript
// Optimizovano za touch uređaje
<button className="
  p-3 rounded-xl border-2 transition-all duration-200
  active:scale-95 hover:scale-105
  border-white/10 bg-slate-800/50 
  hover:border-white/20 hover:bg-slate-800/70
  touch-manipulation
">
  <Icon className="w-6 h-6" />
</button>
```

---

## 🎭 **ANIMACIJE I TRANSICIJE**

### **Framer Motion Integracija**
```typescript
// Smooth animacije za komponente
import { motion, AnimatePresence } from 'framer-motion';

const MessageItem = ({ message, isLast }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="message-container"
  >
    {/* Message content */}
  </motion.div>
);
```

### **Loading Animacije**
```typescript
// TypingIndicator sa animacijom
const TypingIndicator = () => (
  <motion.div className="flex items-center gap-1 p-4">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-slate-400 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: i * 0.2
        }}
      />
    ))}
  </motion.div>
);
```

### **Hover Efekti**
```typescript
// Smooth hover efekti
<div className="
  group relative overflow-hidden rounded-xl
  transition-all duration-300 ease-out
  hover:shadow-lg hover:shadow-blue-500/25
  hover:scale-[1.02] hover:-translate-y-1
">
  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 
                  group-hover:from-blue-500/10 group-hover:to-purple-500/10 
                  transition-all duration-300" />
  {/* Content */}
</div>
```

---

## 🎨 **KOMPONENTE**

### **ExportModal.tsx**
```typescript
// Premium UI sa glassmorphism efektima
<div className="
  fixed inset-0 z-50 flex items-center justify-center
  bg-black/50 backdrop-blur-sm
">
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="
      w-full max-w-md p-6 rounded-2xl
      bg-white/80 dark:bg-slate-800/80
      backdrop-blur-xl border border-white/20
      shadow-2xl shadow-black/25
    "
  >
    {/* Modal content */}
  </motion.div>
</div>
```

### **VoiceInput.tsx**
```typescript
// Voice recording sa vizuelnim feedback-om
<div className="relative">
  <button
    onClick={toggleRecording}
    className={`
      w-16 h-16 rounded-full flex items-center justify-center
      transition-all duration-300 ease-out
      ${isRecording 
        ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' 
        : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
      }
    `}
  >
    {isRecording ? <StopIcon /> : <MicIcon />}
  </button>
  
  {/* Audio level indicator */}
  {isRecording && (
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-red-500"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  )}
</div>
```

### **AdvancedDocumentPreview.tsx**
```typescript
// Napredni document preview sa zoom i pan
<div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800">
  {/* Toolbar */}
  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
    <button onClick={() => setZoom(zoom + 0.1)}>🔍+</button>
    <button onClick={() => setZoom(zoom - 0.1)}>🔍-</button>
    <button onClick={() => setZoom(1)}>100%</button>
  </div>
  
  {/* Document content */}
  <div
    className="transform transition-transform duration-300"
    style={{ 
      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
      cursor: isDragging ? 'grabbing' : 'grab'
    }}
    onMouseDown={startPan}
    onMouseMove={handlePan}
    onMouseUp={stopPan}
  >
    {/* Document content */}
  </div>
</div>
```

---

## 🎯 **ACCESSIBILITY**

### **ARIA Labels**
```typescript
// Screen reader podrška
<button
  aria-label="Preimenuj sesiju"
  aria-describedby="session-rename-help"
  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
>
  <EditIcon className="w-4 h-4" />
</button>
```

### **Keyboard Navigation**
```typescript
// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      setShowSearch(true);
    }
    if (e.key === 'Escape') {
      setShowSearch(false);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### **Focus Management**
```typescript
// Automatski focus na input polja
useEffect(() => {
  if (inputRef.current) {
    inputRef.current.focus();
  }
}, []);
```

---

## 🎨 **COLOR PALETTE**

### **Primary Colors**
```css
/* Blue Palette */
--blue-50: #eff6ff;
--blue-500: #3b82f6;
--blue-600: #2563eb;
--blue-700: #1d4ed8;

/* Purple Accent */
--purple-500: #8b5cf6;
--purple-600: #7c3aed;
```

### **Neutral Colors**
```css
/* Slate Palette */
--slate-50: #f8fafc;
--slate-100: #f1f5f9;
--slate-200: #e2e8f0;
--slate-300: #cbd5e1;
--slate-400: #94a3b8;
--slate-500: #64748b;
--slate-600: #475569;
--slate-700: #334155;
--slate-800: #1e293b;
--slate-900: #0f172a;
```

### **Semantic Colors**
```css
/* Success */
--green-500: #10b981;
--green-600: #059669;

/* Warning */
--yellow-500: #f59e0b;
--yellow-600: #d97706;

/* Error */
--red-500: #ef4444;
--red-600: #dc2626;

/* Info */
--blue-500: #3b82f6;
--blue-600: #2563eb;
```

---

## 📐 **LAYOUT SISTEM**

### **Grid System**
```typescript
// Responsive grid sa Tailwind CSS
<div className="
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  gap-4 md:gap-6 lg:gap-8
">
  {/* Grid items */}
</div>
```

### **Flexbox Layout**
```typescript
// Flexbox za layout
<div className="
  flex flex-col md:flex-row
  items-start md:items-center
  justify-between
  gap-4 md:gap-6
">
  {/* Flex items */}
</div>
```

### **Container System**
```typescript
// Responsive container
<div className="
  w-full max-w-7xl mx-auto
  px-4 sm:px-6 lg:px-8
  py-6 sm:py-8 lg:py-12
">
  {/* Content */}
</div>
```

---

## 🎭 **INTERAKTIVNI ELEMENTI**

### **Buttons**
```typescript
// Primary Button
<button className="
  px-4 py-2 bg-blue-500 hover:bg-blue-600
  text-white font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Primary Action
</button>

// Secondary Button
<button className="
  px-4 py-2 bg-slate-100 hover:bg-slate-200
  dark:bg-slate-700 dark:hover:bg-slate-600
  text-slate-900 dark:text-slate-100 font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
">
  Secondary Action
</button>
```

### **Input Fields**
```typescript
// Text Input
<input
  type="text"
  className="
    w-full px-3 py-2 border border-slate-300 dark:border-slate-600
    rounded-lg bg-white dark:bg-slate-800
    text-slate-900 dark:text-slate-100
    placeholder-slate-500 dark:placeholder-slate-400
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    transition-colors duration-200
  "
  placeholder="Unesite tekst..."
/>
```

### **Cards**
```typescript
// Card komponenta
<div className="
  p-6 bg-white dark:bg-slate-800
  rounded-xl border border-slate-200 dark:border-slate-700
  shadow-sm hover:shadow-md
  transition-all duration-200
  hover:scale-[1.02] hover:-translate-y-1
">
  {/* Card content */}
</div>
```

---

## 📱 **RESPONSIVE BREAKPOINTS**

### **Tailwind CSS Breakpoints**
```css
/* Mobile First */
.sm: 640px   /* Small devices */
.md: 768px   /* Medium devices */
.lg: 1024px  /* Large devices */
.xl: 1280px  /* Extra large devices */
.2xl: 1536px /* 2X large devices */
```

### **Custom Breakpoints**
```typescript
// Custom hook za responsive behavior
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet, isDesktop };
};
```

---

## 🎨 **ICON SISTEM**

### **React Icons**
```typescript
import { 
  FiSend, FiMic, FiMicOff, FiCopy, FiEdit, 
  FiTrash2, FiDownload, FiUpload, FiSearch,
  FiMenu, FiX, FiChevronDown, FiChevronUp 
} from 'react-icons/fi';

// Icon komponenta sa konzistentnim stilom
const Icon = ({ icon: IconComponent, size = 20, className = "" }) => (
  <IconComponent 
    className={`w-${size} h-${size} ${className}`}
    strokeWidth={1.5}
  />
);
```

### **Custom Icons**
```typescript
// Custom SVG ikone
const AcAIAIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
```

---

## 🎭 **LOADING STATES**

### **Skeleton Loading**
```typescript
// Skeleton komponenta
const Skeleton = ({ className = "" }) => (
  <div className={`
    animate-pulse bg-slate-200 dark:bg-slate-700 rounded
    ${className}
  `} />
);

// Message skeleton
<div className="flex gap-3 p-4">
  <Skeleton className="w-8 h-8 rounded-full" />
  <div className="flex-1 space-y-2">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
</div>
```

### **Spinner Loading**
```typescript
// Spinner komponenta
const Spinner = ({ size = "md" }) => (
  <div className={`
    animate-spin rounded-full border-2 border-slate-300 border-t-blue-500
    ${size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-8 h-8"}
  `} />
);
```

---

## 🎨 **TYPOGRAFIJA**

### **Font Stack**
```css
/* Inter font za modern izgled */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 
             'Droid Sans', 'Helvetica Neue', sans-serif;
```

### **Text Styles**
```typescript
// Heading styles
<h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
  Glavni naslov
</h1>

<h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
  Podnaslov
</h2>

<h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">
  Sekcija naslov
</h3>

// Body text
<p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
  Body tekst sa dobrim line-height-om za čitljivost.
</p>

// Caption text
<span className="text-sm text-slate-500 dark:text-slate-500">
  Caption ili pomoćni tekst
</span>
```

---

## 🎉 **ZAKLJUČAK**

AcAIA UI je moderan, accessible i potpuno responsive dizajn koji pruža:

- **Konsistentan dizajn sistem** sa temama i komponentama
- **Smooth animacije** sa Framer Motion
- **Mobile-first pristup** sa hamburger menu-om
- **Accessibility compliance** sa ARIA labels i keyboard navigation
- **Performance optimizacije** sa virtual scrolling
- **Dark/Light mode** sa automatskom detekcijom
- **Touch-friendly** interfejs za mobilne uređaje
- **Modern color palette** sa semantic bojama
- **Typography sistem** sa Inter fontom
- **Loading states** sa skeleton i spinner komponentama

UI je dizajniran da bude intuitivan, brz i lep na svim uređajima! 🚀 

---

## 🧭 Navigacioni Sidebar - Home Page

Navigacioni sidebar na početnom ekranu omogućava brz pristup svim glavnim funkcionalnostima AcAIA aplikacije. Svaka stavka ima svoju ikonicu, naziv i jasno definisanu funkciju. Sidebar je dizajniran tako da bude pregledan, intuitivan i vizuelno usklađen sa ostatkom aplikacije.

### **Redosled i funkcija stavki:**

1. **Welcome**
   - *Opis:* Početni ekran sa uvodom, brzim pristupom i prikazom najvažnijih informacija.
   - *Funkcija:* Vraća korisnika na home/dashboard stranicu.

2. **Active Recall**
   - *Opis:* Modul za interaktivno učenje kroz pitanja i odgovore.
   - *Funkcija:* Otvara alat za vežbanje znanja kroz aktivno prisjećanje.

3. **Mind Mapping**
   - *Opis:* Vizuelno organizovanje koncepata i ideja.
   - *Funkcija:* Prikazuje alat za kreiranje i uređivanje mentalnih mapa.

4. **Audio Mode**
   - *Opis:* Glasovna komunikacija sa AI asistentom.
   - *Funkcija:* Omogućava unos i dobijanje odgovora putem glasa.

5. **Study Room**
   - *Opis:* Kolaborativno učenje sa drugim korisnicima.
   - *Funkcija:* Pristup virtuelnim učionicama za zajedničko učenje.

6. **Exam Simulation**
   - *Opis:* Praksa kroz simulacije ispita.
   - *Funkcija:* Pokreće modul za generisanje i rešavanje probnih testova.

7. **Problem Generator**
   - *Opis:* Automatsko generisanje zadataka i problema.
   - *Funkcija:* Otvara alat za kreiranje novih zadataka po temama.

8. **Study Journal**
   - *Opis:* Praćenje napretka i beleške.
   - *Funkcija:* Prikazuje dnevnik učenja, napomene i statistiku napretka.

9. **Career Guidance**
   - *Opis:* Smernice i saveti za karijeru.
   - *Funkcija:* Otvara sekciju sa AI analizom i preporukama za profesionalni razvoj.

10. **Dokumenti**
    - *Opis:* Upravljanje i pregled dokumenata.
    - *Funkcija:* Pristup svim upload-ovanim i obrađenim dokumentima.

11. **File Sharing**
    - *Opis:* Deljenje fajlova sa drugim korisnicima.
    - *Funkcija:* Omogućava upload i deljenje materijala.

---

### **Vizuelni identitet sidebar-a:**
- **Ikonice:** Svaka stavka ima prepoznatljivu ikonicu u skladu sa funkcijom (npr. mapa za Mind Mapping, mikrofon za Audio Mode, knjiga za Study Journal...)
- **Aktivna stavka:** Istaknuta bojom (plava ili ljubičasta), sa blagim shadow efektom i bold fontom
- **Hover efekat:** Blaga promena pozadine i boje ikonice
- **Odvajanje sekcija:** Gornji deo (glavne funkcije), donji deo (korisnički profil)
- **Korisnički info:** Na dnu sidebar-a prikaz korisničkog imena, statusa (npr. Premium Member) i avatar
- **Responsivnost:** Sidebar se automatski sakriva na manjim ekranima i prikazuje kao overlay

---

### **Primer JSX strukture:**
```jsx
<aside className="sidebar bg-gradient-to-b from-slate-900 to-slate-800 text-white w-72 flex flex-col justify-between">
  <nav className="flex-1 py-6">
    <SidebarItem icon={<HomeIcon />} label="Welcome" active />
    <SidebarItem icon={<LightningIcon />} label="Active Recall" />
    <SidebarItem icon={<MindMapIcon />} label="Mind Mapping" />
    <SidebarItem icon={<MicIcon />} label="Audio Mode" />
    <SidebarItem icon={<UsersIcon />} label="Study Room" />
    <SidebarItem icon={<ExamIcon />} label="Exam Simulation" />
    <SidebarItem icon={<PuzzleIcon />} label="Problem Generator" />
    <SidebarItem icon={<JournalIcon />} label="Study Journal" />
    <SidebarItem icon={<CareerIcon />} label="Career Guidance" />
    <SidebarItem icon={<DocumentIcon />} label="Dokumenti" />
    <SidebarItem icon={<ShareIcon />} label="File Sharing" />
  </nav>
  <div className="p-4 border-t border-slate-700 flex items-center gap-3">
    <Avatar src={user.avatar} />
    <div>
      <div className="font-semibold">{user.name}</div>
      <div className="text-xs text-slate-400">Premium Member</div>
    </div>
  </div>
</aside>
```

---

Ova sekcija sada jasno dokumentuje sve stavke i funkcionalnosti navigacionog sidebar-a sa početnog ekrana, kao i njihov vizuelni identitet. 