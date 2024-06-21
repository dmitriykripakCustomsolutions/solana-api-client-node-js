const { readTokenList, getLastEntries } = require('./file-utilities.js');

const availableTokens = readTokenList();

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
        extractedInfo.operationDate = block.blockTime ? new Date(block.blockTime * 1000) : 'no date';
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

function getNewStartBlockNumber(filePath){
    lastEntries = getLastEntries(filePath)
    slotNumber = undefined
    if(lastEntries && lastEntries.length > 0){
        for (const entry of lastEntries) {
            if(entry.slotNumber){
                slotNumber = entry.slotNumber
            }
            break;
        }
        
        return slotNumber;
    }

    return slotNumber;
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
    formatPerformanceTime,
    formatTimeWithMilliseconds,
    getNewStartBlockNumber,
    getCommandLineArguments
};