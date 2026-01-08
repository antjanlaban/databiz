-- ============================================
-- CATEGORY TEST DATA SETUP
-- Run this script to create test data for category management testing
-- ============================================

-- Ensure we have ALG and GS1 taxonomies
INSERT INTO category_taxonomies (taxonomy_code, taxonomy_name, description, is_active)
VALUES 
  ('ALG', 'Algemeen VKR', 'Interne categoriestructuur Van Kruiningen', TRUE),
  ('GS1', 'GS1 Global Product Classification', 'Internationale productclassificatie standaard', TRUE)
ON CONFLICT (taxonomy_code) DO NOTHING;

-- Get taxonomy IDs
DO $$
DECLARE
  alg_id INTEGER;
  gs1_id INTEGER;
BEGIN
  SELECT id INTO alg_id FROM category_taxonomies WHERE taxonomy_code = 'ALG';
  SELECT id INTO gs1_id FROM category_taxonomies WHERE taxonomy_code = 'GS1';

  -- ALG Test Categories (5 levels deep)
  -- Level 1
  INSERT INTO categories (taxonomy_id, category_code, category_name_nl, category_name_en, level, sort_order, full_path, is_active)
  VALUES 
    (alg_id, 'KLEDING', 'Kleding', 'Clothing', 1, 10, 'Kleding', TRUE),
    (alg_id, 'ACCESSOIRES', 'Accessoires', 'Accessories', 1, 20, 'Accessoires', TRUE)
  ON CONFLICT DO NOTHING;

  -- Level 2
  INSERT INTO categories (taxonomy_id, category_code, category_name_nl, category_name_en, level, sort_order, full_path, parent_category_id, is_active)
  VALUES 
    (alg_id, 'WERK', 'Werkkleding', 'Workwear', 2, 10, 'Kleding > Werkkleding', 
     (SELECT id FROM categories WHERE category_code = 'KLEDING'), TRUE),
    (alg_id, 'CASUAL', 'Casual Kleding', 'Casual Wear', 2, 20, 'Kleding > Casual Kleding',
     (SELECT id FROM categories WHERE category_code = 'KLEDING'), TRUE)
  ON CONFLICT DO NOTHING;

  -- Level 3
  INSERT INTO categories (taxonomy_id, category_code, category_name_nl, category_name_en, level, sort_order, full_path, parent_category_id, is_active)
  VALUES 
    (alg_id, 'WERK-JAS', 'Jassen', 'Jackets', 3, 10, 'Kleding > Werkkleding > Jassen',
     (SELECT id FROM categories WHERE category_code = 'WERK'), TRUE),
    (alg_id, 'WERK-POLO', 'Polo''s', 'Polos', 3, 20, 'Kleding > Werkkleding > Polo''s',
     (SELECT id FROM categories WHERE category_code = 'WERK'), TRUE),
    (alg_id, 'WERK-BROEK', 'Broeken', 'Pants', 3, 30, 'Kleding > Werkkleding > Broeken',
     (SELECT id FROM categories WHERE category_code = 'WERK'), TRUE)
  ON CONFLICT DO NOTHING;

  -- Level 4
  INSERT INTO categories (taxonomy_id, category_code, category_name_nl, category_name_en, level, sort_order, full_path, parent_category_id, is_active)
  VALUES 
    (alg_id, 'JAS-SOFTSHELL', 'Softshell Jassen', 'Softshell Jackets', 4, 10, 'Kleding > Werkkleding > Jassen > Softshell Jassen',
     (SELECT id FROM categories WHERE category_code = 'WERK-JAS'), TRUE),
    (alg_id, 'JAS-WINTER', 'Winter Jassen', 'Winter Jackets', 4, 20, 'Kleding > Werkkleding > Jassen > Winter Jassen',
     (SELECT id FROM categories WHERE category_code = 'WERK-JAS'), TRUE)
  ON CONFLICT DO NOTHING;

  -- Level 5 (maximum depth)
  INSERT INTO categories (taxonomy_id, category_code, category_name_nl, category_name_en, level, sort_order, full_path, parent_category_id, is_active)
  VALUES 
    (alg_id, 'SOFTSHELL-HEREN', 'Softshell Heren', 'Softshell Men', 5, 10, 'Kleding > Werkkleding > Jassen > Softshell Jassen > Softshell Heren',
     (SELECT id FROM categories WHERE category_code = 'JAS-SOFTSHELL'), TRUE),
    (alg_id, 'SOFTSHELL-DAMES', 'Softshell Dames', 'Softshell Women', 5, 20, 'Kleding > Werkkleding > Jassen > Softshell Jassen > Softshell Dames',
     (SELECT id FROM categories WHERE category_code = 'JAS-SOFTSHELL'), TRUE)
  ON CONFLICT DO NOTHING;

  -- GS1 Test Categories
  INSERT INTO categories (taxonomy_id, category_code, category_name_nl, category_name_en, level, sort_order, full_path, is_active)
  VALUES 
    (gs1_id, 'GS1-WORKWEAR', 'Workwear', 'Workwear', 1, 10, 'Workwear', TRUE),
    (gs1_id, 'GS1-JACKETS', 'Jackets', 'Jackets', 2, 10, 'Workwear > Jackets',
     (SELECT id FROM categories WHERE taxonomy_id = gs1_id AND category_code = 'GS1-WORKWEAR'), TRUE)
  ON CONFLICT DO NOTHING;

END $$;

-- Verify
SELECT 
  c.id,
  ct.taxonomy_code,
  c.level,
  c.category_code,
  c.full_path
FROM categories c
JOIN category_taxonomies ct ON c.taxonomy_id = ct.id
ORDER BY ct.taxonomy_code, c.level, c.sort_order;
