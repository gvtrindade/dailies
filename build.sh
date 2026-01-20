#!/bin/bash

# Get current timestamp
TIMESTAMP=$(date +%s)

# Update CACHE_VERSION constant directly
sed -i "s/const CACHE_VERSION = .*/const CACHE_VERSION = $TIMESTAMP;/" sw.js

echo "Updated sw.js with timestamp: $TIMESTAMP"