-- Migration: Add bait column to scans table
-- Run this in Supabase SQL Editor

-- Add bait column to store the bait used at the time of scan
ALTER TABLE scans ADD COLUMN IF NOT EXISTS bait TEXT;

-- Add box_type_name column to store the box type name at time of scan
ALTER TABLE scans ADD COLUMN IF NOT EXISTS box_type_name TEXT;

-- Comment for documentation
COMMENT ON COLUMN scans.bait IS 'Köder der Box zum Zeitpunkt des Scans';
COMMENT ON COLUMN scans.box_type_name IS 'Box-Typ Name zum Zeitpunkt des Scans';
