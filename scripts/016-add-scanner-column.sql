-- Add scanner column to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS scanner TEXT;

-- Add comment for documentation
COMMENT ON COLUMN cases.scanner IS 'Scanning device used for intraoral data (Primescan or Aoralscan)';
