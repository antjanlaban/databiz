# 00. Inleiding

## Over het Van Kruiningen PIM systeem

Het Van Kruiningen PIM is een **data transformatie hub** specifiek ontworpen voor de bedrijfskleding industrie, waar geen standaardisatie bestaat in leveranciersdata.

### Het probleem dat we oplossen

Bedrijfskleding leveranciers leveren hun catalogusdata in wildly verschillende formaten:
- **Verschillende SKU-notaties**
- **Verschillende maatnotaties** (XS-5XL vs 44-64 vs S-XXXL)
- **Verschillende kleurnamen** ("Navy" vs "Donkerblauw" vs "Marine")
- **Verschillende Excel layouts** (kolommen, volgorde, benamingen)
- **Verschillende prijsstructuren**

### Onze oplossing

Het PIM systeem:
1. **Accepteert** alle formaten via flexibele import
2. **Normaliseert** data naar één uniforme structuur
3. **Verrijkt** data met AI en kwaliteitscontroles
4. **Exporteert** gestandaardiseerde data naar ERP/webshops

## Kernconcepten

### Multi-tenant architectuur
- Elk bedrijf heeft een **volledig gescheiden** dataset
- **Tenant ID** wordt automatisch aan alle data gekoppeld
- **Geen cross-tenant data leakage mogelijk**

### Dataset lifecycle

#### 1. Staging (Ruwe data)
- Bestand wordt geparsed
- Data opgeslagen in `supplier_raw_data` tabel
- Nog geen normalisatie

#### 2. Mapping
- Leverancierskolommen worden gekoppeld aan PIM-velden
- AI kan suggesties doen
- Templates kunnen hergebruikt worden

#### 3. Validation
- Data wordt gecontroleerd op:
  - **Verplichte velden** (SKU, naam, etc.)
  - **Formaat** (SKU regex, prijs format)
  - **Referentiële integriteit** (categorieën bestaan)
  - **Business rules** (min bestelhoeveelheid, etc.)

#### 4. Dataset creatie
- Genormaliseerde data opgeslagen in `datasets` tabel
- Kwaliteitsscore berekend
- Impactanalyse uitgevoerd

#### 5. Activatie
- Dataset wordt actief
- Oude data wordt gearchiveerd
- Producten krijgen nieuwe `active_dataset_id`

#### 6. Promotion
- Varianten (kleur/maat combinaties) worden gepromoot
- Master products worden aangemaakt
- SKU's worden gegenereerd
- Data klaar voor export

### Data transformatie flow

```
┌─────────────┐
│ Excel/CSV   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Parse       │ ← Bestandsvalidatie
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Stage       │ ← Opslaan in supplier_raw_data
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Map         │ ← Kolommen → PIM velden
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Validate    │ ← Regelvalidatie
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Dataset     │ ← Normalisatie + kwaliteitsscore
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Activate    │ ← Dataset actief maken
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Promote     │ ← Varianten → Master products
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Export      │ ← Gripp ERP / Calculated KMS / Webshops
└─────────────┘
```

## Belangrijkste entiteiten

### Supplier (Leverancier)
- Uniek per tenant
- Heeft meerdere brands
- Heeft import templates

### Brand (Merk)
- Behoort tot één supplier
- Heeft producten

### Product Style (Master product)
- Uniek per brand
- Heeft varianten (kleur/maat combinaties)
- Heeft één SKU per variant

### Dataset
- Genormaliseerde leveranciersdata
- Heeft lifecycle status: `pending`, `active`, `archived`
- Heeft kwaliteitsscore (0-100)

### Import Job
- Trackrecord van import proces
- Heeft status: `pending`, `parsing`, `validating`, `completed`, `failed`
- Bevat statistieken en foutmeldingen

## Rollen en rechten

### Admin
- Volledige toegang
- Kan stamdata beheren
- Kan gebruikers beheren

### Import Manager
- Kan imports uitvoeren
- Kan datasets activeren
- Kan stamdata **bekijken**

### Product Manager
- Kan producten bewerken
- Kan exports uitvoeren
- **Geen** toegang tot imports

### Viewer
- Alleen-lezen toegang
- Kan data **bekijken**
- Geen bewerkrechten

---

## Volgende stappen

👉 [Aan de slag](../01-aan-de-slag/README.md) - Eerste login en navigatie  
👉 [Import proces](../03-import-proces/README.md) - Start met importeren  
👉 [Stamdata beheer](../02-stamdata-beheer/README.md) - Configureer stamdata
