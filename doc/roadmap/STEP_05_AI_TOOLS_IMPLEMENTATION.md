# Step 05 — AI Creative Tools Implementation
> Type: Development — AI Features & Modules
> Prerequisite: `STEP_01_COMPONENT_DEVELOPMENT.md` Phase 1 & 2
> Reference: `AI_TOOLS_UNIFIED_BLUEPRINT.md`

---

## Roadmap Overview

This roadmap covers the implementation of the 6 AI modules and the required infrastructure (BYOK) for the Unified AI Creative Suite.

---

## Phase 1 — Infrastructure & Integration

### 5.1 `AIIntegrationPage` — `src/pages/settings/AIIntegrationPage.tsx`
**What it is:** User settings page to connect their own Gemini API key.
**Features:**
- Provider selector (Google AI / Gemini)
- API Key input (masked)
- "Test Connection" button (validates key via lightweight API call)
- Status badge (Connected/Disconnected)
- Instructions on how to get an API key

### 5.2 `aiService` — `src/services/aiService.ts`
**What it is:** Unified service to handle all AI API calls using the user's provided key.
**Features:**
- Decryption of user key (if stored encrypted)
- Routing requests to correct models (Gemini Flash Image, Gemini Pro, etc.)
- Error handling for invalid/expired keys

---

## Phase 2 — AI Studio Foundation

### 5.3 `AIStudioPage` — `src/pages/dashboard/AIStudioPage.tsx`
**What it is:** The main hub for all AI tools.
**Features:**
- Tab-based navigation between 6 modules: Studio, Editor, Chat, Voice, Video, Captions
- Unified layout with Control Panel (Left) and Output Panel (Right)
- "Empty State" for no active generation

---

## Phase 3 — Module 1: AI Image Studio (Primary)

### 5.4 Image Studio Controls
**Features:**
- Multi-image reference upload (up to 8)
- Visual Prompt Builder (tag-based)
- Magic Prompt button (AI rewrite)
- Precision Sliders (Identity Strength, Realism, etc.)
- Generation settings (Aspect Ratio, Batch Size)

### 5.5 Generation Pipeline
**Features:**
- Progress indicator with rotating status messages
- Grid display for batch results
- Per-image actions (Download, Regenerate, Use as Input)
- Auto-save to user's Firestore gallery

---

## Phase 4 — Module 2 & 3: Editor & Chat

### 5.6 Image Editor
- Edit Mode: Upload + text-based instructions
- Create Mode: Text-to-image from scratch

### 5.7 AI Chat Assistant
- Conversational interface with persistent history
- Contextual system prompt based on active tool

---

## Phase 5 — Module 4, 5 & 6: Specialized Tools

### 5.8 Voice Concierge
- Real-time audio streaming (Gemini Native Audio)
- Live transcription display

### 5.9 Video Studio
- Image-to-video generation (Veo 3.1)
- Progress tracking for long operations

### 5.10 Caption Generator
- Multi-platform optimization (IG, TikTok, LinkedIn)
- One-click copy and scheduling integration

---

## Phase 6 — Advanced Logic

### 5.11 Style DNA (Reference Stacking)
- Multi-slot reference handling (Identity, Style, Lighting)

### 5.12 Iterative "Fix This" Mode
- Region-based inpainting/editing

---

## AI Tools Checklist

- [ ] BYOK Integration works (User can save and test key)
- [ ] Image Studio generates correct results from reference
- [ ] Magic Prompt correctly enhances user input
- [ ] All 6 modules accessible and functional
- [ ] Gallery persists and displays all creations
- [ ] Advanced sliders influence the output as expected
- [ ] Responsive design (Mobile layout stacks panels)
- [ ] RTL support verified for all AI UI elements
