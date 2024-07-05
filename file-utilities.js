const fs = require('fs');
const util = require('util');
const readLastLines = require('read-last-lines');

const access = util.promisify(fs.access);
const COUNT_OF_HEADERS = 9;

async function checkIfFileExist(filePath) {
    try {
        await access(filePath, fs.constants.F_OK);
        return true; // Файл существует
    } catch (err) {
        if(err.code && err.code === "ENOENT"){
            return false; // Файл не существует
        } else{
            const error = new Error('File existence check error');
            error.code = -1;
            throw error;
        }
    }
}

async function getLastEntries(filePath){
    lastLines = await readLastLinesOfExistingFile(filePath)
    
    return parseLinesToObjects(lastLines);
}

async function readLastLinesOfExistingFile(filePath){
    try {
        const lines = await readLastLines.read(filePath, 10);
        return lines;
      } catch (error) {
        throw new Error('Error reading file: ' + error.message);
      }
}

function parseLinesToObjects(lines) {
    const results = [];
    const linesArray = lines.split('\r\n').filter(line => line.trim() !== ''); // Разделение на строки и фильтрация пустых строк
  
    for (const line of linesArray) {
      const data = line.split(','); // Предполагая, что поля разделены запятыми
      
      if(data && data.length === COUNT_OF_HEADERS && !isNaN(data[0])){
        const record = {
            slotNumber: parseInt(data[0]),
            operationDate: data[1],
            transactionSignature: data[2],
            soldCurrencySymbol: data[3],
            soldCurrencyAmount: parseFloat(data[4]),
            boughtCurrencySymbol: data[5],
            boughtCurrencyAmount: parseFloat(data[6]),
        };
    
        results.push(record);
    }
    }
  
    return results;
  }

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

module.exports = {
    readLastLinesOfExistingFile,
    checkIfFileExist,
    saveTokenList,
    readTokenList,
    getLastEntries
};