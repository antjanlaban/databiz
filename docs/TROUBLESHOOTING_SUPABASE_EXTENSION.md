# Troubleshooting: Supabase Extension Connection Errors

## Probleem
Herhaaldelijke foutmelding in Cursor:
```
Connection failed. If the problem persists, please check your internet connection or VPN
```

## Oorzaak
De Supabase VS Code/Cursor extensie probeert automatisch verbinding te maken met Supabase voor:
- Database schema weergave
- SQL query uitvoering  
- Real-time database updates
- Schema synchronisatie

Zonder juiste configuratie of met een verlopen token faalt deze verbinding.

## Oplossingen

### Oplossing 1: Extensie Uitschakelen (Snelste Fix)

1. Open Cursor Settings (Ctrl+,)
2. Zoek naar "Supabase"
3. Zoek de extensie "Supabase" in de extensies lijst
4. Klik op "Disable" of "Uninstall"

**Voordeel**: Geen foutmeldingen meer, extensie wordt niet gebruikt
**Nadeel**: Geen database schema weergave in Cursor

### Oplossing 2: Extensie Configureren (Als je de extensie wilt gebruiken)

#### Stap 1: Verkrijg nieuwe Access Token
1. Ga naar: https://supabase.com/dashboard/project/smpkbweozrkjalpceqwu/settings/access-tokens
2. Genereer een nieuwe access token (of gebruik bestaande)
3. Kopieer de token (begint met `sbp_`)

#### Stap 2: Configureer Cursor Settings
Maak een `.vscode/settings.json` bestand in de project root met:

```json
{
  "supabase.accessToken": "sbp_JOUW_TOKEN_HIER",
  "supabase.projectRef": "smpkbweozrkjalpceqwu"
}
```

**Let op**: Vervang `sbp_JOUW_TOKEN_HIER` met je echte token uit stap 1.

#### Stap 3: Herstart Cursor
Herstart Cursor volledig om de nieuwe instellingen te laden.

### Oplossing 3: Extensie Opnieuw Installeren

Als configuratie niet werkt:

1. Uninstall de Supabase extensie
2. Herstart Cursor
3. Installeer de extensie opnieuw vanuit de marketplace
4. Configureer volgens Oplossing 2

### Oplossing 4: Verbindingsproblemen Oplossen

Als de extensie nog steeds faalt na configuratie:

#### Check Internet Verbinding
```powershell
# Test Supabase bereikbaarheid
curl https://smpkbweozrkjalpceqwu.supabase.co/rest/v1/
```

#### Check VPN/Proxy
- Zorg dat VPN niet Supabase API blokkeert
- Check firewall instellingen
- Test zonder VPN

#### Check Token Geldigheid
- Token kan verlopen zijn (meestal 30-90 dagen)
- Genereer nieuwe token in Supabase Dashboard

## Aanbeveling

**Voor nu**: Gebruik Oplossing 1 (extensie uitschakelen) als je de extensie niet nodig hebt.

**Later**: Als je database schema weergave wilt, gebruik Oplossing 2 met een geldige token.

## Verificatie

Na het toepassen van een oplossing:
- ✅ Geen foutmeldingen meer in Cursor
- ✅ Werkt normaal zonder onderbrekingen
- ✅ Database operaties werken nog steeds (extensie is optioneel)

## Notities

- De Supabase extensie is **optioneel** - je applicatie werkt zonder
- Database queries via code werken onafhankelijk van de extensie
- De extensie is alleen handig voor schema weergave en SQL queries in Cursor

