# Use Cases

**Last Updated:** 17 oktober 2025  
**Version:** 1.0

---

## Overview

Gedetailleerde use cases met actors, pre-conditions, flows en post-conditions.

---

## UC-001: Nieuwe Productlijn Importeren

**Actor:** Productmanager  
**Precondities:**

- User is ingelogd
- Heeft Excel bestand van leverancier
- Heeft bestandsformaat mapping template (of maakt nieuwe)

**Main Flow:**

1. User navigeert naar Import pagina
2. System toont file upload interface
3. User selecteert Excel bestand (bijv. "Tricorp_Zomer2025.xlsx")
4. System valideert bestand (type, grootte)
5. System upload naar Storage
6. System parseert bestand, detecteert kolommen
7. System toont kolom mapping interface
8. User mapt kolommen:
   - "Artikelnummer" → sku_code
   - "Omschrijving" → style_name
   - "Kleur" → color_name_supplier
   - "Maat" → size_code
   - "Prijs" → selling_price_excl_vat
9. User selecteert "Bewaar mapping als 'Tricorp Standard'"
10. System valideert data, toont rapport:
    - 1,500 rijen gevonden
    - 3 errors (missing EAN)
    - 15 warnings (prijs = 0)
11. User kiest "Fix errors" of "Continue with warnings"
12. User klikt "Start Import"
13. System start Edge Function processing
14. System toont real-time progress (0% → 100%)
15. System completeert import, toont resultaten:
    - 1,480 SKUs geïmporteerd
    - 1,200 nieuwe, 280 geüpdatet
    - 17 gefaald (zie error log)
16. User downloadt error log voor fixing

**Post-conditie:**

- Producten zijn in database
- Import job is gelogd
- Mapping template is opgeslagen

**Alternative Flows:**

**4a. Invalid file format**

- System toont error: "Alleen .xlsx, .xls, .csv"
- Return to step 3

**10a. Critical errors prevent import**

- System toont: "Fix X errors voor import mogelijk is"
- User download error rapport
- User fix bestand, restart vanaf step 3

**13a. Server error during processing**

- System marks job as failed
- System logs error details
- User receives notification
- User kan retry

---

## UC-002: Prijs Aanpassing voor Actie

**Actor:** Productmanager  
**Precondities:**

- Producten bestaan in systeem
- User heeft edit rechten

**Main Flow:**

1. User navigeert naar Products pagina
2. System toont product lijst (KERN products, active)
3. User filtert op merk: "Tricorp"
4. User filtert op categorie: "Polo's"
5. System toont gefilterde lijst (120 SKUs)
6. User selecteert "Bulk edit" optie
7. User selecteert alle SKUs (checkbox)
8. User klikt "Edit prices"
9. System toont bulk edit dialog
10. User voert in:
    - Sales discount: 15%
    - Valid from: 2025-11-01
    - Valid until: 2025-12-31
11. System preview: "120 SKUs krijgen 15% korting"
12. User confirmeert
13. System updatet alle SKUs:
    - Set sales_discount_perc = 15
    - Set discount dates
    - Recalculate final_price_excl_vat
14. System logt prijswijziging in price_history
15. System toont success: "120 SKUs bijgewerkt"

**Post-conditie:**

- Prijzen zijn aangepast
- Price history logs bestaan
- Korting is actief vanaf ingestelde datum

**Alternative Flows:**

**12a. Validation error**

- Korting > 100%: Error "Korting max 100%"
- Invalid dates: Error "Einddatum moet na startdatum"
- Return to step 10

---

## UC-003: Sync naar Gripp ERP

**Actor:** System (scheduled) of Productmanager (manual)  
**Precondities:**

- Gripp credentials configured
- Products exist in PIM
- Gripp API is bereikbaar

**Main Flow:**

1. Trigger: Scheduled job (daily 06:00) of manual button click
2. System creates sync job record
3. System queries KERN products:
   - WHERE product_type = 'KERN'
   - AND is_active = TRUE
   - AND is_published = TRUE
   - AND tenant_id = [current]
4. System haalt 1,245 producten op
5. System transform naar Gripp format:
   - Map velden volgens export-formats.md
   - Convert prijzen (cents → euros)
   - Format productomschrijving
6. System split in batches (100 per batch)
7. For each batch:
   - POST naar Gripp API /products/bulk
   - Handle response (201 Created of 40X error)
   - Update sync job progress
8. System aggregeert resultaten:
   - 1,240 success
   - 5 failed (API errors)
9. System marks sync job as completed
10. System update last_synced_at timestamps
11. If manual: System toont notification "Sync voltooid: 1,240 / 1,245"

**Post-conditie:**

- Gripp heeft actuele productdata
- Sync job is gelogd met results
- Failed items zijn gelogd voor retry

**Alternative Flows:**

**7a. Rate limit exceeded (HTTP 429)**

- System wait 60 seconds
- Retry batch
- If fails 3x: mark batch as failed, continue with next

**7b. Network error**

- System retry met exponential backoff
- Max 3 retries
- If persistent: fail entire sync job

**8a. > 10% failed**

- System send alert email naar admin
- Include error details

---

## UC-004: Decoratie Configureren voor Product

**Actor:** Productmanager  
**Precondities:**

- Product style exists
- Decoration methods & positions zijn gedefinieerd

**Main Flow:**

1. User opent product style detail page
2. System toont product info + "Decoratie" tab
3. User klikt "Decoratie" tab
4. System toont huidige decoratie opties (empty)
5. User klikt "Nieuwe decoratie optie"
6. System toont configuratie dialog
7. User selecteert:
   - Methode: "Borduren"
   - Positie: "Borst links"
8. User voert in:
   - Setup fee: €35.00
   - Prijs per stuk: €4.50
   - Min. order qty: 10
   - Max. kleuren: 6
   - Max. steken: 10,000
9. User klikt "Opslaan"
10. System valideert input
11. System insert in decoration_options tabel
12. System toont decoratie optie in lijst
13. User herhaalt voor andere methode:
    - Methode: "Zeefdruk"
    - Positie: "Rug"
    - Setup: €45, Prijs: €3.25, Min: 1
14. System saves
15. User klikt "Publiceer naar Calculated"
16. System export product inclusief decoratie opties

**Post-conditie:**

- Product heeft configureerbare decoratie opties
- Verkopers weten welke decoratie mogelijk is
- Pricing is duidelijk

**Alternative Flows:**

**10a. Validation fails**

- Min order qty < 1: Error
- Prijs negatief: Error
- Return to step 8

---

## UC-005: Voorraad Mutatie Verwerken

**Actor:** Magazijnmedewerker  
**Precondities:**

- User heeft voorraad rechten
- Producten hebben SKUs

**Main Flow:**

1. User ontvangt levering van leverancier (500 polo's)
2. User navigeert naar Stock Management
3. User zoekt op leveranciers ref: "Tricorp order #12345"
4. System toont alle SKUs uit die order (50 SKUs)
5. User selecteert alle SKUs
6. User klikt "Bulk stock update"
7. System toont dialog
8. User kiest "Add to current stock"
9. User voert in: +10 (elke SKU krijgt +10)
10. System preview: "50 SKUs: voorraad + 10"
11. User confirmeert
12. System update voor elke SKU:
    - stock_quantity += 10
    - updated_at = NOW()
13. System logt voorraad mutaties
14. System herberekent stock_available (quantity - reserved)
15. System toont success + nieuwe voorraad levels

**Post-conditie:**

- Voorraad is bijgewerkt
- Stock mutatie is gelogd
- Products zijn beschikbaar voor verkoop

**Alternative Flows:**

**9a. Negative adjustment (retour/correctie)**

- User kiest "Subtract from stock"
- User voert -5 in
- System validate: new stock_quantity >= 0
- If would go negative: show warning per SKU

---

## UC-006: Klant Logo Uploaden voor Borduren

**Actor:** Verkoopmedewerker  
**Precondities:**

- Customer heeft logo bestand
- Product ondersteunt borduren

**Main Flow:**

1. User navigeert naar Decoratie pagina
2. User selecteert customer: "Bedrijf XYZ"
3. User klikt "Upload logo"
4. System toont upload dialog
5. User selecteert logo bestand (PNG, 5MB, 500x500px)
6. System valideert:
   - Format: PNG/JPG/SVG ok
   - Size: < 5MB ok
   - Resolution: 300 DPI ok (voor borduren)
7. System upload naar Storage: /logos/tenant-id/customer-id/
8. System toont preview:
   - Logo op borst links positie
   - Max. afmeting: 10x10cm
   - Geschatte steken: 8,500
9. User ziet preview is ok
10. User voert in:
    - Logo naam: "Bedrijf XYZ hoofdlogo"
    - Decoratie kleur: Pantone 185C (rood)
11. User klikt "Opslaan"
12. System save logo metadata
13. System koppelt logo aan customer
14. Logo is herbruikbaar voor volgende orders

**Post-conditie:**

- Logo is opgeslagen
- Logo is gekoppeld aan klant
- Logo kan gebruikt worden in offerte/order

**Alternative Flows:**

**6a. Resolution te laag (< 300 DPI)**

- System toont warning: "Voor borduren min. 300 DPI aanbevolen"
- User kan doorgaan (at own risk) of cancel

**6b. File te groot (> 5MB)**

- System toont error: "Max 5MB"
- User moet bestand verkleinen
- Return to step 5

---

## Actor Summary

| Actor              | Access Level            | Primary Use Cases      |
| ------------------ | ----------------------- | ---------------------- |
| Productmanager     | Full product management | UC-001, UC-002, UC-004 |
| Magazijnmedewerker | Stock management only   | UC-005                 |
| Verkoopmedewerker  | View + decoratie        | UC-006                 |
| System (automated) | N/A                     | UC-003                 |
| Eigenaar           | All access              | All use cases          |

---

_Use cases worden uitgebreid naarmate functionaliteit groeit._
