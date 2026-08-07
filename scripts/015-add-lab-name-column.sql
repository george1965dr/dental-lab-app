-- Add lab_name column to cases table for "Sent to Lab" procedure
ALTER TABLE cases ADD COLUMN IF NOT EXISTS lab_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN cases.lab_name IS 'Name of the external lab for Sent to Lab procedure type';
