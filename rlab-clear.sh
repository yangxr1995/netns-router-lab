#!/bin/bash

for ns in $(ip netns list | awk '/rlab/{print $1}') 
do
    ip netns del $ns
done

sleep 3
ip link | awk '/rlab/ {split($2, arr, /[@:]/); print arr[1]}' | xargs -I {} sudo ip link del {} 2>1 &>/dev/null
