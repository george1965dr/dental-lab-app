-- Creating comprehensive database schema for dental lab case tracking

-- Cases table - main table for tracking dental cases
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('normal', 'rush')) DEFAULT 'normal',
    procedure_type VARCHAR(50) CHECK (procedure_type IN (
        'crown', 'bridge', 'inlay', 'onlay', 
        'implant_crown', 'implant_bridge', 
        'surgical_guide', 'aligners'
    )) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teeth table - for tracking which teeth are involved in each case
CREATE TABLE IF NOT EXISTS case_teeth (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    tooth_number INTEGER CHECK (tooth_number BETWEEN 1 AND 32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shades table - for tracking shade selections
CREATE TABLE IF NOT EXISTS case_shades (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    shade_code VARCHAR(10) NOT NULL, -- e.g., A1, B2, C3, D4
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow steps table - tracks progress through different workflows
CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    step_order INTEGER NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_patient_name ON cases(patient_name);
CREATE INDEX IF NOT EXISTS idx_cases_due_date ON cases(due_date);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_case_id ON workflow_steps(case_id);
