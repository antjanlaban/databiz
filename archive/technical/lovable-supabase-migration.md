# ONDERZOEK: Lovable "Eject" & Supabase Eigen Beheer

## Probleemstelling
De huidige Supabase-instantie wordt beheerd door Lovable ("Lovable Cloud"). Dit leidt tot beperkingen:
- Geen directe SQL-toegang of externe connectie.
- Afhankelijkheid van Lovable-frontend voor migraties.
- Geen toegang tot de volledige Supabase Dashboard tools (backups, logs, extensies).
- Zorgen over vendor lock-in.

## Oplossing: "Bring Your Own Supabase"

Het is mogelijk (en zelfs gebruikelijk voor productie-apps) om Lovable te koppelen aan een **eigen Supabase project**.

### 1. Architectuur Verschil

| Feature | Lovable Managed (Huidig) | Eigen Supabase (Gewenst) |
|---------|--------------------------|--------------------------|
| **Eigenaar** | Lovable | Jij (op supabase.com) |
| **Dashboard** | Beperkt in Lovable UI | Volledig Supabase Dashboard |
| **SQL Toegang** | Nee / Beperkt | Ja (TablePlus, DBeaver, etc.) |
| **AI Features** | Werkt volledig | Werkt volledig* |
| **Kosten** | Via Lovable sub | Direct aan Supabase |

*\*Lovable kan nog steeds migraties schrijven en Edge Functions deployen, mits je de juiste API keys koppelt.*

### 2. Migratie Stappenplan ("Eject")

Om van de huidige situatie naar eigen beheer te gaan:

1.  **Nieuw Project:** Maak een nieuw project aan op [supabase.com](https://supabase.com).
2.  **Export Data (Huidig):**
    *   Probeer via Lovable Settings een export te maken.
    *   *Indien niet beschikbaar:* Gebruik de Lovable AI om een SQL dump script te genereren van je schema, of vraag support om een connection string.
3.  **Import Data (Nieuw):** Draai de migraties/schema op je nieuwe Supabase project.
4.  **Koppel Lovable:**
    *   Ga in Lovable naar **Project Settings > Integrations > Supabase**.
    *   Kies voor **"Connect existing project"** (of vergelijkbare optie).
    *   Vul de `Project URL` en `Anon Key` van je *nieuwe* project in.
5.  **Update Code:**
    *   Update je `.env` bestand lokaal met de nieuwe credentials.
    *   Update `supabase/config.toml` met het nieuwe Project ID.

### 3. Voordelen van deze aanpak
*   ✅ **Volledige Controle:** Je krijgt je SQL Editor, Table Editor en Database Settings terug in het Supabase dashboard.
*   ✅ **Directe Toegang:** Je kunt tools als DBeaver of Prisma direct verbinden.
*   ✅ **Geen Lock-in:** Als je stopt met Lovable, blijft je database gewoon draaien.
*   ✅ **Lovable Blijft Werken:** Lovable fungeert nu als een "slimme client" die code genereert die praat met *jouw* database.

### 4. Conclusie
De beperkingen die je ervaart zijn specifiek voor de "Managed" modus. De oplossing is niet om Supabase zelf te hosten (Docker/VPS), maar om een **standaard Supabase Cloud project** te gebruiken en Lovable daarheen te laten wijzen. Dit is de officiële en ondersteunde manier om "enterprise" features te krijgen met Lovable.

## Waar vind ik dit in Lovable? (Stappenplan)

De optie zit soms wat verstopt omdat je eerst moet loskoppelen. Volg deze stappen:

1.  Open je project in Lovable.
2.  Klik op het **Tandwiel-icoon** (Project Settings) in de sidebar.
3.  Klik op het tabblad **Integrations**.
4.  Klik op **Supabase**.
5.  ⚠️ **Belangrijk:** Als er al een database gekoppeld is (de Lovable Cloud database), moet je eerst op de rode **Disconnect** knop klikken.
6.  Klik vervolgens op **Connect Supabase**.
7.  Er opent een scherm waar je moet inloggen bij Supabase.
8.  Na het inloggen zie je een lijst. Kies hier **niet** voor "Create new", maar **selecteer je bestaande project** uit de lijst.
