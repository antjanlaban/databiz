# EAN-Varianten Domein - Plan & Vragen

## Huidige Situatie (Geanalyseerd)

### Data-import Domein Status
- ✅ **Status flow**: `pending → uploading → parsing → analyzing_ean → waiting_column_selection → processing → approved/rejected/failed`
- ✅ **Approved datasets**: Status `'approved'` betekent EAN analyse succesvol, bestand staat in `approved/` folder in Storage
- ✅ **Bestand locatie**: `approved/{sessionId}/{filename}` in Supabase Storage bucket `supplier-uploads`
- ✅ **Metadata beschikbaar**: `unique_ean_count`, `duplicate_ean_count`, `detected_ean_column`, `total_rows_in_file`, `columns_count`
- ❌ **Geen verdere verwerking**: Er is GEEN code die approved datasets verder verwerkt
- ❌ **Geen ean_variants tabel**: Deze tabel bestaat nog niet

### Database Schema (Huidig)
- ✅ `import_sessions` - met status `'approved'` voor goedgekeurde datasets
- ❌ `ean_variants` - **MOET NOG GEMAAKT WORDEN**
- ❌ `ean_catalog` - beschreven in AI/README.md maar niet gecontroleerd of deze bestaat
- ❌ `brands` - beschreven in AI/README.md maar niet gecontroleerd of deze bestaat
- ❌ `suppliers` - beschreven in AI/README.md maar niet gecontroleerd of deze bestaat
- ❌ `companies` - beschreven in AI/README.md maar niet gecontroleerd of deze bestaat

### Data Bron
- **Huidige situatie**: Data staat in het bestand in Storage (approved/ folder)
- **Huidige parser**: `lib/fileParser.ts` parseert alleen specifieke velden (ean, name, price, supplier)
- **Voor EAN-Varianten**: Moeten we ALLE kolommen kunnen uitlezen (niet alleen specifieke velden)

## EAN-Varianten Domein - Functionaliteit

### Startpunt
- **Trigger**: Import session met status `'approved'`
- **Actie**: Gebruiker activeert dataset → EAN-Varianten verwerking start

### Proces Flow (Zoals beschreven door gebruiker)

```
[Approved Dataset]
    ↓
[Activatie Trigger] → Gebruiker klikt "Activeer" of automatisch?
    ↓
[Data Controle] → Kolommen goed uitgelezen? Data goed uit te lezen?
    ↓
[Optioneel: JSON Conversie] → Als nodig voor performance
    ↓
[Vergelijk met EAN-variant tabel] → Duplicaten check
    ↓
[Verplichte Velden Vaststellen]
    ├─→ MERK (gebruiker selecteert)
    ├─→ Kleur (tekstveld - uit bestand?)
    ├─→ Maat (tekstveld - uit bestand?)
    └─→ EAN (al aanwezig)
    ↓
[Naam Samenstellen]
    ├─→ Combinatie van velden
    ├─→ Handmatige waarden
    ├─→ Scheidingstekens
    └─→ Redelijk uniek (controle maar niet blokkerend)
    ↓
[Update of New] → EAN-varianten tabel vullen
```

## Vragen die Beantwoord Moeten Worden

### 1. Database Schema
**Vraag**: Bestaan de volgende tabellen al, of moeten ze gemaakt worden?
- `ean_variants` - **KRITISCH**: Wat is de exacte structuur?
- `ean_catalog` - Bestaat deze al? (beschreven in AI/README.md)
- `brands` - Bestaat deze al? (beschreven in AI/README.md)
- `suppliers` - Bestaat deze al? (beschreven in AI/README.md)
- `companies` - Bestaat deze al? (beschreven in AI/README.md)

**Actie**: Controleer Supabase database voor bestaande tabellen.

### 2. EAN-Variants Tabel Structuur
**Vraag**: Wat is de exacte structuur van de `ean_variants` tabel?
- Welke kolommen zijn nodig?
- Relatie met `import_sessions`?
- Relatie met `ean_catalog` (als die bestaat)?
- Relatie met `brands`?
- Unieke constraints? (EAN alleen, of EAN + MERK + Kleur + Maat?)

**Voorgestelde structuur** (te bevestigen):
```sql
CREATE TABLE ean_variants (
  id UUID PRIMARY KEY,
  import_session_id BIGINT REFERENCES import_sessions(id),
  ean VARCHAR(14) NOT NULL,
  brand_id UUID REFERENCES brands(id), -- MERK (gebruiker selecteert)
  color TEXT NOT NULL, -- Kleur (tekstveld)
  size TEXT NOT NULL, -- Maat (tekstveld)
  name TEXT NOT NULL, -- Samengestelde naam
  raw_data JSONB, -- Alle originele data uit bestand
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 3. Activatie Trigger
**Vraag**: Hoe wordt activatie getriggerd?
- **Optie A**: Handmatig - gebruiker klikt "Activeer" knop op approved dataset
- **Optie B**: Automatisch - zodra status `'approved'` wordt, start verwerking
- **Optie C**: Queue-based - approved datasets worden in queue gezet voor verwerking

**Voorkeur gebruiker**: Handmatig of automatisch?

### 4. Data Controle
**Vraag**: Wat houdt "data controle" precies in?
- **A**: Valideren dat kolommen correct zijn uitgelezen (header detectie)
- **B**: Controleren of data compleet/valide is per rij
- **C**: Controleren of verplichte velden (MERK, Kleur, Maat, EAN) aanwezig zijn
- **D**: Alle bovenstaande

**Voorkeur**: Alle bovenstaande of specifieke subset?

### 5. JSON Conversie
**Vraag**: Wanneer is conversie naar JSON nodig?
- **A**: Altijd - voor betere performance bij querying
- **B**: Alleen bij grote bestanden (>X MB of >X rijen)
- **C**: Nooit - parse direct uit CSV/Excel bestand
- **D**: Optioneel - gebruiker kan kiezen

**Voorkeur**: Altijd, alleen bij grote bestanden, of nooit?

**Vraag**: Waar wordt JSON opgeslagen?
- **A**: Supabase Storage (nieuwe bucket of folder)
- **B**: Database (JSONB kolom in nieuwe tabel)
- **C**: Beide (Storage + Database)

**Voorkeur**: Storage, Database, of beide?

### 6. MERK Selectie
**Vraag**: Hoe werkt MERK selectie precies?
- **A**: Gebruiker selecteert MERK per dataset (alle rijen krijgen zelfde MERK)
- **B**: Gebruiker selecteert MERK per rij (individuele selectie)
- **C**: MERK wordt automatisch gedetecteerd uit bestand (kolom detectie)
- **D**: Combinatie: eerst detectie, dan gebruiker bevestigt/kiest

**Voorkeur**: Per dataset of per rij?

**Vraag**: Moet MERK uit bestand komen of handmatig gekozen?
- **A**: Altijd uit bestand (kolom detectie)
- **B**: Altijd handmatig (gebruiker kiest uit brands tabel)
- **C**: Eerst detectie, dan gebruiker bevestigt/kiest

**Voorkeur**: Detectie, handmatig, of combinatie?

**Vraag**: Bestaat er al een `brands` tabel om uit te kiezen?
- **Actie**: Controleer of `brands` tabel bestaat in database

### 7. Kleur en Maat Velden
**Vraag**: Waar komen Kleur en Maat vandaan?
- **A**: Uit bestand (kolom detectie - gebruiker selecteert kolommen)
- **B**: Handmatig ingevuld per rij
- **C**: Combinatie: eerst detectie, dan gebruiker bevestigt/kiest

**Voorkeur**: Detectie, handmatig, of combinatie?

**Vraag**: Moeten Kleur en Maat kolommen automatisch gedetecteerd worden?
- **A**: Ja, automatische detectie (zoals EAN kolom detectie)
- **B**: Nee, gebruiker selecteert kolommen handmatig
- **C**: Combinatie: suggestie + gebruiker bevestigt

**Voorkeur**: Automatisch, handmatig, of combinatie?

### 8. Naam Samenstelling
**Vraag**: Hoe werkt naam samenstelling precies?
- **Welke velden kunnen gebruikt worden?**
  - MERK (uit brands tabel)
  - Kleur (uit bestand)
  - Maat (uit bestand)
  - Andere kolommen uit bestand? (bijv. "Productnaam", "Omschrijving")
  - Handmatige waarden (gebruiker voegt tekst toe)

- **Welke scheidingstekens zijn toegestaan?**
  - Spatie
  - Streepje (-)
  - Underscore (_)
  - Slash (/)
  - Combinatie van bovenstaande?

- **Voorbeeld formaten?**
  - `{MERK} {Kleur} {Maat}` → "Tricorp Rood XL"
  - `{MERK} - {Kleur} - {Maat}` → "Tricorp - Rood - XL"
  - `{Productnaam} {Kleur} {Maat}` → "T-Shirt Basic Rood XL"
  - Andere formaten?

- **Wat betekent "redelijk uniek"?**
  - **A**: Controle op bestaande namen, waarschuwing maar niet blokkerend
  - **B**: Controle op bestaande namen, suggestie voor unieke naam
  - **C**: Geen controle, alleen waarschuwing als veel duplicaten
  - **D**: Geen controle, volledig vrij

**Voorkeur**: Welke aanpak?

### 9. Duplicaten Check
**Vraag**: Wat betekent "duplicaat" precies?
- **A**: Alleen op EAN (als EAN al bestaat → update)
- **B**: Combinatie EAN + MERK + Kleur + Maat (alle moeten overeenkomen)
- **C**: Combinatie EAN + MERK (EAN + MERK moet uniek zijn)
- **D**: Andere combinatie?

**Voorkeur**: Welke definitie?

**Vraag**: Wat gebeurt er bij duplicaat?
- **A**: Update bestaande record (overschrijf met nieuwe data)
- **B**: Skip (behoud bestaande, negeer nieuwe)
- **C**: Create new (toestaan meerdere records met zelfde EAN)
- **D**: Conflict queue (gebruiker moet beslissen)

**Voorkeur**: Update, skip, create new, of conflict queue?

### 10. Data Bron
**Vraag**: Wat is de data bron voor EAN-Varianten verwerking?
- **A**: Bestand in Storage (approved/ folder) - parse opnieuw
- **B**: Database tabel (als we import_raw_rows zouden maken)
- **C**: Beide (Storage als primair, Database als backup)

**Huidige situatie**: Data staat alleen in Storage bestand
**Voorkeur**: Storage, Database, of beide?

**Vraag**: Moeten we `import_raw_rows` tabel maken om data op te slaan?
- **A**: Ja, maak import_raw_rows tabel voor audit trail
- **B**: Nee, parse direct uit Storage bestand
- **C**: Optioneel - alleen als JSON conversie nodig is

**Voorkeur**: Tabel maken of direct uit Storage?

### 11. Status Flow Uitbreiding
**Vraag**: Moeten we nieuwe statussen toevoegen aan `import_sessions`?
- **A**: Nee, gebruik bestaande status `'approved'` en voeg nieuwe status toe voor "geactiveerd"
- **B**: Ja, voeg status toe zoals `'activating'`, `'activated'`, `'activation_failed'`
- **C**: Gebruik aparte tabel voor activatie status

**Voorkeur**: Nieuwe statussen of aparte tabel?

### 12. UI/UX Flow
**Vraag**: Wat is de gebruikersflow?
- **Stap 1**: Gebruiker ziet approved datasets → klikt "Activeer"
- **Stap 2**: Data controle scherm → toont kolommen, gebruiker bevestigt
- **Stap 3**: MERK selectie → gebruiker selecteert MERK (per dataset of per rij?)
- **Stap 4**: Kleur/Maat kolom selectie → gebruiker selecteert kolommen
- **Stap 5**: Naam samenstelling configuratie → gebruiker configureert naam template
- **Stap 6**: Preview → toont preview van EAN-varianten die gemaakt worden
- **Stap 7**: Bevestiging → gebruiker bevestigt → verwerking start
- **Stap 8**: Resultaat → toont hoeveel EAN-varianten gemaakt/geupdate zijn

**Klopt deze flow?** Of anders?

## Volgende Stappen

1. **Beantwoord bovenstaande vragen** - zodat we exact weten wat er gebouwd moet worden
2. **Controleer database** - welke tabellen bestaan al?
3. **Maak domain model** - zodra vragen beantwoord zijn
4. **Maak ETL workflow** - beschrijf het proces
5. **Maak test cases** - definieer test scenarios
6. **Update README** - voeg EAN-Varianten toe als domein

## Belangrijke Aandachtspunten

- **Begin klein**: Focus op core functionaliteit eerst
- **Completion focus**: Maak features af, niet perfect
- **DDD structuur**: Volg Domain → Epic → Feature → Slice structuur
- **Nederlandse UI**: Frontend in Nederlands, code in Engels
- **Queue-based**: Server-side verwerking, niet client-side
- **Error handling**: Graceful degradation, geen crashes

