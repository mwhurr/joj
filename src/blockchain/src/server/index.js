import * as Actions from './actions'
import * as Codes from './codes'
import Blockchain from '../data/Blockchain'
import BitcoinService from '../service/BitcoinService'
import Funds from '../data/Funds'
import Key from '../data/Key'
import Money from '../data/Money'
import Transaction from '../data/Transaction'
import Wallet from '../data/Wallet'
import WebSocket from 'websocket'
import canned_transactions from './canned_transactions'
import http from 'http'
import sync from './sync'

process.title = 'blockchain-server'

const { server: WebSocketServer } = WebSocket

const httpServer = http.createServer((request, response) => {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
  console.log(new Date() + ' Received request for ' + request.url)
  response.writeHead(404)
  response.end()
})

httpServer.listen(1337)

// create the server
const wsServer = new WebSocketServer({ httpServer })

// WebSocket server
wsServer.on('request', request => {
  const connection = request.accept(null, request.origin)
  console.log('Connection opened with blockchain explorer!')
  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', async message => {
    if (message.type === 'utf8') {
      processRequest(connection, JSON.parse(message.utf8Data))
      // process WebSocket message
      // console.log('Connection opened with server!', action)
    }
  })

  connection.on('close', connection => {
    // close user connection
    console.log('Connection closed by client!')
  })
})

// Collect all transactions in blockchain and mine them into a new block
async function mineBlocks (ledger) {
  if (ledger.countPendingTransactions() === 0) {
    console.log(`No pending transactions have been created`)
    return null
  }
  console.log(
    `Begin mining blocks: Bitcoin Ledger has ${ledger.height()} blocks`
  )

  // Emulate a miner node performing the work
  const miner = Wallet(Key('miner-public.pem'), Key('miner-private.pem'))

  // Mine a block with all pending transactions, after mining the reward is BTC 100 for next miner
  const newBlock = await BitcoinService.minePendingTransactions(
    ledger,
    miner.address
  )
  console.log('New block mined' + newBlock.hash)
  console.log(
    `End block mining period: Blockchain has ${ledger.height()} blocks`
  )
  return newBlock
}

// Create new chain
const LEDGER = Blockchain.init()

// Start the sync loop
sync(LEDGER).subscribe(mineBlocks)

async function processRequest (connection, req) {
  switch (req.action) {
    case Actions.START: {
      connection.sendUTF(
        JSON.stringify({
          status: 'Success',
          payload: { actions: [Actions.NEW_TRANSACTION, Actions.VALIDATE_BC] }
        })
      )
      break
    }
    case Actions.NEW_TRANSACTION: {
      console.log('Simulating new random transaction')
      const details =
        canned_transactions[
          Math.floor(Math.random() * canned_transactions.length)
        ]
      displayTransaction(details)
      const from = Wallet(
        Key(`${details.from}-public.pem`),
        Key(`${details.from}-private.pem`)
      )
      const to = Wallet(
        Key(`${details.to}-public.pem`),
        Key(`${details.to}-private.pem`)
      )
      const tx = Transaction(
        from.address,
        to.address,
        Funds(Money('₿', details.amount))
      )
      tx.signature = tx.generateSignature(from.privateKey)
      LEDGER.addPendingTransaction(tx)

      connection.sendUTF(
        JSON.stringify({
          status: 'Success',
          payload: {
            tx: tx.calculateHash(),
            actions: [Actions.NEW_TRANSACTION, Actions.VALIDATE_BC]
          }
        })
      )
      break
    }
    case Actions.VALIDATE_BC: {
      console.log(`Validating blockchain with ${LEDGER.height()} blocks`)
      const isValid = await BitcoinService.isChainValid(LEDGER)
      connection.sendUTF(
        JSON.stringify({
          status: 'Success',
          payload: {
            result: !!isValid,
            actions: [Actions.NEW_TRANSACTION, Actions.VALIDATE_BC]
          }
        })
      )
      break
    }
    default: {
      const msg = `Unspecified action ${req.action}`
      console.log(msg)
      connection.sendUTF(
        JSON.stringify({
          status: Codes.SUCCESS,
          action: req.action,
          payload: { actions: Object.keys(Actions) }
        })
      )
    }
  }
}

function displayTransaction ({ from, to, amount }) {
  console.log(`Transaction from: ${from} to: ${to} with amount: ${amount}`)
}
