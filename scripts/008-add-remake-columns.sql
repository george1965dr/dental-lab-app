-- Add remake reason and notes columns to cases table
ALTER TABLE cases 
ADD COLUMN remake_reason text,
ADD COLUMN remake_notes text;

-- Add check constraint for remake_reason values
ALTER TABLE cases 
ADD CONSTRAINT cases_remake_reason_check 
CHECK (remake_reason IS NULL OR remake_reason IN ('shade', 'fit', 'contour'));
