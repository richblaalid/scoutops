-- ============================================
-- FIX AUDIT TRIGGER FUNCTION
-- Run this in Supabase SQL Editor to fix the JSONB operator error
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_id UUID;
    v_old_values JSONB;
    v_new_values JSONB;
    v_record_jsonb JSONB;
BEGIN
    -- Convert record to JSONB for inspection
    IF TG_OP = 'DELETE' THEN
        v_record_jsonb := to_jsonb(OLD);
        v_old_values := v_record_jsonb;
        v_new_values := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_jsonb := to_jsonb(NEW);
        v_old_values := NULL;
        v_new_values := v_record_jsonb;
    ELSE -- UPDATE
        v_record_jsonb := to_jsonb(NEW);
        v_old_values := to_jsonb(OLD);
        v_new_values := v_record_jsonb;
    END IF;

    -- Try to get unit_id from the JSONB record
    v_unit_id := CASE
        WHEN TG_TABLE_NAME = 'units' THEN (v_record_jsonb->>'id')::UUID
        WHEN v_record_jsonb ? 'unit_id' THEN (v_record_jsonb->>'unit_id')::UUID
        ELSE NULL
    END;

    INSERT INTO audit_log (
        unit_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        performed_by
    ) VALUES (
        v_unit_id,
        TG_TABLE_NAME,
        (v_record_jsonb->>'id')::UUID,
        TG_OP,
        v_old_values,
        v_new_values,
        auth.uid()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
