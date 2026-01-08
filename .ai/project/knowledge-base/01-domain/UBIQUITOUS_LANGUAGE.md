# Ubiquitous Language (Domain Dictionary)

This document defines the standard terminology for the DataBiz PIM project.
**Rule**: Always use the **English Term** in code (variables, classes, database). Use the **Dutch Term** when communicating with the Product Owner.

## 1. Core Data Flow

| English Term (Code) | Dutch Term (Business) | Definition                                                                         |
| :------------------ | :-------------------- | :--------------------------------------------------------------------------------- |
| **SupplierDataset** | _Leveranciersdataset_ | The raw file (CSV/XLSX) uploaded by a user. Contains unstructured data.            |
| **Data Study**      | _Data Studie_         | The automated analysis of a dataset to recognize columns and patterns.             |
| **Activation**      | _Activatie_           | The process of mapping raw columns to system fields and extracting valid products. |
| **SupplierProduct** | _Leveranciersproduct_ | A product extracted from a dataset. It is specific to one supplier.                |
| **Assortment**      | _Assortiment_         | The "Golden Record". The standardized, supplier-independent catalog of products.   |

## 2. Product Hierarchy (The "Master-Variant" Model)

| English Term (Code) | Dutch Term (Business)            | Definition                                                                                                                                                                                            |
| :------------------ | :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ProductMaster**   | _Master Product / Model / Stijl_ | The abstract parent product (e.g., "T-Shirt Basic"). Has **NO** EAN or SKU. Holds shared attributes (Brand, Category, Description). Often referred to as "Style" or "Model" in the Workwear industry. |
| **ProductVariant**  | _Variant / Artikel_              | The concrete sellable item (e.g., "T-Shirt Basic - Red - L"). Has a unique **EAN** and **SKU**. Inherits attributes from the ProductMaster.                                                           |
| **Inheritance**     | _Overerving_                     | The mechanism where a Variant automatically adopts data (e.g., Description, Image) from its ProductMaster unless explicitly overridden.                                                               |
| **Brand**           | _Merk_                           | The manufacturer of the product (e.g., "Nike", "Snickers"). Always linked to the ProductMaster.                                                                                                       |

## 3. Variant Specifics

| English Term (Code) | Dutch Term (Business) | Definition                                                               |
| :------------------ | :-------------------- | :----------------------------------------------------------------------- |
| **EAN**             | _EAN / Barcode_       | The unique 13-digit identifier. **Mandatory** for every ProductVariant.  |
| **SKU**             | _Artikelnummer_       | The stock keeping unit. Unique within a supplier or brand.               |
| **Commercial Data** | _Commerciële Data_    | Pricing (Purchase/Sales), VAT rates, and margins. Linked to the Variant. |
| **Logistics Data**  | _Logistieke Data_     | Weight, dimensions, customs codes. Linked to the Variant.                |

## 4. System Concepts

| English Term (Code)  | Dutch Term (Business) | Definition                                                                |
| :------------------- | :-------------------- | :------------------------------------------------------------------------ |
| **Field Mapping**    | _Veldtoewijzing_      | Linking a CSV column (e.g., "Col_001") to a system field (e.g., "color"). |
| **Confidence Score** | _Betrouwbaarheid_     | A percentage (0-100%) indicating how sure the AI is about a mapping.      |
| **Iron Dome**        | _Iron Dome_           | The safety layer that prevents bad code or data from breaking the system. |
