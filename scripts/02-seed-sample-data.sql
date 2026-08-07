-- Adding sample data for testing the dental lab tracking system

-- Insert sample cases
INSERT INTO cases (patient_name, start_date, due_date, priority, procedure_type, status) VALUES
('John Smith', '2024-01-15', '2024-01-25', 'normal', 'crown', 'in_progress'),
('Sarah Johnson', '2024-01-16', '2024-01-20', 'rush', 'bridge', 'in_progress'),
('Michael Brown', '2024-01-17', '2024-01-30', 'normal', 'implant_crown', 'in_progress'),
('Emily Davis', '2024-01-18', '2024-02-15', 'normal', 'aligners', 'in_progress'),
('Robert Wilson', '2024-01-19', '2024-01-22', 'rush', 'surgical_guide', 'in_progress');

-- Insert sample teeth for cases
INSERT INTO case_teeth (case_id, tooth_number) VALUES
(1, 14), -- John Smith - crown on tooth 14
(2, 13), (2, 14), (2, 15), -- Sarah Johnson - bridge on teeth 13-15
(3, 19), -- Michael Brown - implant crown on tooth 19
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), -- Emily Davis - aligners (multiple teeth)
(5, 8); -- Robert Wilson - surgical guide for tooth 8

-- Insert sample shades
INSERT INTO case_shades (case_id, shade_code) VALUES
(1, 'A2'), -- John Smith
(2, 'B1'), -- Sarah Johnson
(3, 'A3'), -- Michael Brown
(5, 'A1'); -- Robert Wilson (aligners don't need shades)

-- Insert workflow steps for different procedure types
-- Crown workflow: impression, designed, milled, sintered, completed
INSERT INTO workflow_steps (case_id, step_name, step_order, status, started_at, completed_at) VALUES
(1, 'impression', 1, 'completed', '2024-01-15 09:00:00', '2024-01-15 10:30:00'),
(1, 'designed', 2, 'completed', '2024-01-15 11:00:00', '2024-01-16 14:00:00'),
(1, 'milled', 3, 'in_progress', '2024-01-16 15:00:00', NULL),
(1, 'sintered', 4, 'pending', NULL, NULL),
(1, 'completed', 5, 'pending', NULL, NULL);

-- Bridge workflow: impression, designed, milled, sintered, completed
INSERT INTO workflow_steps (case_id, step_name, step_order, status, started_at, completed_at) VALUES
(2, 'impression', 1, 'completed', '2024-01-16 08:00:00', '2024-01-16 09:30:00'),
(2, 'designed', 2, 'in_progress', '2024-01-16 10:00:00', NULL),
(2, 'milled', 3, 'pending', NULL, NULL),
(2, 'sintered', 4, 'pending', NULL, NULL),
(2, 'completed', 5, 'pending', NULL, NULL);

-- Implant crown workflow: impression, designed, milled, sintered, completed
INSERT INTO workflow_steps (case_id, step_name, step_order, status, started_at, completed_at) VALUES
(3, 'impression', 1, 'completed', '2024-01-17 09:00:00', '2024-01-17 10:00:00'),
(3, 'designed', 2, 'pending', NULL, NULL),
(3, 'milled', 3, 'pending', NULL, NULL),
(3, 'sintered', 4, 'pending', NULL, NULL),
(3, 'completed', 5, 'pending', NULL, NULL);

-- Aligners workflow: impressions, photos, sent_to_lab, in_office
INSERT INTO workflow_steps (case_id, step_name, step_order, status, started_at, completed_at) VALUES
(4, 'impressions', 1, 'completed', '2024-01-18 09:00:00', '2024-01-18 10:30:00'),
(4, 'photos', 2, 'pending', NULL, NULL),
(4, 'sent_to_lab', 3, 'pending', NULL, NULL),
(4, 'in_office', 4, 'pending', NULL, NULL);

-- Surgical guide workflow: impression, designed, 3d_printed, completed
INSERT INTO workflow_steps (case_id, step_name, step_order, status, started_at, completed_at) VALUES
(5, 'impression', 1, 'completed', '2024-01-19 08:00:00', '2024-01-19 09:00:00'),
(5, 'designed', 2, 'pending', NULL, NULL),
(5, '3d_printed', 3, 'pending', NULL, NULL),
(5, 'completed', 4, 'pending', NULL, NULL);
