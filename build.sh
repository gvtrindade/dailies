#!/bin/bash

# Get current timestamp
TIMESTAMP=$(date +%s)

# Update sw.js with the current timestamp
sed -i "s/\${TIMESTAMP}/$TIMESTAMP/g" sw.js

echo "Updated sw.js with timestamp: $TIMESTAMP"