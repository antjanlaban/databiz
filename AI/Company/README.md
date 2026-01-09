# DataBiz Company Documentatie

> **Doel**: Centrale documentatie voor het instrueren van AI Agents over DataBiz
> **Laatste update**: 2026-01-08
> **Focus**: Project-specifieke informatie voor DataBiz

---

## Inhoudsopgave

1. [DataBiz Project Context](#deel-1-databiz-project-context)
2. [DataBiz Applicatie Specifics](#deel-2-databiz-applicatie-specifics)
3. [Wat we willen realiseren](#deel-3-wat-we-willen-realiseren)

---

## Deel 1: DataBiz Project Context

### Bedrijfsidentiteit

**DataBiZ** is de merknaam en bedrijfsnaam.

### Taalbeleid

- **Frontend/UI**: Nederlands (vriendelijk, netjes informeel, adviserend assistent)
- **Code, development documentatie, database**: Engels

**Belangrijk**: De applicatie frontendlaag begint met een Nederlandse taallaag. Al het andere (code, documentatie, database) is Engels.

### Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Geen aparte backend (alles in Next.js)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: 
  - Frontend: Cloudflare Pages
  - Database: Supabase

**Architectuur**: Next.js App Router met DDD-achtige structuur (Domain → Epic → Feature → Slice)

### Omgevingen

- **Development**: 1 Supabase ontwikkelomgeving
- **Production**: Aparte Supabase productie-omgeving (later)
- **Test**: Later toevoegen (GitHub Actions)
- **Acceptance**: Nog niet nodig

**Notitie**: Onderzoeken wat Supabase biedt voor staging-omgevingen.

### Git Strategie

- **Huidig**: Werken op `main` (prototype fase)
- **Toekomst**: Best practices voor prototype → MVP transitie
- **Git worktrees**: Beschikbaar voor parallel werk wanneer nodig

**Workflow**: Kleine incrementele stappen, focus op completion.

### Architectuur

**Domain-Driven Design (DDD) structuur**: Domain → Epic → Feature → Slice

- Organisatie gebeurt op **business domain**, niet op technische lagen
- Elke slice bevat alles voor één use case (end-to-end)
- Code structuur in Next.js volgt DDD-achtige opzet

**Code organisatie**:
```
app/
├── (routes)/
│   ├── imports/          # Import domain
│   └── eans/              # EAN domain
├── api/                   # API routes
└── ...

src/ (of root level)
├── domains/              # Domain logic (DDD structuur)
│   ├── imports/
│   │   ├── services/     # Business logic
│   │   ├── schemas/      # Zod schemas
│   │   └── types/        # TypeScript types
│   └── eans/
├── lib/
│   ├── supabase/         # Supabase client
│   └── utils/
└── components/            # Shared UI components
```

### Agent Richtlijnen

**KRITISCH - Voorkom hallucinatie en te veel tegelijk ontwikkelen:**

- **Begin klein en duidelijk**: Project struikelt vaak bij 80% omdat AI agents het dan niet meer aankunnen
- **Focus op completion**: Niet grote features, maar kleine incrementele stappen
- **Duidelijke scope per taak**: Elke taak moet duidelijk afgebakend zijn
- **Agents moeten eerst lezen**: `AI/README.md` moet eerst gelezen worden voordat er code wordt geschreven

**Workflow voor agents:**

1. Lees eerst `AI/README.md` voor project context
2. Check `AI/Company/CODE_QUALITY_STRATEGY.md` voor code quality patterns en standaarden
3. Bepaal de scope (klein en duidelijk)
4. Implementeer één slice/feature tegelijk
5. Test en verifieer voordat je verder gaat
6. Focus op completion, niet op perfectie

**Planning**: T-sizing voor hoeveelheid werk, geen deadlines. Vibecoding aanpak.

---

## Deel 2: DataBiz Applicatie Specifics

### Visie

DataBiz is een **productdata-warehouse** voor workwear data:

- Centrale omgeving waar alle workwear-gerelateerde data wordt gecentraliseerd
- ETL transformaties voor verschillende kanalen
- Niet alleen import, maar volledige data-pipeline

### Pilot Klant

**Van Kruiningen Reclame** is de eerste klant en pilot klant.

### Belangrijk Verschil met Vorig Project

**Vorig project**: Master/Variant producten

**DataBiz**: Productvariant-systeem als basis (EAN-first)
- Eerst EAN verzamelen
- Dan managen tot assortimentsproducten

**Belangrijk**: Focus ligt op EAN-varianten als basis, niet op master/variant structuur.

### Database Model

Het database model is actueel voor de huidige fase. Zie `AI/README.md` voor volledige details.

**Belangrijkste tabellen**:
- `ean_catalog` (global EAN registry)
- `brands`, `suppliers` (global registries)
- `companies` (tenants)
- `import_sessions`, `import_raw_rows` (import tracking)
- `ean_conflicts`, `ean_history` (conflict resolution & audit)

### Roadmap & Prioriteiten

**Volgorde = data flow** (exacte volgorde waarin data door het systeem gaat):

1. **Import data** (huidige fase)
   - Data-import domain is actief
   - Upload, validatie, parsing, extractie

2. **EAN varianten (basis)**
   - Volgende domein
   - Opslag van EAN-variants uit succesvolle imports

3. **EAN varianten (verrijking)**
   - Productcategorisering
   - Omschrijvingen, afbeeldingen, pricing

4. **Assortiment**
   - Samenstellen van assortimenten
   - Modellen/styles (master), kleurenvarianten, maatvarianten

5. **Assortiment (verrijking)**
   - Verrijking van assortimentsproducten

6. **Exports**
   - Ontsluiting van data
   - Export naar ERP, commerciële tooling
   - Exportformaten: CSV, JSON, API

**Planning**: T-sizing voor hoeveelheid werk, geen deadlines.

### Import Workflow

**Huidige status**: Upload/Validation/Parse/Extract zijn onderdelen van de data-import domain.

**Belangrijke vereisten**:

- **Server-side queue verwerking**: Niet client-side
- **Voorkomen timeouts**: Verwerking heeft tijd nodig, dat is oké
- **Asynchroon verwerken**: Moet blijven werken als browser wordt gesloten
- **Queue systeem**: Data verwerking in een queue, niet direct

**Resultaat**: Goedgekeurde of afgekeurde datasets. Goedgekeurde datasets kunnen geactiveerd worden → EAN-Variants domain.

### UI Screens

**Huidige focus**: Import data screen (belangrijkste voor eerste domein)

- Resultaat: goedgekeurde/afgekeurde datasets
- Goedgekeurde datasets activeren → EAN-Variants domain

**Toekomst**: Screens voor EAN-varianten, Assortiment, Exports (volgens roadmap).

### Design System

**Eigen design system documentatie**: `AI/Company/DESIGN_SYSTEM.md`

- Design principles, component library, tone & voice
- Veel overgenomen van vorig project, aangepast voor DataBiz
- Zie `AI/Company/DESIGN_SYSTEM.md` voor volledige details

### Ubiquitous Language

**Belangrijk**: Dictionary opstellen voor consistente terminologie.

**Regels**:
- Nederlandse termen voor UI
- Engelse termen voor code
- Consistente terminologie door hele applicatie

**Voorbeelden**:
- UI: "EAN-variant", "Assortiment", "Dataset"
- Code: `EANVariant`, `Assortment`, `Dataset`

**Agent regel**: Check altijd de Ubiquitous Language dictionary voordat je nieuwe termen introduceert.

---

## Deel 3: Wat we willen realiseren

### Success Criteria (5 doelen)

1. **Gebruiker kan zoeken/browsen door alle EAN-varianten**
   - Zoekfunctionaliteit
   - Browse/overzicht van alle EAN-varianten

2. **EAN-varianten kunnen batchgewijs worden verrijkt**
   - Batch verwerking voor verrijking
   - Bulk updates mogelijk

3. **Assortimenten kunnen worden samengesteld**
   - UI voor samenstellen van assortimenten
   - Modellen/styles, kleuren, maten

4. **Assortimenten kunnen batchgewijs worden verrijkt**
   - Batch verwerking voor assortiment verrijking
   - Bulk updates voor assortimentsproducten

5. **Assortimentsproducten kunnen worden aangeboden/communiceren met andere applicaties**
   - Export functionaliteit
   - API/CSV/JSON exports
   - Integratie met externe systemen

### Performance

**Geen specifieke snelheidsdoelen**. Focus ligt op functionaliteit en gebruiksvriendelijkheid.

### Acceptatiecriteria Van Kruiningen Reclame

**Belangrijkste vereisten**:

1. **Communiceren met externe producten (exports)**
   - Export functionaliteit moet werken
   - Data moet beschikbaar zijn voor externe systemen

2. **Snel en gemakkelijk omzetten van EAN-varianten naar Assortimentsproducten**
   - Workflow moet soepel zijn
   - Gebruiksvriendelijke interface
   - Efficiënte conversie proces

### Integraties & Exports

**Focus**: Databundels die beschikbaar moeten worden gesteld (niet specifieke systemen).

**Fase 1 (huidig)**:
- Basale functionaliteit voor testen
- JSON en CSV bestanden
- Eenvoudige export mogelijkheden

**Fase 2 (later)**:
- Echte API-integraties
- Meer geavanceerde export opties
- Security/authenticatie (nog niet nodig in eerste fase)

**Exportformaten**: CSV, JSON, API

---

## Referenties

### Belangrijke documentatie

- `AI/README.md` - Project specifieke requirements en database model
- `docs/README.md` - Domain documentatie
- `AI/Company/DESIGN_SYSTEM.md` - Design system (voor UI patterns)
- `AI/Company/CODE_QUALITY_STRATEGY.md` - Code quality patterns en standaarden

### Agent Workflow

1. Lees eerst `AI/README.md` voor project context
2. Check `AI/Company/README.md` (dit document) voor project-specifieke richtlijnen
3. Check `AI/Company/DESIGN_SYSTEM.md` voor UI patterns
4. Check `AI/Company/CODE_QUALITY_STRATEGY.md` voor code quality patterns
5. Begin met kleine, duidelijke scope
6. Focus op completion, niet op perfectie

---

## Belangrijke Notities voor Agents

### Voorkom Hallucinatie

- **STOP & VERIFY**: Verifieer altijd bestaande code, tabellen, endpoints voordat je iets aanneemt
- **Kleine stappen**: Implementeer één slice/feature tegelijk
- **Completion focus**: Project struikelt vaak bij 80% - zorg dat je features afmaakt

### Code Structuur

- Volg DDD-achtige structuur (Domain → Epic → Feature → Slice)
- Code in `src/domains/` of `app/` volgens Next.js App Router
- Shared components in `components/`
- Supabase client in `lib/supabase/`

### Taal

- **UI**: Nederlands (vriendelijk, netjes informeel)
- **Code**: Engels
- **Documentatie**: Nederlands (dit document), Engels (code comments)

### Testing

- Test elke slice/feature voordat je verder gaat
- Focus op functionaliteit, niet op perfectie
- Server-side queue verwerking moet getest worden

---

**Laatste update**: 2026-01-08
**Versie**: 1.0.0

