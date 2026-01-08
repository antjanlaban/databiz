# Golden Master JSON Example (Workwear/PPE)

This document provides the **canonical example** of a Product structure in DataBiz.
It combines **ETIM** (Technical/Safety) and **GS1** (Logistics/Fashion) standards, optimized for the European Workwear market.

**Use this structure as the target for all Data Transformations.**

## Scenario: High-Vis Safety Jacket

- **Brand**: Tricorp
- **Model**: Parka High Vis Bicolor
- **Norms**: EN ISO 20471 (High Visibility), EN 343 (Rain Protection)

```json
{
  "product_master": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "product_number": "403002",
    "name": "Parka High Vis Bicolor",
    "brand": {
      "code": "TRI",
      "name": "Tricorp"
    },
    "category": {
      "code": "W-JAC-HV",
      "name": "High Visibility Jackets",
      "etim_class": "EC002448" // Protective Work Jacket
    },
    "description": {
      "short": "Wind- and waterproof parka with high visibility striping.",
      "long": "Robust parka conforming to EN ISO 20471 Class 3. Features detachable hood and thermal lining.",
      "material_composition": "100% Polyester, PU Coating",
      "grammage": "200 g/m²"
    },
    "safety_norms": [
      {
        "code": "EN ISO 20471",
        "class": "3",
        "description": "High Visibility Clothing"
      },
      {
        "code": "EN 343",
        "class": "3/3",
        "description": "Protection against rain"
      }
    ],
    "status": "active",
    "variants": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440101",
        "ean": "8718123456789",
        "sku": "403002-OR-L",
        "specifications": {
          "color": {
            "code": "OR",
            "name": "Fluo Orange / Navy",
            "hex": "#FF6600"
          },
          "size": {
            "code": "L",
            "system": "INT", // International (S/M/L) vs CON (Confectie 48/50)
            "name": "Large"
          },
          "gender": "unisex"
        },
        "logistics": {
          "intrastat_code": "62019300",
          "country_of_origin": "CN",
          "weight_net_kg": 1.25,
          "packaging_unit": "PCE"
        },
        "commercial": {
          "sales": {
            "active_price": {
              "amount": 89.95,
              "currency": "EUR",
              "valid_from": "2025-01-01",
              "source": "calculated",
              "calculation_logic": "purchase_price * 1.9"
            },
            "rrp": {
              "amount": 95.0,
              "currency": "EUR",
              "source": "supplier_feed"
            },
            "vat_code": "H",
            "vat_percentage": 21.0
          },
          "purchasing": [
            {
              "supplier_code": "TRI",
              "supplier_sku": "403002-OR-L",
              "is_preferred": true,
              "prices": [
                {
                  "amount": 45.5,
                  "currency": "EUR",
                  "valid_from": "2025-01-01",
                  "status": "active"
                },
                {
                  "amount": 48.0,
                  "currency": "EUR",
                  "valid_from": "2026-01-01",
                  "status": "future"
                }
              ]
            }
          ]
        },
        "status": "active"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440102",
        "ean": "8718123456790",
        "sku": "403002-OR-XL",
        "specifications": {
          "color": {
            "code": "OR",
            "name": "Fluo Orange / Navy",
            "hex": "#FF6600"
          },
          "size": {
            "code": "XL",
            "system": "INT",
            "name": "Extra Large"
          },
          "gender": "unisex"
        },
        "logistics": {
          "intrastat_code": "62019300",
          "country_of_origin": "CN",
          "weight_net_kg": 1.3,
          "packaging_unit": "PCE"
        },
        "commercial": {
          "sales": {
            "active_price": {
              "amount": 89.95,
              "currency": "EUR",
              "valid_from": "2025-01-01",
              "source": "calculated",
              "calculation_logic": "purchase_price * 1.9"
            },
            "rrp": {
              "amount": 95.0,
              "currency": "EUR",
              "source": "supplier_feed"
            },
            "vat_code": "H",
            "vat_percentage": 21.0
          },
          "purchasing": [
            {
              "supplier_code": "TRI",
              "supplier_sku": "403002-OR-XL",
              "is_preferred": true,
              "prices": [
                {
                  "amount": 45.5,
                  "currency": "EUR",
                  "valid_from": "2025-01-01",
                  "status": "active"
                }
              ]
            }
          ]
        },
        "status": "active"
      }
    ]
  }
}
```
