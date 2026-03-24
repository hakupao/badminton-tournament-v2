-- Reset the public demo environment while keeping one known admin account.

DELETE FROM score_events;
DELETE FROM referee_records;
DELETE FROM match_games;
DELETE FROM matches;
DELETE FROM tournament_participants;

UPDATE users
SET player_id = NULL
WHERE username = 'demo';

DELETE FROM players;
DELETE FROM groups;
DELETE FROM template_matches;
DELETE FROM template_positions;
DELETE FROM tournaments;
DELETE FROM users
WHERE username <> 'demo';

INSERT OR IGNORE INTO users (id, username, password_hash, role)
VALUES (1, 'demo', '$2b$10$R35Wjte3jeaGIwQZvTRquuoBZUPqjkpoDTzOeFXA44mMpkbE0jNJK', 'admin');

UPDATE users
SET password_hash = '$2b$10$R35Wjte3jeaGIwQZvTRquuoBZUPqjkpoDTzOeFXA44mMpkbE0jNJK',
    role = 'admin',
    player_id = NULL
WHERE username = 'demo';

INSERT INTO tournaments (
  id, name, status, courts_count, round_duration_minutes, scoring_mode,
  event_date, start_time, end_time, males_per_group, females_per_group
)
VALUES
  (1001, 'Demo Spring Open', 'active', 2, 18, 'single_21', '2026-04-06', '19:00', '21:00', 3, 2),
  (1002, 'Demo Winter Classic', 'finished', 2, 18, 'single_21', '2026-03-10', '19:00', '21:00', 3, 2);

INSERT INTO groups (id, tournament_id, name, icon, sort_order)
VALUES
  (1101, 1001, 'Demo Cat', '🐱', 0),
  (1102, 1001, 'Demo Dog', '🐶', 1),
  (1201, 1002, 'Demo Rabbit', '🐰', 0),
  (1202, 1002, 'Demo Panda', '🐼', 1);

INSERT INTO players (id, tournament_id, group_id, position_number, gender, name)
VALUES
  (11101, 1001, 1101, 1, 'M', 'Aki'),
  (11102, 1001, 1101, 2, 'M', 'Ben'),
  (11103, 1001, 1101, 3, 'M', 'Chen'),
  (11104, 1001, 1101, 4, 'F', 'Dora'),
  (11105, 1001, 1101, 5, 'F', 'Ema'),
  (11106, 1001, 1102, 1, 'M', 'Finn'),
  (11107, 1001, 1102, 2, 'M', 'Glen'),
  (11108, 1001, 1102, 3, 'M', 'Hugo'),
  (11109, 1001, 1102, 4, 'F', 'Iris'),
  (11110, 1001, 1102, 5, 'F', 'Jade'),
  (12101, 1002, 1201, 1, 'M', 'Kian'),
  (12102, 1002, 1201, 2, 'M', 'Leon'),
  (12103, 1002, 1201, 3, 'M', 'Milo'),
  (12104, 1002, 1201, 4, 'F', 'Nina'),
  (12105, 1002, 1201, 5, 'F', 'Opal'),
  (12106, 1002, 1202, 1, 'M', 'Pace'),
  (12107, 1002, 1202, 2, 'M', 'Quin'),
  (12108, 1002, 1202, 3, 'M', 'Reed'),
  (12109, 1002, 1202, 4, 'F', 'Sia'),
  (12110, 1002, 1202, 5, 'F', 'Tia');

INSERT INTO template_positions (id, tournament_id, position_number, gender)
VALUES
  (2101, 1001, 1, 'M'),
  (2102, 1001, 2, 'M'),
  (2103, 1001, 3, 'M'),
  (2104, 1001, 4, 'F'),
  (2105, 1001, 5, 'F'),
  (2201, 1002, 1, 'M'),
  (2202, 1002, 2, 'M'),
  (2203, 1002, 3, 'M'),
  (2204, 1002, 4, 'F'),
  (2205, 1002, 5, 'F');

INSERT INTO template_matches (
  id, tournament_id, match_type, home_pos_1, home_pos_2, away_pos_1, away_pos_2, sort_order
)
VALUES
  (3101, 1001, 'MD', 1, 2, 1, 2, 1),
  (3102, 1001, 'MD', 2, 3, 2, 3, 2),
  (3103, 1001, 'WD', 4, 5, 4, 5, 3),
  (3104, 1001, 'XD', 1, 4, 1, 4, 4),
  (3105, 1001, 'XD', 3, 5, 3, 5, 5),
  (3201, 1002, 'MD', 1, 2, 1, 2, 1),
  (3202, 1002, 'MD', 2, 3, 2, 3, 2),
  (3203, 1002, 'WD', 4, 5, 4, 5, 3),
  (3204, 1002, 'XD', 1, 4, 1, 4, 4),
  (3205, 1002, 'XD', 3, 5, 3, 5, 5);

INSERT INTO matches (
  id, tournament_id, round_number, court_number, home_group_id, away_group_id,
  template_match_id, match_type, home_player_1_id, home_player_2_id,
  away_player_1_id, away_player_2_id, status, winner
)
VALUES
  (4101, 1001, 1, 1, 1101, 1102, 3101, 'MD', 11101, 11102, 11106, 11107, 'finished', 'home'),
  (4102, 1001, 1, 2, 1101, 1102, 3103, 'WD', 11104, 11105, 11109, 11110, 'finished', 'away'),
  (4103, 1001, 2, 1, 1101, 1102, 3104, 'XD', 11101, 11104, 11106, 11109, 'in_progress', NULL),
  (4104, 1001, 2, 2, 1101, 1102, 3102, 'MD', 11102, 11103, 11107, 11108, 'pending', NULL),
  (4105, 1001, 3, 1, 1101, 1102, 3105, 'XD', 11103, 11105, 11108, 11110, 'finished', 'away'),
  (4201, 1002, 1, 1, 1201, 1202, 3201, 'MD', 12101, 12102, 12106, 12107, 'finished', 'home'),
  (4202, 1002, 1, 2, 1201, 1202, 3203, 'WD', 12104, 12105, 12109, 12110, 'finished', 'away'),
  (4203, 1002, 2, 1, 1201, 1202, 3204, 'XD', 12101, 12104, 12106, 12109, 'finished', 'home'),
  (4204, 1002, 2, 2, 1201, 1202, 3202, 'MD', 12102, 12103, 12107, 12108, 'finished', 'away'),
  (4205, 1002, 3, 1, 1201, 1202, 3205, 'XD', 12103, 12105, 12108, 12110, 'finished', 'home');

INSERT INTO match_games (id, match_id, game_number, home_score, away_score, winner)
VALUES
  (5101, 4101, 1, 21, 17, 'home'),
  (5102, 4102, 1, 18, 21, 'away'),
  (5103, 4103, 1, 11, 9, NULL),
  (5104, 4105, 1, 16, 21, 'away'),
  (5201, 4201, 1, 21, 14, 'home'),
  (5202, 4202, 1, 17, 21, 'away'),
  (5203, 4203, 1, 21, 18, 'home'),
  (5204, 4204, 1, 19, 21, 'away'),
  (5205, 4205, 1, 21, 13, 'home');

INSERT INTO referee_records (id, match_id, player_id, role)
VALUES
  (6101, 4101, 11103, 'referee'),
  (6102, 4101, 11109, 'line_judge'),
  (6103, 4201, 12103, 'referee'),
  (6104, 4201, 12109, 'line_judge');
