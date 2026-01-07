-- Seed Data for Development
-- This file creates sample data for testing

-- Note: In a real environment, users are created through Supabase Auth
-- This seed data assumes you'll create a test user through the Supabase Dashboard
-- or via the auth.users table directly in development

-- Sample Unit (Troop 123)
INSERT INTO units (id, name, unit_number, unit_type, council, district, chartered_org)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Troop 123',
    '123',
    'troop',
    'Example Council',
    'Northern District',
    'Community Church'
);

-- Note: Profiles are auto-created when users sign up via the trigger
-- After a user signs up, you can manually add them to the unit:
--
-- INSERT INTO unit_memberships (unit_id, profile_id, role)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '<user-uuid>', 'admin');

-- Sample Scouts (will be created after unit membership is established)
-- These can be added via the application UI or directly:
--
-- INSERT INTO scouts (unit_id, first_name, last_name, patrol, rank)
-- VALUES
--     ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'John', 'Smith', 'Eagle Patrol', 'Star'),
--     ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Jane', 'Doe', 'Eagle Patrol', 'First Class'),
--     ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bob', 'Johnson', 'Wolf Patrol', 'Tenderfoot');

-- The default chart of accounts is auto-created by the trigger when a unit is inserted
