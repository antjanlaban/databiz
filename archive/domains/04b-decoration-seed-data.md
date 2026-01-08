# 04b. Decoration Seed Data

## 1. Context
Dit document beschrijft de initiële set van Decoratie Methoden en Posities die in het systeem moeten worden geladen. Deze data is essentieel om de `clothing_type_decoration_options` matrix te kunnen vullen.

## 2. Decoration Methods (Technieken)

| Naam | Code | Beschrijving |
|------|------|--------------|
| **Borduren** | `EMBROIDERY` | Duurzame techniek met garen, geschikt voor polo's, petten en jassen. |
| **Zeefdruk** | `SCREEN_PRINT` | Klassieke druktechniek voor grotere oplages, duurzaam en kleurecht. |
| **DTG Print** | `DTG` | Direct-to-Garment, digitale print direct op textiel. Geschikt voor full-color en kleine oplages. |
| **Transfer** | `TRANSFER` | Bedrukking via een transfervel, geschikt voor complexe logo's en kleine aantallen. |
| **Sublimatie** | `SUBLIMATION` | Inkt wordt in de vezel gedampt. Alleen voor polyester (sportkleding). |

### SQL Insert Script
```sql
INSERT INTO public.decoration_methods (method_name, method_code, description) VALUES
  ('Borduren', 'EMBROIDERY', 'Duurzame techniek met garen'),
  ('Zeefdruk', 'SCREEN_PRINT', 'Klassieke druktechniek voor grote oplages'),
  ('DTG Print', 'DTG', 'Direct-to-Garment digitale print'),
  ('Transfer', 'TRANSFER', 'Bedrukking via transfervel'),
  ('Sublimatie', 'SUBLIMATION', 'Inkt in vezel gedampt (polyester)')
ON CONFLICT (method_code) DO NOTHING;
```

## 3. Decoration Positions (Locaties)

| Naam | Code | Max Afmeting (indicatie) |
|------|------|--------------------------|
| **Borst links** | `CHEST_LEFT` | 10x10 cm |
| **Borst rechts** | `CHEST_RIGHT` | 10x10 cm |
| **Rug** | `BACK` | 30x40 cm |
| **Mouw links** | `SLEEVE_LEFT` | 8x8 cm |
| **Mouw rechts** | `SLEEVE_RIGHT` | 8x8 cm |
| **Borst midden** | `CHEST_CENTER` | 30x30 cm |

### SQL Insert Script
```sql
INSERT INTO public.decoration_positions (position_name, position_code) VALUES
  ('Borst links', 'CHEST_LEFT'),
  ('Borst rechts', 'CHEST_RIGHT'),
  ('Rug', 'BACK'),
  ('Mouw links', 'SLEEVE_LEFT'),
  ('Mouw rechts', 'SLEEVE_RIGHT'),
  ('Borst midden', 'CHEST_CENTER')
ON CONFLICT (position_code) DO NOTHING;
```

## 4. Volgende Stappen
1. Voer bovenstaande SQL scripts uit in de database (via migration of SQL editor).
2. Controleer of de `ClothingTypeDecorationsTab` in de frontend deze opties toont.
3. Start met het vullen van de matrix voor de belangrijkste kledingtypes (T-Shirts, Polo's).
