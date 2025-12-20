# Migration Script: Fix Box-QR Links

## Purpose

This script links existing boxes without `qr_code` to their corresponding QR codes in the database.

## Problem

Some boxes in the database may not have their `qr_code` field set, causing issues with:
- Box pool statistics showing incorrect values
- Quick assignment functionality failing
- Box identification problems

## Solution

The script:
1. Finds all boxes without a `qr_code` field
2. Matches them with QR codes based on organization and box number
3. Updates the boxes with their correct QR codes
4. Provides detailed logging of all operations

## Usage

### Dry Run (recommended first)

Test the script without making any changes:

```bash
cd backend
node scripts/fix-box-qr-links.js --dry-run
```

This will show you:
- How many boxes need fixing
- Which boxes will be matched with which QR codes
- Any boxes that cannot be matched

### Live Run

Apply the fixes to the database:

```bash
cd backend
node scripts/fix-box-qr-links.js
```

## Output

The script provides detailed output including:
- Number of boxes found without QR codes
- Organization-by-organization breakdown
- Successful matches and failed matches
- Summary of operations

Example output:
```
============================================================
📦 BOX-QR LINK FIXER
============================================================
Mode: LIVE RUN (changes will be applied)

Step 1: Finding boxes without qr_code...
✅ Found 20 boxes without qr_code

Step 2: Grouped boxes into 2 organization(s)

📂 Processing organization: org-123
   Boxes to fix: 15
   Organization: Demo Company (prefix: DEMO)
   Available QR codes: 50
   ✅ Box box-1 (number: 1, name: DEMO-001) → QR: DEMO-0001
   ✅ Box box-2 (number: 2, name: DEMO-002) → QR: DEMO-0002
   ...
   Summary: 15 matched, 0 failed

============================================================
📊 SUMMARY
============================================================
Total boxes without QR code: 20
Successfully matched: 18
Failed to match: 2

Step 4: Applying updates...
✅ Successfully updated: 18 boxes

✨ Done!
```

## When to Run

Run this script:
- After upgrading from an older version where boxes weren't linked to QR codes
- After importing legacy data
- When statistics show incorrect values in the Box Pool
- As part of troubleshooting box assignment issues

## Safety

- The script includes a `--dry-run` mode for safe testing
- Only updates boxes that are not archived
- Requires exact number match between box and QR code
- Provides detailed logging for audit purposes
- Does not modify QR codes, only updates box records

## Requirements

- Node.js environment
- Supabase configuration in `backend/config/supabase.js`
- Database access with read/write permissions for boxes table
