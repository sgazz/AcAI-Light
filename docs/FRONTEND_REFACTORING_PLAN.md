# 🔧 Frontend Refaktorisanje Plan - Duplirani Kodovi

## 📋 Pregled Problema

Nakon analize frontend koda, identifikovani su sledeći duplirani kodovi i copy-paste obrasci:

### 🔍 Identifikovani Problemi

1. **Copy to Clipboard funkcionalnost** (4+ komponenti)
   - `MessageRenderer.tsx` - kopiranje AI poruke i koda
   - `SessionSharing.tsx` - kopiranje linka za deljenje
   - `StudyRoom.tsx` - kopiranje invite koda
   - Ostale komponente sa sličnom funkcionalnosti

2. **File Operations** (3+ komponenti)
   - `DocumentList.tsx` - preview, download, OCR preview
   - `DocumentUpload.tsx` - upload, delete, status, preview
   - `FileHandling/FileSharing.tsx` - preview slike, dokumenta, download, remove

3. **Image Preview Modal** (3+ komponenti)
   - `FileHandling/ImagePreview.tsx`
   - `DocumentList.tsx` i `DocumentUpload.tsx` - sličan modal za preview

4. **Status i Error Handling** (4+ komponenti)
   - Sličan prikaz statusa i errora
   - Iste ikone i toastovi

5. **Infinite/Virtual Scroll** (2 komponente)
   - `Performance/InfiniteScroll.tsx`
   - `Performance/VirtualScroll.tsx`
   - Sličan prikaz kraja sadržaja, loading animacija

6. **Ikone i Dugmići** (6+ komponenti)
   - Iste ikone (`FaCopy`, `FaEye`, `FaDownload`, `FaCheck`, `FaTimes`)
   - Slični stilovi i ponašanja

7. **Brisanje i Potvrda** (3+ komponenti)
   - Sličan confirm dijalog i error handling

---

## 🎯 Strategija Refaktorisanja

### Princip: "Jedna promena odjednom"
- ✅ Uvek refaktorišemo **samo jednu stvar** u jednom komitu
- ✅ Testiramo **svaku promenu** pre nego što nastavimo
- ✅ Imamo **backup/rollback plan** za svaku promenu
- ✅ Komitujemo **svaku promenu** posebno

---

## 📅 Detaljni Plan - Korak po Korak

### **Faza 1: Osnovni Utils i Hooks (1-2 dana)**

#### **Korak 1.1: Clipboard Utils** 🎯 **PRIORITET 1**
**Status:** ❌ Nije započet  
**Komponente:** MessageRenderer, SessionSharing, StudyRoom, ostale  
**Rizik:** Nizak  
**Vreme:** 2-3 sata  

```typescript
// utils/clipboard.ts
export const useClipboard = () => {
  const copyToClipboard = async (text: string, successMessage?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Toast success
      return true;
    } catch (error) {
      // Toast error
      return false;
    }
  };
  
  return { copyToClipboard };
};
```

**Plan implementacije:**
1. Napraviti `utils/clipboard.ts`
2. Testirati u **jednoj** komponenti (MessageRenderer)
3. Ako radi, primeniti na ostale komponente
4. Komitovati svaku komponentu posebno

---

#### **Korak 1.2: File Operations Utils** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Komponente:** DocumentList, DocumentUpload, FileSharing  
**Rizik:** Srednji  
**Vreme:** 4-6 sati  

```typescript
// utils/fileOperations.ts
export const useFileOperations = () => {
  const downloadFile = async (url: string, filename: string) => { /* ... */ };
  const previewFile = async (url: string) => { /* ... */ };
  const deleteFile = async (id: string, confirmMessage?: string) => { /* ... */ };
  
  return { downloadFile, previewFile, deleteFile };
};
```

---

#### **Korak 1.3: Status Icons Utils** 🎯 **PRIORITET 3**
**Status:** ❌ Nije započet  
**Komponente:** DocumentList, DocumentUpload, FileSharing  
**Rizik:** Nizak  
**Vreme:** 2-3 sata  

```typescript
// utils/statusIcons.ts
export const getStatusIcon = (status: 'uploading' | 'success' | 'error' | 'warning') => {
  // Centralizovana logika za status ikone
};
```

---

### **Faza 2: Zajedničke Komponente (2-3 dana)**

#### **Korak 2.1: IconButton Component** 🎯 **PRIORITET 1**
**Status:** ❌ Nije započet  
**Komponente:** 6+ komponenti  
**Rizik:** Nizak  
**Vreme:** 3-4 sata  

```typescript
// components/common/IconButton.tsx
interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  disabled?: boolean;
}
```

**Plan implementacije:**
1. Napraviti `components/common/IconButton.tsx`
2. Zameniti **jednu** ikonu u **jednoj** komponenti
3. Testirati da li izgleda isto
4. Ako radi, zameniti ostale ikone **jednu po jednu**

---

#### **Korak 2.2: FilePreviewModal Component** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Komponente:** DocumentList, DocumentUpload, FileSharing  
**Rizik:** Srednji  
**Vreme:** 4-6 sati  

```typescript
// components/common/FilePreviewModal.tsx
interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | Document;
  type: 'image' | 'document' | 'other';
}
```

---

#### **Korak 2.3: ConfirmDialog Component** 🎯 **PRIORITET 3**
**Status:** ❌ Nije započet  
**Komponente:** DocumentList, DocumentUpload, SessionSharing  
**Rizik:** Nizak  
**Vreme:** 2-3 sata  

```typescript
// components/common/ConfirmDialog.tsx
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}
```

---

#### **Korak 2.4: LoadingStates Component** 🎯 **PRIORITET 4**
**Status:** ❌ Nije započet  
**Komponente:** InfiniteScroll, VirtualScroll, ostale  
**Rizik:** Nizak  
**Vreme:** 2-3 sata  

```typescript
// components/common/LoadingStates.tsx
interface LoadingStatesProps {
  type: 'loading' | 'empty' | 'error' | 'end-of-content';
  message?: string;
  onRetry?: () => void;
}
```

---

### **Faza 3: Custom Hooks (1-2 dana)**

#### **Korak 3.1: useFileUpload Hook** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Komponente:** DocumentUpload  
**Rizik:** Srednji  
**Vreme:** 3-4 sata  

```typescript
// hooks/useFileUpload.ts
export const useFileUpload = () => {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const uploadFile = async (file: File) => { /* ... */ };
  const deleteUpload = async (id: string) => { /* ... */ };
  
  return { uploads, uploadFile, deleteUpload };
};
```

---

#### **Korak 3.2: useDocumentOperations Hook** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Komponente:** DocumentList  
**Rizik:** Srednji  
**Vreme:** 3-4 sata  

```typescript
// hooks/useDocumentOperations.ts
export const useDocumentOperations = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const fetchDocuments = async () => { /* ... */ };
  const deleteDocument = async (id: string) => { /* ... */ };
  const previewDocument = async (id: string) => { /* ... */ };
  
  return { documents, fetchDocuments, deleteDocument, previewDocument };
};
```

---

#### **Korak 3.3: useInfiniteScroll Hook** 🎯 **PRIORITET 3**
**Status:** ❌ Nije započet  
**Komponente:** InfiniteScroll, VirtualScroll  
**Rizik:** Nizak  
**Vreme:** 2-3 sata  

```typescript
// hooks/useInfiniteScroll.ts
export const useInfiniteScroll = (onLoadMore: () => void, hasMore: boolean) => {
  // Centralizovana logika za infinite scroll
};
```

---

### **Faza 4: Refaktorisanje Postojećih Komponenti (3-4 dana)**

#### **Korak 4.1: DocumentList.tsx** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Plan:**
- Zameniti copy-paste kodove sa novim utils/hooks
- Koristiti `useDocumentOperations` hook
- Koristiti `IconButton` komponentu
- Koristiti `ConfirmDialog` za brisanje

---

#### **Korak 4.2: DocumentUpload.tsx** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Plan:**
- Zameniti sa `useFileUpload` hook
- Koristiti zajedničke komponente za status i error
- Koristiti `FilePreviewModal` za preview

---

#### **Korak 4.3: FileHandling/FileSharing.tsx** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Plan:**
- Koristiti `useFileOperations` hook
- Koristiti `IconButton` komponentu
- Koristiti `FilePreviewModal` za preview

---

#### **Korak 4.4: MessageRenderer.tsx** 🎯 **PRIORITET 1**
**Status:** ❌ Nije započet  
**Plan:**
- Koristiti `useClipboard` hook
- Koristiti `IconButton` za copy dugme

---

#### **Korak 4.5: SessionSharing.tsx** 🎯 **PRIORITET 1**
**Status:** ❌ Nije započet  
**Plan:**
- Koristiti `useClipboard` hook
- Koristiti `ConfirmDialog` za opozivanje linkova

---

### **Faza 5: Performance i Virtual Scroll (1 dan)**

#### **Korak 5.1: Konsolidacija Scroll Komponenti** 🎯 **PRIORITET 3**
**Status:** ❌ Nije započet  
**Plan:**
- Spojiti `InfiniteScroll` i `VirtualScroll` u jednu komponentu
- Koristiti `LoadingStates` komponentu za sve loading/empty state-ove

---

### **Faza 6: Testiranje i Optimizacija (1-2 dana)**

#### **Korak 6.1: Testiranje** 🎯 **PRIORITET 1**
**Status:** ❌ Nije započet  
**Plan:**
- Testirati sve nove komponente
- Proveriti da li postojeće funkcionalnosti i dalje rade
- Testirati performance

#### **Korak 6.2: Optimizacija** 🎯 **PRIORITET 2**
**Status:** ❌ Nije započet  
**Plan:**
- Optimizovati bundle size
- Proveriti da li su svi import-ovi ispravni
- Ukloniti nepotrebne dependencies

---

## 📊 Prioriteti i Vremenska Linija

### **Visok Prioritet (Tjedan 1)**
1. **Clipboard utils** - koristi se u 4+ komponenti
2. **IconButton komponenta** - koristi se u 6+ komponenti
3. **FilePreviewModal** - koristi se u 3+ komponenti

### **Srednji Prioritet (Tjedan 2)**
1. **useFileUpload hook** - refaktorisanje DocumentUpload
2. **useDocumentOperations hook** - refaktorisanje DocumentList
3. **ConfirmDialog komponenta** - koristi se u 3+ komponenti

### **Nizak Prioritet (Tjedan 3)**
1. **LoadingStates komponenta** - konsolidacija scroll komponenti
2. **Performance optimizacija**
3. **Finalno testiranje**

---

## 🛡️ Safety Net - Za svaki korak

- ✅ Napraviti **backup** pre promene
- ✅ Testirati **funkcionalnost** pre komita
- ✅ Komitovati **svaku promenu** posebno
- ✅ Imati **rollback plan** ako nešto ne radi
- ✅ Testirati u **različitim browserima**
- ✅ Proveriti **mobile responsiveness**

---

## 📈 Očekivani Rezultati

### **Prednosti:**
- **50-70% manje dupliranog koda**
- **Lakše održavanje** - promene na jednom mestu
- **Bolja konzistentnost** - isti stilovi i ponašanja
- **Manji bundle size** - manje ponavljanja
- **Lakše testiranje** - centralizovana logika

### **Metrike:**
- **Broj linija koda:** -30% do -50%
- **Broj komponenti:** -20% (konsolidacija)
- **Bundle size:** -15% do -25%
- **Vreme razvoja:** +20% brže za nove funkcionalnosti

---

## 🚀 Sledeći Korak

**Počinjemo sa Korak 1.1: Clipboard Utils**

1. Napraviti `utils/clipboard.ts`
2. Testirati u `MessageRenderer.tsx`
3. Ako radi, primeniti na ostale komponente
4. Komitovati svaku promenu posebno

---

## 📝 Notes

- **Datum kreiranja:** 2025-07-05
- **Status:** Plan kreiran, čeka implementaciju
- **Prioritet:** Visok - poboljšanje održavanja koda
- **Vreme potrebno:** 2-3 nedelje (pažljivo, korak po korak) 