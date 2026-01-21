-- Helper functions for seeding merit badge requirements
-- These bypass PostgREST schema cache issues

-- Function to insert a merit badge requirement
CREATE OR REPLACE FUNCTION insert_merit_badge_requirement(
  p_version_id UUID,
  p_merit_badge_id UUID,
  p_requirement_number TEXT,
  p_sub_requirement_letter TEXT,
  p_description TEXT,
  p_display_order INTEGER,
  p_is_alternative BOOLEAN,
  p_alternatives_group TEXT,
  p_nesting_depth INTEGER,
  p_original_scoutbook_id TEXT,
  p_required_count INTEGER
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO bsa_merit_badge_requirements (
    version_id,
    merit_badge_id,
    requirement_number,
    sub_requirement_letter,
    description,
    display_order,
    is_alternative,
    alternatives_group,
    nesting_depth,
    original_scoutbook_id,
    required_count
  ) VALUES (
    p_version_id,
    p_merit_badge_id,
    p_requirement_number,
    p_sub_requirement_letter,
    p_description,
    p_display_order,
    COALESCE(p_is_alternative, false),
    p_alternatives_group,
    COALESCE(p_nesting_depth, 1),
    p_original_scoutbook_id,
    p_required_count
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update parent requirement ID
CREATE OR REPLACE FUNCTION update_requirement_parent(
  p_id UUID,
  p_parent_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE bsa_merit_badge_requirements
  SET parent_requirement_id = p_parent_id
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
