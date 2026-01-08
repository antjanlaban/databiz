# Documentation Archive

Dit archief bevat verouderde documentatie die vervangen is door nieuwere versies. Bestanden hier worden bewaard voor historische referentie en rollback mogelijkheden.

## Gearchiveerde Import Documentatie

### Import Architecture Evolution

| Versie | Bestand | Datum Gearchiveerd | Reden |
|--------|---------|-------------------|-------|
| v6.0 | `import-architecture-v6.0.md` | 2025-01-12 | Vervangen door v8.0 - Simplified P0 Template System |
| v5.0 | `FASEN_OVERZICHT-v5.0.md` | 2025-01-12 | Vervangen door v8.0 geïntegreerde architectuur |

### Belangrijke Verschillen v6.0 → v8.0

**v6.0 (Split Flow):**
- 3-fase architectuur: IMPORT → CONVERT → ACTIVATE
- Complexe template management met UI
- AI suggesties voor alle velden (inclusief P0)
- Handmatige template selectie vereist
- Column mappings + normalization mappings (color/size/category)
- Template confidence scores en feedback loops

**v8.0 (Simplified P0 Template System):**
- Single-phase flow: IMPORT → Auto-ACTIVE
- Vereenvoudigde templates: alleen P0 mappings
- Auto-save/auto-load templates (geen UI)
- Kolom mismatch detectie
- Handmatige P0 mapping (geen AI)
- AI alleen voor P1/P2/P3 velden
- Auto-deactivation van oude imports

### Andere Gearchiveerde Documentatie

*(Nog geen andere items)*

---

## Gebruik van Gearchiveerde Documentatie

**Waarschuwing:** Gearchiveerde documentatie beschrijft oude implementaties die mogelijk niet meer werken met de huidige codebase.

**Raadplegen voor:**
- Historische context bij design beslissingen
- Rollback scenario's (in noodgevallen)
- Migratie pad begrip
- Leren van vorige implementaties

**NIET gebruiken voor:**
- Nieuwe feature ontwikkeling
- Bug fixes in productie code
- Training nieuwe developers
- User guides

---

**Last Updated:** 2025-01-12  
**Maintained By:** Development Team
