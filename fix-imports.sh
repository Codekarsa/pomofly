#!/bin/bash

# Fix @/components/ui imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/components/ui/|from './ui/|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from \"@/components/ui/|from \"./ui/|g"

# Fix @/hooks imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/hooks/|from '../hooks/|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from \"@/hooks/|from \"../hooks/|g"

# Fix @/lib imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from '@/lib/|from '../lib/|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|from \"@/lib/|from \"../lib/|g"

# Fix specific paths for deeper nested files
find src -path "*/ui/*" -name "*.tsx" -o -path "*/ui/*" -name "*.ts" | xargs sed -i "s|from '../lib/|from '../../lib/|g"
find src -path "*/ui/*" -name "*.tsx" -o -path "*/ui/*" -name "*.ts" | xargs sed -i "s|from \"../lib/|from \"../../lib/|g"

echo "Import paths fixed!"