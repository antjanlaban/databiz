# Context 5: Master Catalog / Normalisatie

**Doel:** Normaliseren van supplier data naar een gestandaardiseerde master structuur (Master Product  Product Variant) voor downstream systemen (Webshops, ERP, KMS). Dit proces wordt gefaciliteerd door het **Intelligent Product Promotie Systeem**.

## Core Termen
- **Master Product (Style/Model):** De genormaliseerde stijl (bijv. "T-Shirt Basic"). Bevat merk, categorie, naam, omschrijving en gender.
- **Product Variant (SKU):** De verkoopbare eenheid (bijv. "T-Shirt Basic - Marineblauw - L"). Bevat EAN, prijs, voorraad, kleur en maat.
- **Promotie:** Het proces van het omzetten van supplier_products (ruw) naar master_products en product_variants (genormaliseerd).

## Belangrijkste Data
- master_products (Style level)
- product_variants (SKU level)

## Invariants
1. **Stamdata Validatie:** Kleuren en maten MOETEN gemapt zijn naar bestaande color_families en size_options. Geen vrije tekst toegestaan.
2. **Categorie Verplichting:** Elk Master Product MOET gekoppeld zijn aan een category (Taxonomy = ALG).
3. **Unieke Identifiers:** EAN's moeten uniek blijven over het hele systeem.
4. **Audit Trail:** De link naar de originele supplier_product_id moet behouden blijven voor traceability.

## Intelligent Product Promotie Systeem (Workflow)

Het promotieproces is vereenvoudigd naar een 2-laags model:

### Stap 1: Grouping & Selectie
- Groepeer supplier_products op basis van supplier_style_code (of vergelijkbaar).
- Identificeer unieke varianten (EANs) binnen de groep.

### Stap 2: Master Creatie (AI Assisted)
- Aanmaken van master_products record.
- **Velden:**
    - brand_id: Directe mapping of lookup.
    - category_id: AI mapping op basis van productnaam/omschrijving.
    - name: AI gegenereerde "Smart Name" (merk + model + kernwoorden).
    - description: Samengesteld uit supplier descriptions.
    - gender: AI afleiding (Heren/Dames/Unisex/Kids).

### Stap 3: Variant Creatie (AI Assisted)
- Aanmaken van product_variants records voor elke EAN.
- **Velden:**
    - ean: Directe overname (P0).
    - stock: Indicator (True/False).
    - price: Adviesprijs.
    - color_id: AI mapping van supplier_color naar color_families.
    - size_id: AI mapping van supplier_size naar size_options (context: gender/productgroep).

## Toegestane Contracten (Interfaces)

### Inkomend (API & Database)
- **Supplier Catalog  Master Catalog:**
  - Functie: promote_products(supplier_product_ids[])
  - Input: Lijst van IDs om te promoveren.
  - Output: Nieuwe Master ID en Variant IDs.

### Uitgaand
- **Master Catalog  Export:**
  - Views/API's die de genormaliseerde data ontsluiten voor Gripp, KMS, etc.
