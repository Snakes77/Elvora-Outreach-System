#!/bin/bash
npm run dev > /dev/null 2>&1 &
PID=$!
echo "Waiting for Next.js to start with the new chronological patch..."
sleep 15
for i in {1..8}; do
    echo "Batch $i..."
    curl -s -X GET "http://localhost:3000/api/cron/campaigns/saf" -H "Authorization: Bearer d8a73093b1c01c590e55aa3aabcff22e98696618ce46a3acbb330711a1dc74ad" | grep -o '"sent":[0-9]*'
    sleep 30
done
kill $PID
