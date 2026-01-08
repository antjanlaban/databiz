# Context 7: Export & Integraties

**Doel:** exporteren naar externe systemen (Gripp/Calculated/Webshop) via channels + jobs.

## Core Termen
- **Export Channel:** Doelsysteem (bijv. Gripp).
- **Requirement:** Vereiste voor export naar een channel.
- **Export Job:** Uitvoering van een export.
- **Delivery:** Levering van data.
- **Retry/Idempotency:** Mechanisme voor herhaling en voorkomen van dubbele data.

## Belangrijkste Data
- export channel tabellen
- export job tabellen
- (en integratie logging)

## Belangrijkste Backend
- **Edge Functions:**
    - `export-generic`
    - `check-export-readiness`
    - health checks

## Invariants
1. **P0 Check:** Export mag nooit P0-blockers omzeilen.
2. **Idempotency:** Exports zijn idempotent per job/run waar mogelijk (geen dubbele pushes zonder trace).

## Toegestane Contracten (Interfaces)
- **Export & Integraties → Export & Integraties**: Edge Function `export-generic`
- **Export & Integraties → Data Quality & Readiness**: Edge Function `check-export-readiness`
