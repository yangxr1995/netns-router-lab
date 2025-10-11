
downDelay='20ms'
downBand='20Mbit'
downLoss='0%'

upDelay='20ms'
upBand='10Mbit'
upLoss='1%'

./tc-quick.sh --direction down --reset
./tc-quick.sh --direction down --delay ${downDelay} --bandwidth ${downBand} --loss ${downLoss}

./tc-quick.sh --direction up --reset
./tc-quick.sh --direction up --delay ${upDelay} --bandwidth ${upBand} --loss ${upLoss}

echo "上行: 时延[${upDelay}] 带宽[$upBand] 丢包率[$upLoss]"
echo "下行: 时延[${downDelay}] 带宽[$downBand] 丢包率[$downLoss]"


