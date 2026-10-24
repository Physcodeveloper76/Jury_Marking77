-- WEB FORGE AI Jury Scoring Portal - Official Seed Data
-- Passwords:
--   admin  -> adminpass
--   judge1 -> judge1pass
--   judge2 -> judge2pass

-- 1. Judges & Administrators
INSERT INTO judges (id, email, password_hash, display_name, role, is_active) VALUES
('judge_admin', 'admin', 'scrypt:32768:8:1$uH3f2y6eB5Rz8q1m$8f0e5b7c8a9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f', 'Admin User', 'admin', TRUE),
('judge_01', 'judge1', 'scrypt:32768:8:1$vK9p1x4aM2Wd7e3n$9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', 'Judge One (Dr. Alan Turing)', 'judge', TRUE),
('judge_02', 'judge2', 'scrypt:32768:8:1$xP5m8z3bL7Qf1v9k$0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', 'Judge Two (Dr. Ada Lovelace)', 'judge', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Participating Teams (32 Official Teams)
INSERT INTO participants (id, team_code, team_name, is_active) VALUES
('team_01', 'TEAM-01', 'Neuro-Nova', TRUE),
('team_02', 'TEAM-02', 'OMITRIX', TRUE),
('team_03', 'TEAM-03', '2 BT', TRUE),
('team_04', 'TEAM-04', 'Rockzz', TRUE),
('team_05', 'TEAM-05', 'Team Nova', TRUE),
('team_06', 'TEAM-06', 'Voxnova', TRUE),
('team_07', 'TEAM-07', 'StrawHats', TRUE),
('team_08', 'TEAM-08', 'Deadline Dodgers', TRUE),
('team_09', 'TEAM-09', 'Team Techno', TRUE),
('team_10', 'TEAM-10', 'Tech Sazzies', TRUE),
('team_11', 'TEAM-11', 'The BlackBox', TRUE),
('team_12', 'TEAM-12', '100x', TRUE),
('team_13', 'TEAM-13', 'Khatro ke Khiladi', TRUE),
('team_14', 'TEAM-14', 'Dholakpur', TRUE),
('team_15', 'TEAM-15', 'Kasukabe defence force', TRUE),
('team_16', 'TEAM-16', 'Resolve.exe', TRUE),
('team_17', 'TEAM-17', 'Git Update', TRUE),
('team_18', 'TEAM-18', 'Rulers', TRUE),
('team_19', 'TEAM-19', 'Dice', TRUE),
('team_20', 'TEAM-20', 'The Debuggers', TRUE),
('team_21', 'TEAM-21', 'The Aces', TRUE),
('team_22', 'TEAM-22', 'GAME OF CODE', TRUE),
('team_23', 'TEAM-23', 'Semicolonist', TRUE),
('team_24', 'TEAM-24', 'HACKOX1', TRUE),
('team_25', 'TEAM-25', 'Code_with_Errors', TRUE),
('team_26', 'TEAM-26', 'Axiora', TRUE),
('team_27', 'TEAM-27', 'Team vision', TRUE),
('team_28', 'TEAM-28', 'Gyrotex', TRUE),
('team_29', 'TEAM-29', 'Legends', TRUE),
('team_30', 'TEAM-30', 'Triad-X', TRUE),
('team_31', 'TEAM-31', 'Overclock', TRUE),
('team_32', 'TEAM-32', 'BrainByte', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Evaluation Rounds
INSERT INTO rounds (id, name, display_order, is_active) VALUES
('round_ml', 'Round A: Machine Learning (ML) Model', 1, TRUE),
('round_web', 'Round B: Web Development', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Five Criteria per Round (10 total, 20 max marks each, 100 total per round)
INSERT INTO criteria (id, round_id, name, description, max_marks, weight, display_order, is_active) VALUES
-- Round A: ML Model
('crit_ml_1', 'round_ml', 'Model Accuracy & Performance', 'Accuracy, precision, recall, F1-score, or other relevant metrics.', 20, 1.0, 1, TRUE),
('crit_ml_2', 'round_ml', 'Data Handling & Preprocessing', 'Data cleaning, feature selection, and dataset quality.', 20, 1.0, 2, TRUE),
('crit_ml_3', 'round_ml', 'Model Selection & Implementation', 'Algorithm choice, training approach, and technical implementation.', 20, 1.0, 3, TRUE),
('crit_ml_4', 'round_ml', 'Innovation & Problem-Solving', 'Originality, relevance, and effectiveness of the proposed solution.', 20, 1.0, 4, TRUE),
('crit_ml_5', 'round_ml', 'Presentation & Explanation', 'Clarity of approach, results, limitations, and live demonstration.', 20, 1.0, 5, TRUE),

-- Round B: Web Development
('crit_web_1', 'round_web', 'UI/UX Design', 'Visual appeal, layout, navigation, and user experience.', 20, 1.0, 1, TRUE),
('crit_web_2', 'round_web', 'Functionality', 'Working features, interactions, and completion of requirements.', 20, 1.0, 2, TRUE),
('crit_web_3', 'round_web', 'Code Quality & Structure', 'Clean code, proper structure, maintainability, and best practices.', 20, 1.0, 3, TRUE),
('crit_web_4', 'round_web', 'Innovation & Creativity', 'Uniqueness, creativity, and effective problem-solving.', 20, 1.0, 4, TRUE),
('crit_web_5', 'round_web', 'Responsiveness & Performance', 'Mobile compatibility, loading speed, and overall performance.', 20, 1.0, 5, TRUE)
ON CONFLICT (id) DO NOTHING;
