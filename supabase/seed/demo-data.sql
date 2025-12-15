-- Demo Data Seed for Halcyon Cinema
-- This creates a sample project with characters, locations, and chapters
-- for demonstration purposes

-- NOTE: This seed file is designed to work with a demo user
-- In production, the demo user ID would be set via environment variable

DO $$
DECLARE
    v_demo_user_id UUID;
    v_project_id UUID;
    v_chapter1_id UUID;
    v_chapter2_id UUID;
    v_scene1_id UUID;
    v_scene2_id UUID;
    v_char_elena_entry_id UUID;
    v_char_marcus_entry_id UUID;
    v_loc_academy_entry_id UUID;
    v_loc_library_entry_id UUID;
    v_rule_magic_entry_id UUID;
    v_event_awakening_entry_id UUID;
    v_theme_power_entry_id UUID;
BEGIN
    -- Check for existing demo user or create one
    -- In production, use a real demo account
    SELECT id INTO v_demo_user_id FROM public.users WHERE email = 'demo@halcyon.cinema' LIMIT 1;

    IF v_demo_user_id IS NULL THEN
        -- Create demo user profile (auth user must exist)
        -- This would be created via Supabase Auth first
        RAISE NOTICE 'Demo user not found. Please create demo@halcyon.cinema in Supabase Auth first.';
        RETURN;
    END IF;

    -- Update demo user to have Studio tier for full demo capabilities
    UPDATE public.users SET
        subscription_tier = 'studio',
        subscription_status = 'active',
        onboarding_completed = TRUE,
        display_name = 'Demo User'
    WHERE id = v_demo_user_id;

    -- Create demo project
    INSERT INTO public.projects (
        id, user_id, title, subtitle, description, genre, logline,
        mode, word_count, target_word_count, status, is_demo,
        production_format, color_scheme
    ) VALUES (
        uuid_generate_v4(),
        v_demo_user_id,
        'The Awakening',
        'A Tale of Hidden Powers',
        'Elena discovers she possesses ancient magical abilities when she enrolls at the prestigious Thornwood Academy. As she learns to control her powers, she uncovers a conspiracy that threatens the balance between the magical and mundane worlds.',
        'Fantasy',
        'A young woman discovers she''s the last of a powerful magical bloodline and must master her abilities before dark forces claim her power.',
        'storyforge',
        8500,
        80000,
        'draft',
        TRUE,
        'film',
        '{"primary": "#8b5cf6", "secondary": "#d946ef"}'
    ) RETURNING id INTO v_project_id;

    -- Create Canon Entry: Elena (Character)
    INSERT INTO public.canon_entries (
        id, project_id, entity_type, name, slug, description, lock_status
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'character',
        'Elena Blackwood',
        'elena-blackwood',
        'The protagonist. A 22-year-old graduate student who discovers her magical heritage. She is intelligent, determined, but struggles with self-doubt.',
        'soft_locked'
    ) RETURNING id INTO v_char_elena_entry_id;

    INSERT INTO public.canon_characters (
        id, canon_entry_id, project_id, name, full_name, age, gender,
        appearance, personality, motivations, fears, backstory, role,
        strengths, weaknesses, character_arc
    ) VALUES (
        uuid_generate_v4(),
        v_char_elena_entry_id,
        v_project_id,
        'Elena',
        'Elena Victoria Blackwood',
        '22',
        'Female',
        'Dark wavy hair, emerald green eyes that glow when using magic, average height, often wears practical clothing in dark colors',
        'Intelligent and analytical, initially skeptical of magic despite evidence. Fiercely loyal to those she cares about. Tends to overthink and doubt herself.',
        'To understand her powers and protect those she loves. To uncover the truth about her family''s past.',
        'Losing control of her powers and hurting someone. Being rejected for who she truly is.',
        'Raised by her aunt after her parents died in a mysterious accident when she was 5. Always felt different but suppressed it. Excelled academically as a coping mechanism.',
        'protagonist',
        ARRAY['Analytical mind', 'Strong will', 'Natural magical affinity', 'Quick learner'],
        ARRAY['Self-doubt', 'Tendency to isolate', 'Suppressed emotions', 'Inexperience with magic'],
        'From skeptic who denies her nature to confident wielder who embraces her heritage while remaining true to herself'
    );

    -- Create Canon Entry: Marcus (Character)
    INSERT INTO public.canon_entries (
        id, project_id, entity_type, name, slug, description, lock_status
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'character',
        'Marcus Chen',
        'marcus-chen',
        'Elena''s mentor and love interest. A professor at Thornwood Academy who specializes in rare magical abilities. He has secrets of his own.',
        'unlocked'
    ) RETURNING id INTO v_char_marcus_entry_id;

    INSERT INTO public.canon_characters (
        id, canon_entry_id, project_id, name, full_name, age, gender,
        appearance, personality, motivations, backstory, role
    ) VALUES (
        uuid_generate_v4(),
        v_char_marcus_entry_id,
        v_project_id,
        'Marcus',
        'Marcus Wei Chen',
        '35',
        'Male',
        'Tall, athletic build, black hair with silver streaks at the temples despite his age, warm brown eyes, usually dressed in professional but comfortable attire',
        'Patient and encouraging as a teacher, but guarded about his personal life. Has a dry sense of humor. Deeply ethical but willing to bend rules for what he believes is right.',
        'To guide Elena and prevent the mistakes of the past. To atone for something in his history.',
        'Born into a prestigious magical family in Hong Kong. Came to Thornwood 10 years ago under mysterious circumstances. Known as one of the most gifted magical theorists of his generation.',
        'mentor'
    );

    -- Create Canon Entry: Thornwood Academy (Location)
    INSERT INTO public.canon_entries (
        id, project_id, entity_type, name, slug, description, lock_status
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'location',
        'Thornwood Academy',
        'thornwood-academy',
        'A prestigious institution for magical education, hidden in plain sight as a normal university in New England.',
        'soft_locked'
    ) RETURNING id INTO v_loc_academy_entry_id;

    INSERT INTO public.canon_locations (
        id, canon_entry_id, project_id, name, type, category,
        description, atmosphere, sensory_details, history
    ) VALUES (
        uuid_generate_v4(),
        v_loc_academy_entry_id,
        v_project_id,
        'Thornwood Academy',
        'both',
        'building',
        'A sprawling Gothic campus that appears as a prestigious private university to non-magical observers. The true magical facilities exist in spaces folded between reality.',
        'Ancient yet alive with energy. A sense of history and secrets in every corridor. Both welcoming and intimidating.',
        '{"sight": "Gothic spires, impossible architecture that shifts when not directly observed, floating lights in the gardens", "sound": "Whispered conversations in unknown languages, the hum of magical energy, bells that ring at times that don''t exist", "smell": "Old books, ozone from magical discharge, flowers that bloom in all seasons"}',
        'Founded in 1693 by a council of powerful practitioners fleeing persecution. Has educated thousands of magical beings. Site of the last great magical battle in 1842.'
    );

    -- Create Canon Entry: The Restricted Archives (Location)
    INSERT INTO public.canon_entries (
        id, project_id, entity_type, name, slug, description, lock_status
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'location',
        'The Restricted Archives',
        'restricted-archives',
        'A hidden library within Thornwood containing the most dangerous and powerful magical knowledge.',
        'unlocked'
    ) RETURNING id INTO v_loc_library_entry_id;

    INSERT INTO public.canon_locations (
        id, canon_entry_id, project_id, name, type, category,
        description, atmosphere, parent_location_id
    ) VALUES (
        uuid_generate_v4(),
        v_loc_library_entry_id,
        v_project_id,
        'The Restricted Archives',
        'interior',
        'room',
        'Located in a pocket dimension accessible only through a hidden door in the main library. Contains texts too dangerous for general access, including records of the Blackwood family.',
        'Oppressive silence. The air feels thick with accumulated knowledge and power. Books seem to watch visitors.',
        (SELECT id FROM public.canon_locations WHERE name = 'Thornwood Academy' LIMIT 1)
    );

    -- Create Canon Entry: Magic Rule
    INSERT INTO public.canon_entries (
        id, project_id, entity_type, name, slug, description, lock_status
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'rule',
        'The Law of Equivalent Exchange',
        'law-of-equivalent-exchange',
        'All magic requires an exchange of energy. Nothing is created from nothing.',
        'hard_locked'
    ) RETURNING id INTO v_rule_magic_entry_id;

    INSERT INTO public.canon_rules (
        id, canon_entry_id, project_id, name, category,
        description, constraints, enables, priority
    ) VALUES (
        uuid_generate_v4(),
        v_rule_magic_entry_id,
        v_project_id,
        'The Law of Equivalent Exchange',
        'magic',
        'Magic cannot create something from nothing. Every spell requires energy drawn from the caster, the environment, or stored sources. The greater the effect, the greater the cost.',
        ARRAY['Cannot create matter from nothing', 'Cannot restore life once truly lost', 'Cannot exceed available energy sources'],
        ARRAY['Explains magical fatigue', 'Creates tension in powerful spells', 'Allows for creative energy gathering'],
        10
    );

    -- Create Canon Entry: Event
    INSERT INTO public.canon_entries (
        id, project_id, entity_type, name, slug, description, lock_status
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'event',
        'The Blackwood Incident',
        'blackwood-incident',
        'The mysterious event that killed Elena''s parents 17 years ago.',
        'soft_locked'
    ) RETURNING id INTO v_event_awakening_entry_id;

    INSERT INTO public.canon_events (
        id, canon_entry_id, project_id, name,
        description, story_date, relative_order, consequences, event_type, significance
    ) VALUES (
        uuid_generate_v4(),
        v_event_awakening_entry_id,
        v_project_id,
        'The Blackwood Incident',
        'Victoria and James Blackwood were killed in what was officially recorded as a house fire. In reality, they were attacked by unknown assailants seeking something they possessed. 5-year-old Elena survived, her powers instinctively protecting her.',
        '17 years before story start',
        1,
        ARRAY['Elena orphaned and raised by aunt', 'Elena''s powers suppressed', 'Unknown artifact hidden', 'Conspiracy set in motion'],
        'backstory',
        'pivotal'
    );

    -- Create Canon Entry: Theme
    INSERT INTO public.canon_entries (
        id, project_id, entity_type, name, slug, description, lock_status
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'theme',
        'The Cost of Power',
        'cost-of-power',
        'Central theme exploring what we sacrifice for ability and knowledge.',
        'unlocked'
    ) RETURNING id INTO v_theme_power_entry_id;

    INSERT INTO public.canon_themes (
        id, canon_entry_id, project_id, name,
        description, how_expressed, symbols, motifs
    ) VALUES (
        uuid_generate_v4(),
        v_theme_power_entry_id,
        v_project_id,
        'The Cost of Power',
        'Every form of power comes with a price. Magic exacts physical and emotional tolls. Knowledge brings burden. Leadership requires sacrifice.',
        'Through the magic system''s exchange requirement, Elena''s journey of sacrifice, the backstories of mentors who paid their own prices',
        ARRAY['Scars', 'Silver hair', 'Empty spaces', 'Echoes'],
        ARRAY['Mirrors showing true cost', 'Recurring imagery of scales', 'Light and shadow balance']
    );

    -- Create Chapter 1
    INSERT INTO public.chapters (
        id, project_id, title, summary, content, order_index, status, word_count
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'The Letter',
        'Elena receives a mysterious letter that changes everything she thought she knew about herself.',
        E'# Chapter One: The Letter\n\nThe envelope was cream-colored, heavy in a way that suggested importance, and addressed in ink so dark it seemed to absorb the fluorescent light of Elena''s cramped graduate student office. She turned it over in her hands, noting the absence of a return address, the old-fashioned wax seal pressed into the flap.\n\n"Blackwood," she muttered, tracing the unfamiliar crest embossed in the burgundy wax. A thorn-wrapped tower. Something about it made her fingertips tingle.\n\nShe''d found it wedged under her door that morning, alongside the usual departmental memos and a passive-aggressive note from Dr. Harrison about her "unconventional" thesis on medieval alchemical texts. But while those had gone straight into the recycling bin, this letter had sat on her desk all day, waiting.\n\nElena glanced at the clock: 11:47 PM. The history building was silent around her, emptied hours ago of everyone sensible enough to have a life outside academia. She should go home. She should sleep. She had a meeting with her advisor tomorrow, and she needed to be sharp.\n\nInstead, she broke the seal.\n\nThe paper inside was the same cream color, the same inexplicable weight. The handwriting was elegant, old-fashioned, and completely unfamiliar:\n\n*Dear Miss Blackwood,*\n\n*You have questions. About the dreams that started on your twenty-second birthday. About the way electronics malfunction in your presence when you''re upset. About why you''ve always felt like you''re waiting for something to begin.*\n\n*We have answers.*\n\n*If you wish to learn the truth about your heritage—about what you are—come to the address below at midnight on the winter solstice. Come alone.*\n\n*The door will only open for you.*\n\nElena''s hands were shaking. She set the letter down carefully, precisely, as if it might explode.\n\nThe dreams. How could anyone know about the dreams? She''d never told anyone about waking up with words in languages she didn''t know burning behind her eyes, about the recurring vision of a tower engulfed in silver flame.\n\nAnd the electronics thing—she''d spent years convincing herself that was coincidence. Bad luck. Certainly not something that happened because she was *different* in some fundamental, terrifying way.\n\nShe picked up the letter again, searching for some sign of a prank, a scam, anything rational. The address at the bottom was local, somewhere in the old part of town she''d never explored. The winter solstice was in three days.\n\nHer phone buzzed, making her jump. A text from her aunt: *Working late again? Remember to eat something.*\n\nElena stared at the message, thumb hovering over the screen. Aunt Sarah had raised her after her parents died in the fire when she was five. Had loved her, supported her, never once made her feel like the burden she surely was. But there had always been secrets between them—questions Elena learned not to ask, topics that made her aunt''s face go pale and closed.\n\n*What you are.*\n\nThe letter seemed to pulse in her other hand, warm against her palm.\n\nMaybe it was time to finally ask.',
        0,
        'draft',
        600
    ) RETURNING id INTO v_chapter1_id;

    -- Create Scene for Chapter 1
    INSERT INTO public.scenes (
        id, chapter_id, project_id, title, content, order_index,
        location, time_of_day, semantic_data, status
    ) VALUES (
        uuid_generate_v4(),
        v_chapter1_id,
        v_project_id,
        'The Discovery',
        'Elena finds and opens the mysterious letter in her office late at night.',
        0,
        'Graduate office',
        'night',
        '{"purpose": "Inciting incident - introduces mystery and protagonist", "emotionalBeat": "curiosity mixed with fear", "conflict": "Internal - Elena''s desire to know vs fear of truth", "mood": "mysterious", "pacing": "slow"}',
        'draft'
    ) RETURNING id INTO v_scene1_id;

    -- Create Chapter 2
    INSERT INTO public.chapters (
        id, project_id, title, summary, content, order_index, status, word_count
    ) VALUES (
        uuid_generate_v4(),
        v_project_id,
        'Thornwood',
        'Elena follows the letter''s instructions and discovers Thornwood Academy—a hidden world of magic.',
        E'# Chapter Two: Thornwood\n\nThe address led to a wrought-iron gate set into a stone wall that Elena was certain hadn''t existed three days ago. She''d walked this street a hundred times on her way to the coffee shop two blocks down, and there had never been anything here but a vacant lot filled with overgrown weeds.\n\nNow, at exactly midnight on the solstice, she stood before an entrance to somewhere impossible.\n\nThe gate was covered in thorny vines, but they parted at her approach, curling away as if alive. Beyond, a path of pale stones led into darkness.\n\n"This is insane," Elena whispered. "This is completely insane."\n\nShe stepped through anyway.\n\nThe world shifted. That was the only way to describe it—a lurching sensation like missing a step on stairs, followed by a pressure in her ears like descending in an airplane. When her vision cleared, she was no longer standing in an empty lot in the middle of a New England town.\n\nShe was in a garden. Impossible flowers bloomed in colors she had no names for, their petals luminescent in the light of three moons hanging in a violet sky. Ahead, rising from manicured grounds, was a building that made Gothic cathedrals look modest—all spires and arched windows and architecture that seemed to shift when she wasn''t looking directly at it.\n\nA man stood on the path before her. He was tall, with dark hair touched by silver at the temples, dressed in what looked like professor''s attire from a more elegant era. His eyes, when they met hers, were warm and knowing.\n\n"Miss Blackwood." His voice was cultured, faintly accented. "Welcome to Thornwood Academy. My name is Marcus Chen. I''ve been waiting a very long time to meet you."\n\nElena opened her mouth to demand explanations—who he was, what this place was, why he''d been waiting—but what came out instead was: "The flowers. They''re singing."\n\nBecause they were. A soft humming, just at the edge of hearing, that harmonized with something deep in her chest.\n\nMarcus smiled, and there was something sad in it. "They always sing for the Blackwoods. Your grandmother planted them." He gestured toward the impossible building. "Come. There''s much to discuss, and I suspect you have questions."\n\n"Questions," Elena repeated, slightly hysterical. "I have *questions*? I just walked through a gate that didn''t exist yesterday into a place with three moons and singing flowers, and you think I have *questions*?"\n\n"Many questions, then." His smile grew warmer. "That''s good. Questions are how we learn." He started up the path, then paused, looking back at her. "Your mother asked many questions too, when she first came here. It''s a family trait."\n\nElena''s breath caught. "You knew my mother?"\n\n"I did." His expression flickered—grief, guilt, something complicated. "Come, Miss Blackwood. Let me tell you about the world you were born into. The world that''s been waiting for you to return."',
        1,
        'draft',
        550
    ) RETURNING id INTO v_chapter2_id;

    -- Create Scene for Chapter 2
    INSERT INTO public.scenes (
        id, chapter_id, project_id, title, content, order_index,
        location, time_of_day, semantic_data, status
    ) VALUES (
        uuid_generate_v4(),
        v_chapter2_id,
        v_project_id,
        'Through the Gate',
        'Elena steps through the magical gate and enters Thornwood Academy for the first time.',
        0,
        'Thornwood Academy entrance',
        'night',
        '{"purpose": "World revelation - introduces magical world", "emotionalBeat": "wonder and overwhelm", "conflict": "Elena''s rational worldview vs magical reality", "mood": "wondrous", "pacing": "normal"}',
        'draft'
    ) RETURNING id INTO v_scene2_id;

    -- Update project counts
    UPDATE public.projects SET
        chapter_count = 2,
        scene_count = 2
    WHERE id = v_project_id;

    RAISE NOTICE 'Demo data seeded successfully for project: %', v_project_id;
END $$;
