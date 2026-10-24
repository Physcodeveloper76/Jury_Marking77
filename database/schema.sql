-- WEB FORGE AI Jury Scoring Portal - Authoritative Database Schema
-- Matches System Blueprint (Page 5)

-- 1. Judges / Profiles
CREATE TABLE IF NOT EXISTS judges (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'judge')) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Participating Teams
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    team_code TEXT UNIQUE NOT NULL,
    team_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Competition Rounds
CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Evaluation Criteria
CREATE TABLE IF NOT EXISTS criteria (
    id TEXT PRIMARY KEY,
    round_id TEXT REFERENCES rounds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    max_marks INTEGER NOT NULL CHECK (max_marks > 0),
    weight NUMERIC DEFAULT 1.0,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (round_id, display_order)
);

-- 5. Judge Scores
CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    judge_id TEXT REFERENCES judges(id) ON DELETE CASCADE,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    round_id TEXT REFERENCES rounds(id) ON DELETE CASCADE,
    criterion_id TEXT REFERENCES criteria(id) ON DELETE CASCADE,
    marks NUMERIC,
    remarks TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (judge_id, participant_id, round_id, criterion_id)
);

-- 6. Evaluation Status (Draft / Submitted / Locked)
CREATE TABLE IF NOT EXISTS evaluation_status (
    id TEXT PRIMARY KEY,
    judge_id TEXT REFERENCES judges(id) ON DELETE CASCADE,
    participant_id TEXT REFERENCES participants(id) ON DELETE CASCADE,
    round_id TEXT REFERENCES rounds(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('draft', 'submitted', 'locked')) NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (judge_id, participant_id, round_id)
);

-- 7. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT REFERENCES judges(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
