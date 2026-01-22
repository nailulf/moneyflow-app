#!/bin/bash

echo "Checking Supabase status..."
if command -v supabase &> /dev/null; then
    echo "Supabase CLI found."
    echo "Attempting to push migrations..."
    
    # Try to push migrations. This might require login/link.
    supabase db push
    
    if [ $? -eq 0 ]; then
        echo "✅ Migrations applied successfully!"
    else
        echo "❌ Failed to push migrations."
        echo "Please ensure you are logged in: 'supabase login'"
        echo "And your project is linked: 'supabase link --project-ref <your-project-ref>'"
    fi
else
    echo "❌ Supabase CLI not found. Please install it to apply migrations."
fi
