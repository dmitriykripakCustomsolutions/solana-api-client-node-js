const WebSocket = require('ws');
const { Connection, PublicKey } = require('@solana/web3.js');

try{
    const nodeAddress = 'https://cold-virulent-frost.solana-mainnet.quiknode.pro/57f32aded44aac31a70a1c25d6f8804943989421/'; 
    const ownerAddress = 'So11111111111111111111111111111111111111112';
    const connection = new Connection(nodeAddress);
    // filter: 
    // TokenAccountsFilter = {
    //     mint: PublicKey;
    // } | {
    //     programId: PublicKey;
    // };
    filter = {mint: ownerAddress}
    const account = connection.getTokenAccountsByOwner(ownerAddress, filter);
    console.log(account);
} catch(err){
    console.log(err);
}

// URL для подключения к WebSocket серверу Solana
// const solanaWebSocketUrl = 'wss://ultra-damp-season.solana-mainnet.quiknode.pro/2af57532b29cb63e468e9b2104fa6e0c1b2147aa/';

// // Публичный ключ вашего токена
// const publicKey = 'So11111111111111111111111111111111111111112';

// const ws = new WebSocket(solanaWebSocketUrl);

// ws.on('open', function open() {
//   console.log('Connected to Solana WebSocket');

//   // Отправляем запрос на подписку на обновления по публичному ключу
//   const message = JSON.stringify({
//     type: 'subscribe',
//     pubkey: publicKey,
//     commitment: 'confirmed', // или 'processed'
//     value: 'base64', // 'jsonParsed' или 'base64'
//   });
  
//   ws.send(message);
// });

// ws.on('message', function incoming(data) {
//   // Обрабатываем входящие данные
//   console.log('Received:', data);
// });

// ws.on('close', function close() {
//   console.log('Disconnected from Solana WebSocket');
// });

// ws.on('error', function error(err) {
//   console.error('WebSocket error:', err.message);
// });