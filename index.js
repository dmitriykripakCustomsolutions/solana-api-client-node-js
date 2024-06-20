const { Connection, PublicKey } = require('@solana/web3.js');
const { Market } = require('@project-serum/serum');
const { BN } = require('bn.js');
const fs = require('fs');
const { TokenListProvider } = require('@solana/spl-token-registry');
const { pause, getTransactionsSignatures, extractTransactionInfo, formatPerformanceTime, formatTimeWithMilliseconds } = require('./utility.js');

const nodeAddress = 'https://cold-virulent-frost.solana-mainnet.quiknode.pro/57f32aded44aac31a70a1c25d6f8804943989421/'; 
const fileToSaveData = '//test.csv';
const startBlockNumber = 270508165;
const endBlockNumber = 270519983;

//Second sprint:
// 270699992:270690704 - 1-st.csv
// 270679991:270670410 - 2-nd.csv
// 270659990:270639990 - 3-rd.csv
// 270639989:270628228 - 4-th.csv
// 270619988:270609014 - 5-th.csv
// 270599987:270588059 - 6-th.csv
// 270579986:270569299 - 7-th.csv
// 270559985:270547847 - 8-th.csv
// 270539984:270527738 - 9-th.csv
// 270519983:270508165 - 10-th.csv


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