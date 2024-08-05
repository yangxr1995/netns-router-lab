#!/bin/bash

for ns in $(ip netns list | awk '/rlab/{print $1}') 
do
    ip netns del $ns
done
