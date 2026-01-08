# Supplier Data Examples

Deze folder bevat voorbeeldbestanden van verschillende leveranciers om inzicht te geven in de diverse dataformaten en structuren die worden aangeleverd.

## Overzicht Bestanden

### Excel Bestanden
- **Santino_10-2025.xlsx** - Santino leverancier prijslijst
- **TEE_JAYS_Datafile_2025-07-01_EU.xlsx** - TEE JAYS catalogus data
- **ELKA-Products-EN-Price-EUR.xlsx** - ELKA producten en prijzen
- **Prijslijst_Bestex_10-2025.xlsx** - Bestex prijslijst

### CSV Bestanden (Roerdink Catalogi)
- **Sixton_RoerdinkCatalog.csv** - Sixton veiligheidsschoenen
- **Grisport_RoerdinkCatalog.csv** - Grisport Safety werkschoenen
- **Puma_RoerdinkCatalog.csv** - Puma Safety schoenen

## Doel

Deze voorbeeldbestanden dienen als referentie voor:

1. **Column Mapping Templates** - Begrijpen welke kolommen leveranciers gebruiken
2. **Data Normalisatie** - Identificeren van inconsistenties die genormaliseerd moeten worden
3. **Validatie Rules** - Bepalen welke validaties nodig zijn
4. **Import Wizard Testing** - Test data voor de import functionaliteit

## Belangrijke Observaties

### CSV Formaat (Roerdink)
- **Delimiter**: Puntkomma (`;`)
- **Encoding**: UTF-8 met BOM (`ï»¿`)
- **Kolommen**: ModelID, ArtikelID, Merk, Model, TekstAlgemeen, Maat, BrutoPrijs, Korting, EAN, etc.
- **Prijsformaat**: Euro symbool met komma decimaal (`€ 127,95`)
- **Voorraad**: Numerieke waarde
- **Afbeeldingen**: Meerdere URLs gescheiden door komma's

### Excel Formaat (Diverse leveranciers)
- Verschillende tabbladstructuren mogelijk
- Variërende kolomnamen per leverancier
- Verschillende prijsformaten
- Soms meerdere worksheets per bestand

## Gebruik in Import Wizard

Deze bestanden kunnen worden gebruikt om:
- De `analyze-import-file` Edge Function te testen
- Import templates te creëren en te valideren
- De mapping-logica te verfijnen
- Edge cases te identificeren

## Beveiligingsnotitie

⚠️ **BELANGRIJK**: Deze bestanden bevatten mogelijk echte prijzen en productdata. Behandel ze als vertrouwelijke informatie en gebruik ze alleen voor development/testing doeleinden binnen het project.
