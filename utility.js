const { readTokenList, getLastEntries } = require('./file-utilities.js');
const Decimal = require('decimal.js');

const availableTokens = readTokenList();
const RAYDIUM_OWNER = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

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

function extractTransactionInfo_Dimas(transaction, block_time, slotNumber) {
    try{
        transaction_id = transaction['transaction']['signatures'][0];
        meta = transaction['meta'] ?? undefined;
        
        if(!meta){
            return '';
        }

        post_balances = meta['postTokenBalances'] ?? undefined;
        pre_balances = meta['preTokenBalances'] ?? undefined;

        post_balance = process_post_balances(post_balances, transaction_id)
        if(!post_balance){
            return '';
        }
        
        pre_balance = process_pre_balances(pre_balances, post_balance)
        if(!pre_balance){
            return '';
        }

        if (equal_diffs(post_balance, pre_balance)){

            return fromResultData(transaction_id, block_time, slotNumber, post_balance, pre_balance)

        } else{
            return '';
        }

    } catch(err){
        console.log(err)
    }
}

function fromResultData(transaction_id, block_time, slotNumber, post_balance, pre_balance){
    trader = post_balance['trader']['id'];
    timestamp = block_time.toString();
    coin_address = '';

    for (let i = 0; i < post_balance.pool.mints.length; i++) {
        if(post_balance.pool.mints[i] !== SOL_MINT){
            coin_address = post_balance.pool.mints[i];
        }
    }

    sol_amt_before = pre_balance['pool']['amounts'][SOL_MINT];
    sol_amt_after = post_balance['pool']['amounts'][SOL_MINT];
    coin_amt_before = pre_balance['pool']['amounts'][coin_address];
    coin_amt_after = post_balance['pool']['amounts'][coin_address];

    return `${slotNumber}, ${timestamp}, ${transaction_id}, ${trader}, ${coin_address}, ${sol_amt_before}, ${sol_amt_after}, ${coin_amt_before}, ${coin_amt_after}\r\n`;
}

function process_post_balances(post_balances) {
    if (post_balances.length === 0)
        return undefined;

    pool_mints = [];
    pool_amounts = {};
    trader_mints = [];
    trader_amounts = {};
    trader = '';

    for (let i = 0; i < post_balances.length; i++) {
        if(i === 0){
            trader = post_balances[i].owner;
            trader_mints.push(post_balances[i].mint);
            trader_amounts[post_balances[i].mint] = new Decimal(post_balances[i].uiTokenAmount.uiAmountString);
        } else {
            if(post_balances[i].owner === trader){
                trader_mints.push(post_balances[i].mint)
                trader_amounts[post_balances[i].mint] = new Decimal(post_balances[i].uiTokenAmount.uiAmountString);
            } else if (post_balances[i].owner === RAYDIUM_OWNER){
                pool_mints.push(post_balances[i].mint)
                pool_amounts[post_balances[i].mint] = new Decimal(post_balances[i].uiTokenAmount.uiAmountString);
            }
        }        
    }

    if(pool_mints.findIndex(_ => _ === SOL_MINT) < 0){
        return undefined;
    }

    if(trader_mints.length > 2){
        return undefined;
    }

    is_trader_mints_out = false;
    for (let i = 0; i < trader_mints.length; i++) {
        if(pool_mints.findIndex(_ => _ === trader_mints[i]) < 0){
            is_trader_mints_out = true;
        }
    }

    if(is_trader_mints_out){
        return undefined;
    }

    result = {'trader': {'id': trader, 'mints': trader_mints, 'amounts': trader_amounts},
              'pool': {'mints': pool_mints, 'amounts': pool_amounts}}
    return result
}

function process_pre_balances(pre_balances, post_balance){
    if(pre_balances.length === 0){
        return undefined;
    }

    pool_mints = []
    pool_amounts = {}
    trader_mints = []
    trader_amounts = {}
    trader = post_balance.trader.id;
    
    for (let i = 0; i < pre_balances.length; i++) {
        balance = pre_balances[i];
        if (balance['owner'] == trader){
            trader_mints.push(balance['mint'])
            trader_amounts[balance['mint']] = new Decimal(balance.uiTokenAmount.uiAmountString);
        } else if (balance['owner'] == RAYDIUM_OWNER) {
            pool_mints.push(balance['mint'])
            pool_amounts[balance['mint']] = new Decimal(balance.uiTokenAmount.uiAmountString);
        }
    }
    
    if(pool_mints.findIndex(_ => _ === SOL_MINT) < 0){
        return undefined;
    }

    result = {'trader': {'id': trader, 'mints': trader_mints, 'amounts': trader_amounts},
              'pool': {'mints': pool_mints, 'amounts': pool_amounts}}
    return result
}

function equal_diffs(_post_balance, _pre_balance){

    pool_diffs = get_pool_diffs(_post_balance, _pre_balance)

    if (pool_diffs.length === 0){
        return false;
    }

    sol_diff = false;
    coin_diff = false;
    sol_diff_sign = 1;
    coin_diff_sign = 1;
    
    //Object.keys
    Object.keys(pool_diffs).forEach(mint => {
        if(mint === SOL_MINT){
            if (pool_diffs[mint] !== 0){
                sol_diff = true;
                sol_diff_sign = pool_diffs[mint] > 0 ? 1 : -1;
            }
        } else {
            if (pool_diffs[mint] !== 0){
                coin_diff = true;
                coin_diff_sign = pool_diffs[mint] > 0 ? 1 : -1;
            }     
        }
    });

    if(!sol_diff || !coin_diff){
        return false;
    }

    if ((coin_diff_sign * sol_diff_sign) > 0){
        return false;
    }

    trader_diffs = get_trader_diffs(_post_balance, _pre_balance)

    is_equal_diffs = true;
    
    Object.keys(pool_diffs).forEach(mint => {
        trader_diffs_mint = trader_diffs[mint] ? trader_diffs[mint] : 0;
        trader_diffs_mint_negated = new Decimal(trader_diffs_mint).negated();
        if(!new Decimal(pool_diffs[mint]).equals(trader_diffs_mint_negated)){
            if (mint !== SOL_MINT && trader_diffs_mint !== 0){
                is_equal_diffs = false;
            }
        }
    });

    return is_equal_diffs;
}

function get_pool_diffs(post_balance, pre_balance){
    result = {}

    for (let i = 0; i < post_balance.pool.mints.length; i++) {
        mint = post_balance.pool.mints[i];
        amounts = pre_balance.pool.amounts;
        pre_value = amounts[mint] ? amounts[mint] : -1;

        if (pre_value < 0){
            return result;
        }

        diff = new Decimal(post_balance.pool.amounts[mint]).minus(new Decimal(pre_value));
        if (diff != 0){
            result[mint] = diff
        }
    }

    return result;
}    

function get_trader_diffs(post_balance, pre_balance){
    result = {};
    for (let i = 0; i < post_balance.trader.mints.length; i++) {
        mint = post_balance.trader.mints[i];
        amounts = pre_balance.trader.amounts;
        pre_value = amounts[mint] ? amounts[mint] : 0;
        result[mint] = new Decimal(post_balance.trader.amounts[mint]).minus(new Decimal(pre_value));
    }

    return result
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
    extractTransactionInfo_Dimas,
    formatPerformanceTime,
    formatTimeWithMilliseconds,
    getNewStartBlockNumber,
    getCommandLineArguments
};