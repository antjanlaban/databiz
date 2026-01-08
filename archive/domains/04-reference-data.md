# Context 4: Reference Data / Stamdata Beheer

**Doel:** beheren van stabiele referentiedata die door import, quality en export gebruikt wordt.

## Core Termen
- **Brand:** Merk.
- **Supplier:** Leverancier.
- **Color Family:** Kleurgroep.
- **Color Option:** Specifieke kleuroptie.
- **Category:** Productcategorie.
- **Size Standard:** Maatvoering standaard.

## Belangrijkste Data
- `brands`
- `suppliers`
- `color_families` (Genormaliseerde kleurgroepen, bijv. "Blauw")
- `color_options` (Specifieke tinten, gekoppeld aan een Color Family, bijv. "Marineblauw" -> "Blauw")
- `categories`
- `clothing_types`
- (en sizing tabellen)

## Invariants
1. **Leading Source:** Reference data is leidend; andere contexts verwijzen hiernaar via IDs/keys.
2. **Admin Only:** Mutaties zijn admin-only en moeten auditbaar zijn (RLS + logging waar aanwezig).
3. **Clean Data:** Voeg geen import-specifieke velden/logica toe aan stamdata-tabellen.

## Toegestane Contracten (Interfaces)
- Deze context wordt voornamelijk gelezen door andere contexten via Foreign Keys en lookups.
