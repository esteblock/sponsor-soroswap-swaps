import { SoroswapSDK, SupportedAssetLists, SupportedProtocols, TradeType, SupportedPlatforms} from '@soroswap/sdk'
import { Keypair, TransactionBuilder, Networks, FeeBumpTransaction, Transaction} from '@stellar/stellar-sdk'
import { config } from 'dotenv'
import { checkUserBalances } from './utils/checkBalances'

config()

// Asset contract addresses from the asset list
const USDC_CONTRACT = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75'
const EURC_CONTRACT = 'CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV'

// API configuration
const API_BASE_URL = process.env.SOROSWAP_API_URL
const API_KEY = process.env.SOROSWAP_API_KEY

// Get private keys from environment
const SPONSOR_SECRET = process.env.SPONSOR_SECRET_KEY
const USER_SECRET = process.env.USER_SECRET_KEY
const REFERRAL_SECRET = process.env.REFERRAL_SECRET_KEY

// Fail if secret not set
if (!SPONSOR_SECRET || !USER_SECRET || !REFERRAL_SECRET) {
  console.error('SPONSOR_SECRET_KEY, USER_SECRET_KEY, and REFERRAL_SECRET_KEY must be set');
  process.exit(1);
}

// Calculate addresses from private keys
let sponsorKeypair: Keypair = Keypair.fromSecret(SPONSOR_SECRET)
let userKeypair: Keypair = Keypair.fromSecret(USER_SECRET)          
let sponsorAddress: string = sponsorKeypair.publicKey()
let userAddress: string = userKeypair.publicKey()
let referralKeypair: Keypair = Keypair.fromSecret(REFERRAL_SECRET)
let referralAddress: string = referralKeypair.publicKey()

// Fail if not set
if (!API_BASE_URL || !API_KEY) {
  console.error('SOROSWAP_API_URL and SOROSWAP_API_KEY must be set');
  process.exit(1);
}

// Initialize Soroswap SDK
const soroswapSdk = new SoroswapSDK({
  apiKey: API_KEY,
  baseUrl: API_BASE_URL
})

async function main() {
  try {
    console.log(`🔑 Using Sponsor Address: ${sponsorAddress}`)
    console.log('')
    console.log(`👤 Using User Address: ${userAddress}`)
    console.log('🚀 Starting USDC to EURC EXACT IN swap with ALL protocols...')
    console.log('📊 User wants to swap exactly 0.1 USDC to EURC')
    console.log('🔄 Using protocols: SDEX, Soroswap, Phoenix, Aqua')
    console.log('⛽ Gas sponsored by sponsor account')
    console.log('🔍 Will automatically detect protocol and use appropriate signing method')
    
    // Check balances before the swap
    console.log('')
    console.log('📊 BALANCES BEFORE SWAP:')
    console.log('========================')
    const balancesBefore = await checkUserBalances(userAddress)
    
    const quoteRequest = {
        assetIn: USDC_CONTRACT,
        assetOut: EURC_CONTRACT,
        amount: BigInt(1000000), // 0.1 USDC in stroops (7 decimals) - EXACT IN
        tradeType: TradeType.EXACT_IN,
        protocols: [SupportedProtocols.SDEX, SupportedProtocols.SOROSWAP, SupportedProtocols.PHOENIX, SupportedProtocols.AQUA], // All protocols
        slippageBps: 50, // 0.5% slippage
        maxHops: 3, // Allow more hops for better routing across protocols
        feeBps: 200, // 2% fee
        assetList: [SupportedAssetLists.SOROSWAP]
      }

    console.log('Quote Request:', quoteRequest)
      
    // Get the quote from Soroswap SDK
    const quote = await soroswapSdk.quote(quoteRequest)

    console.log('')
    console.log('Quote Response:', quote)
    
    // Detect the protocol used from the quote
    const usedProtocol = (quote as any).protocol || 'Unknown'
    console.log('')
    console.log(`🔍 Detected protocol: ${usedProtocol}`)
    
    // Now build the transaction XDR
    console.log('')
    console.log('The user accepts the quote. Now we call the /build endpoint to build the transaction XDR...')
    
    const buildRequest = {
      quote: quote,
      sponsor: sponsorAddress, // Sponsor address for gasless swap
      from: userAddress, // User address
      to: userAddress, // Same as from
      referralId: referralAddress, 
    }
    
    console.log('Build Request:', JSON.stringify(buildRequest, null, 2))
    
    // Build the transaction XDR
    const buildResponse = await soroswapSdk.build(buildRequest)

    console.log('')
    console.log('Build Response:', buildResponse)
    
    const swapTransaction = TransactionBuilder.fromXDR(buildResponse.xdr, Networks.PUBLIC)
   
    let signedTransaction: Transaction | FeeBumpTransaction
    if (quote.platform === SupportedPlatforms.SDEX) {
      console.log("Using SDEX method")
      // SDEX method: Both user and sponsor sign the same transaction
      swapTransaction.sign(userKeypair)
      swapTransaction.sign(sponsorKeypair)
      signedTransaction = swapTransaction as Transaction
    } else {
      console.log("Using Soroban method")
      // Soroban method: User signs, then wrap in FeeBumpTransaction, sponsor signs
      swapTransaction.sign(userKeypair)
      const feeBumpTransaction: FeeBumpTransaction =
        TransactionBuilder.buildFeeBumpTransaction(
          sponsorAddress, // The new tx will be paid by the sponsor
          swapTransaction.fee, // New fee needs to be higher
          swapTransaction as Transaction, // Tx signed by the user
          Networks.PUBLIC
        );
      feeBumpTransaction.sign(sponsorKeypair)
      signedTransaction = feeBumpTransaction as FeeBumpTransaction
    }
    console.log("Signed Transaction:", signedTransaction.toXDR())
    // Submit the transaction to the network
    const sendResponse = await soroswapSdk.send(signedTransaction.toXDR())
    console.log('Send Response:', sendResponse)

    console.log('')
    console.log('The transaction has been submitted to the network!')
    
    // Wait a moment for the transaction to be processed
    console.log('')
    console.log('⏳ Waiting for transaction to be processed...')
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    
    // Check balances after the swap
    console.log('')
    console.log('📊 BALANCES AFTER SWAP:')
    console.log('=======================')
    const balancesAfter = await checkUserBalances(userAddress)
    
    // Show balance changes
    if (balancesBefore && balancesAfter) {
      console.log('')
      console.log('📈 BALANCE CHANGES:')
      console.log('==================')
      const usdcChange = parseFloat(balancesAfter.usdc) - parseFloat(balancesBefore.usdc)
      const eurcChange = parseFloat(balancesAfter.eurc) - parseFloat(balancesBefore.eurc)
      const xlmChange = parseFloat(balancesAfter.xlm) - parseFloat(balancesBefore.xlm)
      
      console.log(`💵 USDC Change: ${usdcChange >= 0 ? '+' : ''}${usdcChange.toFixed(7)} USDC`)
      console.log(`💶 EURC Change: ${eurcChange >= 0 ? '+' : ''}${eurcChange.toFixed(7)} EURC`)
      console.log(`💰 XLM Change: ${xlmChange >= 0 ? '+' : ''}${xlmChange.toFixed(7)} XLM`)
      
      // Calculate and show the effective exchange rate
      if (Math.abs(usdcChange) > 0 && eurcChange > 0) {
        const exchangeRate = eurcChange / Math.abs(usdcChange)
        console.log(`💱 Effective Exchange Rate: ${exchangeRate.toFixed(6)} EURC per USDC`)
      }
    }

  } catch (error: any) {
    console.error('💥 Error occurred:', error.message)
    console.error('Error details:', error)
    if (error.response) {
      console.error('Response data:', error.response.data)
      console.error('Response status:', error.response.status)
    }
    process.exit(1)
  }
}

// Run the main function
main().catch(console.error) 