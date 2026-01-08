# Context 2: Bundle & Field Config (Configuratie als Product)

**Doel:** definieert *welke* velden bestaan en *welke* velden een import/export mag gebruiken.

## Core Termen
- **Bundle:** selectie van toegestane velden + prioriteiten voor een use-case.
- **Bundle Field:** specifiek veld binnen een bundle.
- **Priority (P0/P1/P2/P3):** belangrijkheid van het veld.
- **OR-groups:** logische groepering van velden (bijv. kleurcode OF kleurnaam).
- **Pim Field Definition:** definitie van het veld in het systeem.

## Belangrijkste Data
- `data_bundles`
- `data_bundle_fields` (bevat nu ook `ai_suggest_prompt` voor AI mapping hints)
- (en gerelateerde field-definition tabellen/functions)

## Invariants
1. **Geen Systeemvelden:** Systeemvelden (FK’s/timestamps/status) horen niet in bundles.
2. **Backward Compatibility:** Bundle wijzigingen moeten backward compatible blijven voor de MVP bundle (bundle_id=1).

## Beschikbare Bundles

### Bundle 1: MVP Leveranciersproduct
Standaard import voor leveranciersdata. Focus op EAN en basisgegevens.

### Bundle 2: Assortiment Import
Specifiek voor assortimentsproducten waarbij de structuur Merk + Model (Master) + Variant (SKU) leidend is.
Gebruikt AI prompts om velden correct te interpreteren voor de Master/Variant split.

**Configuratie Bundle 2:**
- **Variant (P0):** EAN, Maat (`supplier_size_code`), Variant Code (`supplier_color_code`)
- **Master (P0):** Merk (`supplier_brand_name`), Stijl (`supplier_style_name`), Categorie (`supplier_product_group`)
- **Overig (P1/P2):** Omschrijving, Prijs, Afbeeldingen

## Toegestane Contracten (Interfaces)
- Deze context wordt voornamelijk gelezen door andere contexten (Import Intake, Supplier Catalog) via de database tabellen `data_bundles` en `data_bundle_fields`.
