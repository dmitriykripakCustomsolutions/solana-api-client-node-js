const { Connection, PublicKey } = require('@solana/web3.js');
const { Market } = require('@project-serum/serum');
const { BN } = require('bn.js');
const fs = require('fs');
const { TokenListProvider } = require('@solana/spl-token-registry');
const { 
        pause,
        getTransactionsSignatures,
        extractTransactionInfo,
        extractTransactionInfo_Dimas,
        formatPerformanceTime,
        formatTimeWithMilliseconds,
        getNewStartBlockNumber,
        getCommandLineArguments
     } = require('./utility.js');
const { checkIfFileExist, readLastLinesOfExistingFile } = require('./file-utilities.js');     
const { exit } = require('process');
const { time } = require('console');


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
                // signatures = getTransactionsSignatures(block.transactions);
                // if(signatures && signatures.length > 0){
                    block.transactions.forEach(transaction => {
                        // if(signatures.indexOf(transaction.transaction.signatures[0]) > -1){
                            // dataToSave = extractTransactionInfo(transaction, block, slotNumber);

                            if(transaction.meta && transaction.meta['err']){
                                return;
                            }

                            csvData += extractTransactionInfo_Dimas(transaction, block.blockTime, slotNumber);
                            
                            // if(dataToSave && dataToSave.transactionSignature && dataToSave.soldCurrencySymbol && dataToSave.soldCurrencyAmount && dataToSave.boughtCurrencySymbol && dataToSave.boughtCurrencyAmount){
                            //     csvData += `${dataToSave.slot},${dataToSave.operationDate},${dataToSave.transactionSignature},${dataToSave.soldCurrencySymbol},${dataToSave.soldCurrencyAmount},${dataToSave.boughtCurrencySymbol},${dataToSave.boughtCurrencyAmount}\r\n`;
                            // }
                        // }
                    });
                    addToCSV(csvData, slotNumber)
                // }
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
        fs.appendFileSync(fileToSaveData, csvData, 'utf8');
        console.log(`Данные добавлены в файл ${fileToSaveData} для слота ${slotNumber}`);
    } catch (err) {
        console.error('Ошибка при добавлении данных в файл:', err);
    }
}

// Entry Point
(async () => {
    try{

        // const connection = new Connection("https://icy-quick-liquid.solana-mainnet.quiknode.pro/adc8831ac93026d837c40ff92282f4120a9bb6ef/");
        // block = await connection.getBlock(271764298, { maxSupportedTransactionVersion: 0 });
        // console.log(block);
        //commandLineArgs e.g. startBlockNumber: args[0],
        // endBlockNumber: args[1],
        // nodeAddress: args[2],
        // fileToSaveData:args[3]       

        
        
        // block = await connection.getBlock(slotStartNumber, { maxSupportedTransactionVersion: 0 });

        commandLineArgs = getCommandLineArguments();

        fileToSaveData = __dirname + "//"+ commandLineArgs.fileToSaveData;
        startBlockNumber = parseInt(commandLineArgs.startBlockNumber);
        endBlockNumber = parseInt(commandLineArgs.endBlockNumber);
        nodeAddress = commandLineArgs.nodeAddress; 

        isFileExist = await checkIfFileExist(fileToSaveData);

        if(isFileExist){
            console.log(`${commandLineArgs.fileToSaveData} file exist`)
            //In case if program has been broken and we launch it again
            //it needs to update startBlockNumber
            //considering already read and written data
            
            newStartBlockNumber = await  getNewStartBlockNumber(fileToSaveData);
            if(newStartBlockNumber){
                startBlockNumber = newStartBlockNumber + 1;
            } 
            if(newStartBlockNumber === endBlockNumber){
                //Means all the blocks info already in the file
                console.log(`Everything is in the ${commandLineArgs.fileToSaveData} file`)
                exit()
            }
        } else {
            console.log(`${commandLineArgs.fileToSaveData} file doesn't exist`)
            // fs.writeFileSync(fileToSaveData, 'slotNumber,operationDate,transactionSignature,soldCurrencySymbol,soldCurrencyAmount,boughtCurrencySymbol,boughtCurrencyAmount\r\n', 'utf8');
            fs.writeFileSync(fileToSaveData, 'slotNumber, timestamp, transaction_id, trader, coin_address, sol_amt_before, sol_amt_after, coin_amt_before, coin_amt_after\r\n', 'utf8');
        }

        const start = performance.now();                

        finalizedBlocksNumbers = await getBlocks(startBlockNumber, endBlockNumber);        

        console.log(`Counts of blocks for ${commandLineArgs.fileToSaveData} file : ${finalizedBlocksNumbers?.length}`)

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

        fs.appendFileSync(fileToSaveData, `Time spent: ${spentTime}\r\n`, 'utf8');

    } catch(err){
        console.log(err)        
    }

})();