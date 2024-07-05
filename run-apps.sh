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
    'https://wiser-withered-moon.solana-mainnet.quiknode.pro/c1d96607cc07a217b9e3795f0adc93289e26e73f/'
    'https://white-broken-putty.solana-devnet.quiknode.pro/ca4aac452e33b2db507b9e908cf4d1468f46a576/'
    'https://serene-thrilling-owl.solana-mainnet.quiknode.pro/e4b5267ce18bbbe870ab3a9a7126ffd9289affe8/'
    'https://smart-still-dream.solana-mainnet.quiknode.pro/6931890891be4c5dfd8e7f1a52c45a12f9933b8d/'
    'https://attentive-fragrant-needle.solana-mainnet.quiknode.pro/b31eff26d553ce237840c53fcf1df78928976282/'
    'https://thrilling-aged-dew.solana-mainnet.quiknode.pro/7b5b7e38e30365f5478b147838820bee394a27b1/'
    'https://thrilling-fragrant-lambo.solana-mainnet.quiknode.pro/e3ca80d91a580ba825d54df04902bc43ca068223/'
    'https://quaint-newest-film.solana-mainnet.quiknode.pro/17a14f3e6587f587d74fe3d010b883bb23e97d36/'
    'https://cool-alien-hexagon.solana-mainnet.quiknode.pro/3d8473343e0323898700d0538c523d84282dbae0/'
    'https://proportionate-misty-cloud.solana-mainnet.quiknode.pro/e827e727841e39b815a3091dc0285516bc612916/'
)

# Initialize start value
start=$start_value
url_index=0
num_urls=${#paidEndpoints[@]}
step=1

# Loop through the range and create ranges, then run the node script
while [ $start -le $end_value ]; do
    end=$((start + CHUNK_SIZE - 1))
    if [ $end -gt $end_value ]; then
        end=$end_value
    fi

    # Get the URL from the paidEndpoints array
    url=${paidEndpoints[$url_index]}

    # Generate the filename
    filename="${step}.csv"
	
	echo "$start $end slots number transferred to $filename"
    # Start an instance of the Node.js application with the current range, URL and filename
    $NODE_CMD index.js $start $end $url $filename &

    # Pause for 3 seconds before starting the next instance
    sleep 3

    # Increment start value for the next range
    start=$((end + 1))

    # Increment URL index and wrap around if necessary
    url_index=$(( (url_index + 1) % num_urls ))

    # Increment step
    step=$((step + 1))
done

# Wait for all background processes to complete
wait

echo "All instances have finished running."
