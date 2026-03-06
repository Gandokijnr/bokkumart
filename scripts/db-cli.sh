#!/bin/bash
# Supabase CLI wrapper for Windows PowerShell/Command Prompt
# Usage: ./scripts/db-cli.sh [command]

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with:"
    echo "   SUPABASE_URL=your_project_url"
    echo "   SUPABASE_ANON_KEY=your_anon_key"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's/.supabase.co//')

echo "🔗 Connecting to Supabase project: $PROJECT_REF"

# Run Supabase CLI command
supabase "$@"
