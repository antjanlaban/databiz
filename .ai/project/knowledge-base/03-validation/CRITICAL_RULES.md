# Critical Validation Rules (Iron Dome)

This document defines the **non-negotiable** business rules for data integrity.
AI Agents must enforce these rules in both Frontend validation (UX) and Backend validation (API/Database).

## 1. Identification (EAN Policy)

- **Format**: EAN-13 is the ONLY supported barcode format. Must be 13 digits.
- **Checksum**: The 13th digit must match the standard Modulo-10 checksum calculation.
- **Uniqueness**: An EAN must be globally unique within the `product_variant` table.
  - **Rule**: An EAN cannot be reused, even if the product is archived or inactive.
- **Mandatory**: Every `ProductVariant` MUST have an EAN.

## 2. Product Hierarchy

- **No Orphans**: A `ProductVariant` MUST always be linked to a `ProductMaster`.
  - _Bad Practice_: Creating a variant without a parent.
- **No Sterile Masters**: A `ProductMaster` SHOULD have at least one `ProductVariant`.
  - _Process Rule_: A master created without variants is considered "Incomplete" and should not be published.

## 3. Content & Pricing

- **Naming**:
  - **Import**: Supplier's product name is leading during initial import.
  - **Internal**: We strive for consistent naming conventions (e.g., "[Brand] [Model] [Type]"), but this is a secondary optimization step.
- **Pricing**:
  - **NULL**: Allowed. Means "Price on Request" or "Unknown".
  - **0.00**: **FORBIDDEN**. A product cannot be free. Use `NULL` instead.
- **VAT (BTW)**:
  - **Mandatory**: Every product must have a VAT code.
  - **Fallback**: The system MUST provide a default fallback (e.g., 21% NL) if the input is missing.

## 4. Taxonomy & Categorization

- **Single Standard**: There is ONE central taxonomy tree.
- **Mandatory Link**: Every `ProductMaster` MUST be linked to exactly one category from this standard taxonomy.
- **Tree Structure**: Categories form a parent-child hierarchy.
  - _Goal_: Unlimited depth.
  - _Current Constraint_: Database may limit depth (check implementation), but architecture strives for flexibility.
  - _Assignment_: Products can be linked to ANY node in the tree (not just leaf nodes).
- **No Ad-Hoc Creation**: Imports or users CANNOT create new categories on the fly. Category management is an admin task.
- **Mapping Principle**: Supplier categories (often messy) must be **mapped** to our standard taxonomy. We never adopt the supplier's category tree as our own.

## 5. Import & Data Quality

- **Partial Success**: An import process (Activation) is allowed to proceed even if some rows fail validation.
- **Transparency**: Failed rows must be logged and accessible to the user for manual correction. They must NOT be silently discarded.

## 6. Data Transformation & ETL

- **No Data Loss**: Raw data (`supplier_data_raw`) is IMMUTABLE. Transformations always write to new tables/columns.
- **Traceability**: Every system value must be traceable back to its source (Dataset ID + Row Number).
- **Normalization**:
  - **Colors**: Must be mapped to a standard color code (e.g., "Rood" -> `RED`).
  - **Sizes**: Must be mapped to a standard size chart.
- **Mapping Failures**:
  - **Critical Fields** (Size, Color, EAN): If mapping fails, the row is **REJECTED** (Option A). These define the variant's uniqueness.
  - **Non-Critical Fields** (Description, Material): If mapping fails, use the **RAW VALUE** (Option B) and flag a warning.

## 7. Specific Field Constraints

- **Brand Code**: Must be 2-3 alphanumeric characters (A-Z, 0-9). Unique.
- **Product Name**: Max 255 characters.
- **Status Workflow**: `draft` -> `promoted` -> `archived`.
