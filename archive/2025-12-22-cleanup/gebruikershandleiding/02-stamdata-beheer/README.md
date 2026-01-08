# 02. Stamdata beheer

Stamdata vormt de basis van het PIM systeem. Correct geconfigureerde stamdata is **essentieel** voor succesvolle imports en exports.

## Wat is stamdata?

Stamdata zijn de **referentie tabellen** die gebruikt worden voor:
- Normalisatie van leveranciersdata
- Validatie tijdens import
- Mapping van waarden
- Export naar externe systemen

## Overzicht

### 🏢 [Leveranciers](./leveranciers.md)
Beheer van suppliers en hun contactgegevens.

### 🏷️ [Merken](./merken.md)
Brands gekoppeld aan leveranciers.

### 📂 [Categorieën](./categorieën.md)
Productcategorieën en hiërarchie.

### 🎨 [Kleuren](./kleuren.md)
Color families en color options voor normalisatie.

### 📏 [Maten](./maten.md)
International sizes en conversietabellen.

### ✨ [Decoratie](./decoratie.md)
Decoratie methodes en posities.

---

## Belangrijk

⚠️ **Volgorde is belangrijk:**
1. Eerst leveranciers
2. Dan merken (gekoppeld aan leveranciers)
3. Dan categorieën
4. Dan kleuren en maten

❌ **Stamdata verwijderen:**
- Alleen mogelijk als **niet** in gebruik door producten
- Check dependencies voor verwijderen

---

## Admin only

🔒 Stamdata beheer is alleen toegankelijk voor **Admin** rol.
