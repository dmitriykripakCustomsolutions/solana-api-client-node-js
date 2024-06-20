#!/bin/bash

# Ensure the script works on both Windows (Git Bash) and Linux
if command -v node >/dev/null 2>&1; then
    NODE_CMD="node"
elif command -v nodejs >/dev/null 2>&1; then
    NODE_CMD="nodejs"
else
    echo "Node.js is not installed. Please install Node.js to run the application."
    exit 1
fi

# Check if start and end values are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <start_value> <end_value>"
    exit 1
fi

# Define the start and end values from the arguments
start_value=$1
end_value=$2

# Define the chunk size (number of elements per range)
CHUNK_SIZE=10000

# Define the array of URLs
paidEndpoints=(
    'https://ultra-damp-season.solana-mainnet.quiknode.pro/2af57532b29cb63e468e9b2104fa6e0c1b2147aa/'
    'https://cool-powerful-dinghy.solana-mainnet.quiknode.pro/fb5917038a4f8206c7466444a7ed19f3847cfd83/'
    'https://radial-wandering-sky.solana-mainnet.quiknode.pro/a8c7a3afa19fbb1cea5a4aad3f78d2d72cf6a358/'
    'https://magical-proud-frog.solana-mainnet.quiknode.pro/3817aca94165fbbb001ea1f8cb937900aac89875/'
    'https://empty-distinguished-breeze.solana-mainnet.quiknode.pro/c6782a19f91f2fd1264f1086acf12c7f681d2b03/'
    'https://ultra-small-seed.solana-mainnet.quiknode.pro/aa9e09f32840b400fce07292cad8222d2351c441/'
    'https://light-greatest-moon.solana-mainnet.quiknode.pro/b4a3d6b2d17c7a5eeb1a4e35e4def07c586c53da/'
    'https://cold-virulent-frost.solana-mainnet.quiknode.pro/57f32aded44aac31a70a1c25d6f8804943989421/'
    'https://frequent-shy-mound.solana-mainnet.quiknode.pro/ee77d97ae68de4e4a09cb4a7c2d21fea60e49189/'
    'https://icy-quick-liquid.solana-mainnet.quiknode.pro/adc8831ac93026d837c40ff92282f4120a9bb6ef/'
)

# Initialize start value
start=$start_value
url_index=0
num_urls=${#paidEndpoints[@]}

# Loop through the range and create ranges, then run the node script
while [ $start -le $end_value ]; do
    end=$((start + CHUNK_SIZE - 1))
    if [ $end -gt $end_value ]; then
        end=$end_value
    fi

    # Get the URL from the paidEndpoints array
    url=${paidEndpoints[$url_index]}

    # Start an instance of the Node.js application with the current range and URL
    $NODE_CMD index.js $start $end $url &

    # Pause for 3 seconds before starting the next instance
    sleep 3

    # Increment start value for the next range
    start=$((end + 1))

    # Increment URL index and wrap around if necessary
    url_index=$(( (url_index + 1) % num_urls ))
done

# Wait for all background processes to complete
wait

echo "All instances have finished running."
