# Test Cases Matrix

| Module       | Testcase                           | Input                      | Expected                             | Edge Case           |
| ------------ | ---------------------------------- | -------------------------- | ------------------------------------ | ------------------- |
| Auth         | Admin can invite user              | Email + role               | Invite created, email sent           | Invalid email       |
| Auth         | User cannot invite                 | User role tries to invite  | Error "Admin role required"          | -                   |
| Auth         | Accept invite with valid token     | Valid token + password     | User created, role assigned          | Expired token       |
| Categories   | Product without ALG category       | Style without category     | Error "ALG category required"        | -                   |
| Categories   | Product with ALG category          | Style + ALG category       | Product created, category assigned   | Multiple ALG        |
| Import       | Valid Excel with template          | 1500 rows, template exists | Mappings auto-applied, import OK     | Dubbele SKU/EAN     |
| Import       | Category mapping applied           | Template with cat mapping  | Categories assigned to styles        | Missing category    |
| Import       | Import Manager can import          | import_manager role        | Import succeeds                      | -                   |
| Import       | Import Reviewer cannot import      | import_reviewer role       | Error "Import Manager required"      | -                   |
| Import       | Invalid format                     | .pdf file                  | Error "Ongeldig formaat"             | Type-mix            |
| Import Sim   | Simulation shows changes           | 100 updates, 50 inserts    | Preview diff correct                 | -                   |
| Import Sim   | Simulation detects conflicts       | Duplicate EAN              | Shows conflict in preview            | -                   |
| Import Stage | Data loaded to staging table       | 1500 rows                  | import_staging_data populated        | Corrupt data        |
| Import Stage | Validation status tracked          | Mixed valid/invalid        | validation_status per row correct    | -                   |
| Rollback     | Rollback within 7 days             | Import <7 days old         | Snapshot restored, data reverted     | -                   |
| Rollback     | Rollback after 7 days expired      | Import >7 days old         | Error "Rollback expired"             | -                   |
| Rollback     | Rollback blocked by newer import   | Import B after Import A    | Error "Newer import exists"          | Chain rollback      |
| Template     | Save import template               | Mappings + categories      | Template saved with JSONB            | -                   |
| Template     | Template auto-applied              | Supplier recognized        | Column + category mappings applied   | Template not found  |
| Template     | Template last_used_at updated      | Use existing template      | last_used_at = NOW(), count++        | -                   |
| Template     | Template versioning                | Modified template          | New version created, parent linked   | -                   |
| Quality      | Quality score calculation          | Complete product           | Score 100%, all checks pass          | Partial data        |
| Import Map   | Nieuwe mapping met 13 velden       | Excel met 13 kolommen      | Mapping succesvol, 13 velden gemapped | Oude template laden |
| Import Map   | Oude template met 21 velden laden  | Template uit 2025-10-20    | Deprecated velden gefilterd, 13 getoond | -                 |
| Import Map   | Brand dropdown zonder kolom        | Geen brand kolom in Excel  | Dropdown getoond, brand selecteerbaar | Geen brands beschikbaar |
| Promotie     | Promotie zonder color_code         | Supplier product zonder CC | Wizard genereert code uit color_name  | -                 |
| Filtering    | Filter op productgroep             | 100 producten, 3 groepen   | Filter correct, tabel gefilterd       | Lege productgroep |
| Export CSV   | CSV export gebruikt productgroep   | Simulatie export           | Categorie kolom = product_group       | -                 |
| Quality      | AI suggestions generated           | Missing fields             | Suggestions with severity labels     | -                   |
| Export       | Gripp sync with ALG category       | Delta: 47 changed          | ALG category in productgroep field   | API rate limit      |
| Export       | Export only KERN products          | Mixed KERN/RAND            | Only KERN exported                   | All RAND            |
| SKU          | Edit price, negative margin        | price < cost               | Warning "Negatieve marge"            | Null values         |
| Search       | Full-text on code/name             | "POLO NAVY"                | Resulten inclusief matches           | Non-ascii chars     |
| Stock        | Bulk update, +500                  | voorraad > 1000            | Stock to correct value               | Overflow            |
| Decoratie    | Logo upload, te groot              | 10MB PNG                   | Error "Max 5MB"                      | Low DPI             |
| Roles        | Admin can write                    | Admin creates product      | Product created                      | -                   |
| Roles        | User can only read                 | User tries to delete       | Error "permission denied"            | -                   |
