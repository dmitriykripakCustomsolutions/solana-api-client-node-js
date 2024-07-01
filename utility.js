const { readTokenList, getLastEntries } = require('./file-utilities.js');

const availableTokens = readTokenList();
const raydiumWalletAccount = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const wrappedSOLToken = 'So11111111111111111111111111111111111111112';

function pause(milliseconds) {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
        // Do nothing
    }
}

function getCurrencySymbol(instructionInfo){
    currencySymbol = ''
    if(availableTokens && availableTokens.length > 0 && instructionInfo.mint){
        index = availableTokens.findIndex(_ => _.address === instructionInfo.mint)        
        if(index > -1){
            currencySymbol = availableTokens[index].symbol
        } else {
            currencySymbol = instructionInfo.mint
        }
    } else {
        currencySymbol = 'not specified';
    }

    return currencySymbol;
}

function getTransactionsSignatures(transactions) {
    signatures = []
    transactions.forEach(transaction => {            
        if(transaction.meta.innerInstructions.length > 0){
            signature = transaction.transaction.signatures[0];
            signatures.push(signature)
        }
    });

    return signatures;
}

function convertToDecimal(numberStr, decimals) {
    if(numberStr && decimals){
        const length = numberStr.length;

        // Если длина строки меньше или равна количеству десятичных знаков,
        // добавляем ведущие нули
        if (length <= decimals) {
            numberStr = '0'.repeat(decimals - length + 1) + numberStr;
        }

        // Вставляем десятичную точку на нужное место
        const integerPart = numberStr.slice(0, length - decimals);
        const fractionalPart = numberStr.slice(length - decimals);

        // Собираем окончательное число
        const decimalNumber = `${integerPart}.${fractionalPart}`;

        // Преобразуем строку в число и возвращаем
        return decimalNumber;
    } else {
        return 'not specified';
    }
}

function getCurrencyAmount(instructionInfo){
    if(instructionInfo.tokenAmount){
        return instructionInfo.tokenAmount.uiAmountString || instructionInfo.tokenAmount.uiAmount 
        || convertToDecimal(instructionInfo.tokenAmount.amount, instructionInfo.tokenAmount.decimals);
    } else {
        return 'not specified';
    }
}

function extractTransactionInfo(transaction, block, slotNumber) {
    try{
        extractedInfo = {}
        extractedInfo.slot = slotNumber;
        //Parsed time
        // extractedInfo.operationDate = block.blockTime ? new Date(block.blockTime * 1000) : 'no date';

        //Time in timestamp formate
        extractedInfo.operationDate = block.blockTime;
        extractedInfo.transactionSignature = (transaction.transaction && transaction.transaction.signatures) ? transaction.transaction.signatures[0] : 'not specified';
        if(transaction.meta.innerInstructions.length > 0){
            for (let index = 0; index < transaction.meta.innerInstructions.length; index++) {
                innerInstruction = transaction.meta.innerInstructions[index];
            
                if(innerInstruction.instructions && innerInstruction.instructions.length > 0){
                    
                    for (let i = 0; i < innerInstruction.instructions.length; i++) {
                        instruction = innerInstruction.instructions[i]
                        if(instruction.parsed && instruction.parsed.info && instruction.parsed.info.tokenAmount){
                            if(!extractedInfo.soldCurrencySymbol){
                                extractedInfo.soldCurrencySymbol = getCurrencySymbol(instruction.parsed.info)
                                extractedInfo.soldCurrencyAmount = getCurrencyAmount(instruction.parsed.info)
                            } else {
                                if(!extractedInfo.boughtCurrencySymbol){
                                    boughtCurrencySymbol = getCurrencySymbol(instruction.parsed.info)
                                    if(boughtCurrencySymbol !== 'not specified' && boughtCurrencySymbol !== extractedInfo.soldCurrencySymbol){
                                        extractedInfo.boughtCurrencySymbol = boughtCurrencySymbol
                                        extractedInfo.boughtCurrencyAmount = getCurrencyAmount(instruction.parsed.info)
                                    }                                    
                                } else{
                                    break;
                                }
                            }
                        }
                    }

                    break;
                }
            }
        }

        return extractedInfo;
    } catch(err){
        console.log(err)
    }
}

function extractTransactionInfo_2v(transaction, block, slotNumber) {
    try{
        extractedInfo = {}
        extractedInfo.slot = slotNumber;
        //Time in timestamp formate
        extractedInfo.operationDate = block.blockTime;
        extractedInfo.transactionSignature = (transaction.transaction && transaction.transaction.signatures) ? transaction.transaction.signatures[0] : 'not specified';
        
        //csvData += slot,operationDate,transactionSignature,soldCurrencySymbol,soldCurrencyAmount,boughtCurrencySymbol,boughtCurrencyAmount
        
        postTokenBalances = getTokenBalances('postTokenBalances', transaction);
        preTokenBalances = getTokenBalances('preTokenBalances', transaction);

        isRaydium = checkIfRaydiumDexAndSOL(postTokenBalances);

        if(isRaydium){
            console.log('Raydium DEX caught');

            extractedTradeData = extractTradeData(postTokenBalances, preTokenBalances, transaction);
        }

        return extractedInfo;
    } catch(err){
        console.log(err)
    }
}

function getTokenBalances(tokenBalancesType, transaction) {
    if(transaction.meta && transaction.meta[tokenBalancesType] 
        && transaction.meta && transaction.meta[tokenBalancesType].length > 0) {   
            
            humanOwnerAddress = getHumanOwnerAddress(transaction);
            
            return transaction.meta[tokenBalancesType].map(item => ({
                mint: item.mint,
                owner: item.owner, 
                ownerType: item.owner === humanOwnerAddress ? 'human' : 'DEX',
                programId: item.programId,
                uiAmount: item.uiTokenAmount.uiAmount
              }));
    }

    return [];
}

function checkIfRaydiumDexAndSOL(postTokenBalances){
    return (postTokenBalances[1].owner ===  raydiumWalletAccount
    || (postTokenBalances[2].owner && postTokenBalances[2].owner === raydiumWalletAccount)) 
    && (postTokenBalances[1].mint === wrappedSOLToken || (postTokenBalances[2].mint 
        && postTokenBalances[2].mint === wrappedSOLToken));
}

async function getNewStartBlockNumber(filePath){
    lastEntries = await getLastEntries(filePath)
    slotNumber = undefined
    if(lastEntries && lastEntries.length > 0){
        for (const entry of lastEntries.reverse()) {
            if(entry.slotNumber){
                slotNumber = entry.slotNumber
            }
            break;
        }
        
        return slotNumber;
    }

    return slotNumber;
}

function getHumanOwnerAddress(transaction){
    return transaction.meta['postTokenBalances'][0];
}

function extractTradeData(postTokenBalances, preTokenBalances, transaction){
    humanPostTokenBalances = postTokenBalances.filter(_ => _.ownerType === 'human');
    humanPreTokenBalances = preTokenBalances.filter(_ => _.ownerType === 'human');
    
    humanPostTokenBalances.forEach

    if(humanPostTokenBalances.length > 2){
        return { soldCurrencySymbol: 'There are more than 2 human entries'};
    }


    
    for (let index = 0; index < postTokenBalances.length; index++) {        
        if(postTokenBalances[index].owner === getHumanOwnerAddress(transaction)){

        } else {

        }
        
    }
    // if(Math.abs(postTokenBalances[0].uiAmount - preTokenBalances[0].uiAmount) 
    // === Math.abs(postTokenBalances[1].uiAmount - preTokenBalances[1].uiAmount))
    // && Math.abs(postTokenBalances[1].uiAmount - preTokenBalances[1].uiAmount) 
    // === Math.abs(postTokenBalances[1].uiAmount - preTokenBalances[1].uiAmount))
    
}

function formatPerformanceTime(duration) {

    let seconds = Math.floor(duration / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    seconds = seconds % 60;

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${hoursStr}h:${minutesStr}m:${secondsStr}s`;
}

function formatTimeWithMilliseconds(duration) {
    // Преобразуем миллисекунды в секунды и оставшиеся миллисекунды
    let milliseconds = duration % 1000;
    let seconds = Math.floor(duration / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    seconds = seconds % 60;

    // Форматируем строки с ведущими нулями для минут, секунд и миллисекунд
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    const millisecondsStr = String(milliseconds).padStart(3, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}:${millisecondsStr}`;
}

function getCommandLineArguments(){    
    const args = process.argv.slice(2);

    // Check if there are args    
    if (args.length > 0) {
        // Arguments provided by run-apps.sh script 
        // $start $end $url $filename
        return {
            startBlockNumber: args[0],
            endBlockNumber: args[1],
            nodeAddress: args[2],
            fileToSaveData:args[3]            
        };
    } else {
        console.log('Command Line Arguments have not been provided');
        const error = new Error('Command Line Arguments have not been provided');
        error.code = -1;
        throw error;
    }
}

module.exports = {
    pause,
    availableTokens,
    getCurrencySymbol,
    getTransactionsSignatures,
    getCurrencyAmount,
    extractTransactionInfo,
    extractTransactionInfo_2v,
    formatPerformanceTime,
    formatTimeWithMilliseconds,
    getNewStartBlockNumber,
    getCommandLineArguments
};