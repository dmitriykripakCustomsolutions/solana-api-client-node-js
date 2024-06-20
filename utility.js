function pause(milliseconds) {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
        // Do nothing
    }
}

const availableTokens = readTokenList();

async function saveTokenList() {
    const tokenProvider = new TokenListProvider();
    const tokenList = await tokenProvider.resolve();
    // const filteredtokens = tokenList.filterByClusterSlug('mainnet-beta').getList();
    const tokens = tokenList.getList();

    mappedTokens = tokens.map(token => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
    }));

    const jsonData = JSON.stringify(mappedTokens, null, 2);

    fs.writeFileSync(__dirname + '//tokens.json', jsonData, 'utf8');

    return mappedTokens;
}

function readTokenList() {
    try {
        // Чтение файла
        const data = fs.readFileSync(__dirname + '//tokens.json', 'utf8');
        // Преобразование строки в массив JSON объектов
        const jsonArray = JSON.parse(data);
        return jsonArray;
    } catch (err) {
        console.error('Ошибка при чтении или парсинге файла:', err);
        return null;
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

module.exports = {
    pause,
    availableTokens,
    saveTokenList,
    readTokenList,
    getCurrencySymbol,
    getTransactionsSignatures,
    getCurrencyAmount,
    extractTransactionInfo,
    formatPerformanceTime,
    formatTimeWithMilliseconds
};