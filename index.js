const { Connection, PublicKey } = require('@solana/web3.js');
const { Market } = require('@project-serum/serum');
const { BN } = require('bn.js');
const fs = require('fs');
const { TokenListProvider } = require('@solana/spl-token-registry');
const { pause } = require('./utility.js');

const availableTokens = readTokenList();
const nodeAddress = 'https://light-greatest-moon.solana-mainnet.quiknode.pro/b4a3d6b2d17c7a5eeb1a4e35e4def07c586c53da/'; 
const fileToSaveData = '//Test.csv';
const startBlockNumber = 270499992;
const endBlockNumber = 270500002;

// 270699992:270679992 - 1-st.csv
// 270679991:270659991 - 2-nd.csv
// 270659990:270639990 - 3-rd.csv
// 270639989:270619989 - 4-th.csv
// 270619988:270599988 - 5-th.csv
// 270599987:270579987 - 6-th.csv
// 270579986:270559986 - 7-th.csv
// 270559985:270539985 - 8-th.csv
// 270539984:270519984 - 9-th.csv
// 270519983:270499992 - 10-th.csv



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

async function getBlocks(slotStartNumber, slotEndNumber) {
    isOperationSuccess = false;
    while(!isOperationSuccess){
        try{
        const connection = new Connection(nodeAddress);
        
        blocks = await connection.getBlocks(slotStartNumber, slotEndNumber);
        isOperationSuccess = true;
        return blocks;
        } catch(err){
            console.log('getBlocks error:\r\n' + err);
            if(err.message && err.message.indexOf('getaddrinfo ENOTFOUND') > -1){
                console.log('Internet connection is lost!!! Attempt to reconnect in 5 sec');
                pause(5000);
            }
        }
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

function getCurrencyAmount(instructionInfo){
    if(instructionInfo.tokenAmount){
        return instructionInfo.tokenAmount.uiAmountString || instructionInfo.tokenAmount.uiAmount 
        || convertToDecimal(instructionInfo.tokenAmount.amount, instructionInfo.tokenAmount.decimals);
    } else {
        return 'not specified';
    }
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

async function saveTransactionsData(slotStartNumber) {
    isOperationSuccess = false;
    while(!isOperationSuccess){
        try{
            const connection = new Connection(nodeAddress);
            // block = await connection.getBlock(slotStartNumber, { maxSupportedTransactionVersion: 0 });
            const start = performance.now(); 
            block = await connection.getParsedBlock(slotStartNumber, { maxSupportedTransactionVersion: 0 });
            const end = performance.now();
            const duration = end - start;
            spentTime = formatTimeWithMilliseconds(duration)
            console.log(`Get Block Request Time: ${spentTime}`)
            slotNumber = slotStartNumber
            if(block.transactions.length > 0) {
                csvData = '';                
                signatures = getTransactionsSignatures(block.transactions);
                if(signatures && signatures.length > 0){
                    block.transactions.forEach(transaction => {
                        if(signatures.indexOf(transaction.transaction.signatures[0]) > -1){
                            dataToSave = extractTransactionInfo(transaction, block, slotNumber);
                            csvData += `${dataToSave.slot},${dataToSave.operationDate},${dataToSave.transactionSignature},${dataToSave.soldCurrencySymbol},${dataToSave.soldCurrencyAmount},${dataToSave.boughtCurrencySymbol},${dataToSave.boughtCurrencyAmount}\n`;
                        }
                    });
                    addToCSV(csvData, slotNumber)
                }
            }

            // signatures = getTransactionsSignatures(block.transactions);
            // sliced = []
            // parsedTransactions = []
            // if(signatures.length > 200){

            //     for (let index = 0; index < Math.ceil(signatures.length / 200); index++) {
            //         sliced = signatures.slice(index * 200, (index + 1) * 200)
            //         let success = false;
            //         while(!success){
            //             try{
            //                 parsedTransactions = await connection.getParsedTransactions(sliced, 
            //                 { maxSupportedTransactionVersion: 0 });
            //                 success = true
            //             } catch(err){
            //                 console.log(err);
            //             }
            //         }
                    
            //         if(parsedTransactions.length > 0){
            //             csvData = '';
            //             slotNumber = ''
            //             parsedTransactions.forEach(transaction => {
            //                 dataToSave = extractTransactionInfo(transaction);
            //                 csvData += `${dataToSave.slot},${dataToSave.operationDate},${dataToSave.transactionSignature},${dataToSave.soldCurrencySymbol},${dataToSave.soldCurrencyAmount},${dataToSave.boughtCurrencySymbol},${dataToSave.boughtCurrencyAmount}\n`;
            //                 slotNumber = dataToSave.slot
            //             });
            //             addToCSV(csvData, slotNumber)
            //         }
            //     }
                
            // } else{
                // let success = false;
                    // while(!success){
                //         try{
                //             parsedTransactions = await connection.getParsedTransactions(signatures, 
                //             { maxSupportedTransactionVersion: 0 });
                //             success = true
                //         } catch(err){
                //             console.log(err);
                //         }
                //     // }
                // if(parsedTransactions.length > 0){
                //     csvData = '';
                //     slotNumber = ''
                //     parsedTransactions.forEach(transaction => {
                //         dataToSave = extractTransactionInfo(transaction);
                //         csvData += `${dataToSave.slot},${dataToSave.operationDate},${dataToSave.transactionSignature},${dataToSave.soldCurrencySymbol},${dataToSave.soldCurrencyAmount},${dataToSave.boughtCurrencySymbol},${dataToSave.boughtCurrencyAmount}\n`;
                //         slotNumber = dataToSave.slot
                //     });
                //     addToCSV(csvData, slotNumber)
                // }
            // }       
            isOperationSuccess = true;
        } catch(err){
            console.log(err);
            if(err.message && err.message.indexOf('getaddrinfo ENOTFOUND') > -1){
                console.log('Internet connection is lost!!! Attempt to reconnect in 5 sec');
                pause(5000);
            }
        }
    }
}

async function addToCSV(csvData, slotNumber) {
    try {
        fs.appendFileSync(__dirname + fileToSaveData, csvData, 'utf8');
        console.log(`Данные добавлены в файл ${fileToSaveData} для слота ${slotNumber}`);
    } catch (err) {
        console.error('Ошибка при добавлении данных в файл:', err);
    }
}

function fileExists(filePath) {
    return new Promise((resolve) => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                resolve(false); // Файл не существует
            } else {
                resolve(true); // Файл существует
            }
        });
    });
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

(async () => {
    try{
        filePath = __dirname + fileToSaveData;

        fileExists(filePath).then((exists) => {
            if (exists) {
                console.log(`Файл ${filePath} существует`);
            } else {
                fs.writeFileSync(filePath, 'slotNumber,operationDate,transactionSignature,soldCurrencySymbol,soldCurrencyAmount,boughtCurrencySymbol,boughtCurrencyAmount\r\n', 'utf8');
            }
        });

        const start = performance.now();                

        // Get Block
        // const connection = new Connection(nodeAddress);
        // connection.getAccountInfoAndContext
        // block = await connection.getBlock(271764469, { maxSupportedTransactionVersion: 0 });
        // console.log(block)

        // saveTransactionsData
        // saveTransactionsData(startBlockNumber);


        finalizedBlocksNumbers = await getBlocks(startBlockNumber, endBlockNumber);        

        if(finalizedBlocksNumbers.length > 0){
            try{
                for (let index = 0; index < finalizedBlocksNumbers.length; index++) {
                    blockNumber = finalizedBlocksNumbers[index];             
                    await saveTransactionsData(blockNumber)
                }
            } catch(err){
                console.log(err);
            }
        }
        const end = performance.now();
        const duration = end - start;
        spentTime = formatPerformanceTime(duration)

        fs.appendFileSync(__dirname + fileToSaveData, `Time spent: ${spentTime}\r\n`, 'utf8');

    } catch(err){
        console.log(err)        
    }

})();