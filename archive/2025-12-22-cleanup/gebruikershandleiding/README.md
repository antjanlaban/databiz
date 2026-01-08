# Van Kruiningen PIM - Gebruikershandleiding

Welkom bij de gebruikershandleiding van het Van Kruiningen PIM systeem.

## Over dit systeem

Het Van Kruiningen PIM is een **multi-tenant Product Information Management systeem** specifiek ontworpen voor de bedrijfskleding industrie. Het systeem fungeert als een **data transformatie hub**: inconsistente leveranciersdata wordt geïmporteerd, genormaliseerd en verrijkt, en vervolgens geëxporteerd naar externe systemen zoals ERP en webshops.

## Documentatie structuur

Deze handleiding volgt de structuur van de applicatie zelf voor maximale herkenbaarheid:

### 📚 [00. Inleiding](./00-inleiding/README.md)
Algemene informatie over het systeem, concepten en terminologie.

### 🚀 [01. Aan de slag](./01-aan-de-slag/README.md)
Eerste stappen: inloggen, navigatie en basisinstellingen.

### 📊 [02. Stamdata beheer](./02-stamdata-beheer/README.md)
Beheer van stamdata: leveranciers, merken, categorieën, kleuren, maten en decoratie-opties.

### 📥 [03. Import proces](./03-import-proces/README.md)
**Stap-voor-stap uitleg van het complete importproces** - van bestandsupload tot dataset activatie.

### 🤖 [04. AI Engine](./04-ai-engine/README.md)
AI-gestuurde mapping, kwaliteitsanalyse en data-verrijking.

### 🏷️ [05. Product beheer](./05-product-beheer/README.md)
Overzicht en beheer van producten, varianten en kwaliteitsindicatoren.

### 📦 [06. Leveranciers catalogus](./06-leveranciers-catalogus/README.md)
Beheer van ruwe leveranciersdata en bulkacties.

### ⚙️ [07. Systeembeheer](./07-systeembeheer/README.md)
Gebruikersbeheer, rollen en rechten.

### 🔄 [08. Processen](./08-processen/README.md)
Cross-functionele workflows zoals nieuwe leverancier onboarden en product-naar-export trajecten.

### 📖 [09. Referentie](./09-referentie/README.md)
Technische referentie: veldspecificaties, validatieregels en dataformaten.

---

## Snelle navigatie

**Nieuw in het systeem?** Start bij [Aan de slag](./01-aan-de-slag/README.md)

**Import uitvoeren?** Ga naar [Import proces - Stap voor stap](./03-import-proces/stap-voor-stap.md)

**Stamdata instellen?** Bekijk [Stamdata beheer](./02-stamdata-beheer/README.md)

**Problemen oplossen?** Check [Troubleshooting](./03-import-proces/troubleshooting.md)

---

## Belangrijkste concepten

### Tenant isolatie
Elk bedrijf (tenant) heeft een volledig gescheiden dataset. Data kan **nooit** tussen tenants lekken.

### Dataset lifecycle
1. **Staging** - Ruwe data uit bestand (supplier_raw_data)
2. **Mapping** - Kolommen worden gekoppeld aan PIM-velden
3. **Validation** - Data wordt gecontroleerd op kwaliteit
4. **Dataset** - Genormaliseerde leveranciersdata (datasets table)
5. **Activatie** - Dataset wordt actief en overschrijft oude data
6. **Promotion** - Varianten worden gepromoot naar master products

### Data transformatie flow
```
Excel/CSV → Parse → Stage → Map → Validate → Dataset → Activate → Promote → Export
```

---

**Versie:** 1.0  
**Laatst bijgewerkt:** November 2025
