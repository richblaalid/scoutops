-- Fix handle_new_user trigger to link to existing profiles instead of creating duplicates
-- When a user signs up with an email that matches an existing roster profile,
-- we should link to that profile instead of creating a new one

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_profile_id UUID;
BEGIN
    -- Check if a profile with this email already exists (e.g., roster import)
    SELECT id INTO existing_profile_id
    FROM public.profiles
    WHERE email = NEW.email AND user_id IS NULL
    LIMIT 1;

    IF existing_profile_id IS NOT NULL THEN
        -- Link the existing profile to the new auth user
        UPDATE public.profiles
        SET user_id = NEW.id,
            full_name = COALESCE(full_name, NEW.raw_user_meta_data->>'full_name', NEW.email)
        WHERE id = existing_profile_id;
    ELSE
        -- Create a new profile for this user
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
