# Tone of Voice & Language

> **Interface Language**: Dutch (Nederlands) 🇳🇱
> **Code & Documentation**: English 🇺🇸
> **Style**: Professional, Friendly, Helpful

---

## 1. Core Principles

### Professional but Friendly
We speak to professionals, but we are not robots.
- ✅ **DO**: "Wijzigingen opgeslagen."
- ❌ **DON'T**: "De data is succesvol weggeschreven naar de database." (Too technical)
- ❌ **DON'T**: "Joepie! Het is gelukt! 🎉" (Too informal)

### Helpful & Clear
When things go wrong, we explain **what** happened and **how** to fix it.
- ✅ **DO**: "Dit e-mailadres is niet geldig. Controleer of er een '@' in staat."
- ❌ **DON'T**: "Ongeldige invoer." (Too vague)
- ❌ **DON'T**: "Error 500." (Useless)

### Concise
Users scan, they don't read. Keep labels and messages short.
- ✅ **DO**: "Wachtwoord vergeten?"
- ❌ **DON'T**: "Ben je misschien je wachtwoord vergeten? Klik dan hier."

---

## 2. Error Messages Strategy

We use a **Two-Layer Error Strategy**:

1.  **User Message (Visible)**: Clear, actionable, Dutch.
    *   *Example*: "Het importeren van het bestand is mislukt omdat het formaat onjuist is."
2.  **Technical Detail (Expandable/Console)**: Precise, English/Code, for debugging.
    *   *Example*: `Error: CSV header mismatch. Expected 'sku', found 'product_id'.`

---

## 3. Language Separation

| Context | Language | Example |
|---------|----------|---------|
| **UI Labels** | Dutch | "Opslaan", "Annuleren", "Nieuw Product" |
| **Success Messages** | Dutch | "Product succesvol aangemaakt." |
| **Error Messages** | Dutch | "Kan geen verbinding maken met de server." |
| **Code (Variables)** | English | `const saveButton = ...` |
| **Code (Comments)** | English | `// Handle form submission` |
| **Git Commits** | English | `feat: add product creation form` |
| **Documentation** | English | "This component renders a product card." |

---

## 4. Ubiquitous Language (Domain Specific)

Terminology is defined at the **Project Level** (see `.ai/project/design-system/BRAND_GUIDELINES.md`).
Agents must respect the domain language of the specific industry (e.g., "Artikel" vs "Product", "Maatbalk" vs "Size Range").

**Agent Rule**: If you encounter a domain term, check the project's Ubiquitous Language dictionary first. Never invent new terms for existing concepts.
