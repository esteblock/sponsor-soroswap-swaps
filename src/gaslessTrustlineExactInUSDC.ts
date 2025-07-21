import { GaslessTrustlineType, SoroswapSDK, SupportedAssetLists, SupportedProtocols, TradeType } from '@soroswap/sdk'
import { Keypair, TransactionBuilder, Networks} from '@stellar/stellar-sdk'
import { config } from 'dotenv'

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
  console.error('SPONSOR_SECRET_KEY and USER_SECRET_KEY and REFERRAL_SECRET_KEY must be set');
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
    console.log('🚀 Starting gasless USDC to EURC swap...')
    console.log('📊 User wants to swap 0.5 USDC for EURC with gasless trustline')
    

    const quoteRequest = {
        assetIn: USDC_CONTRACT,
        assetOut: EURC_CONTRACT,
        amount: BigInt(5000000), // 0.5 USDC in stroops (7 decimals)
        tradeType: TradeType.EXACT_IN,
        protocols: [SupportedProtocols.SDEX, SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA, SupportedProtocols.PHOENIX], // For gasless trustline, we need to use SDEX. 
        slippageBps: 50, // 0.5% slippage
        maxHops: 2,
        gaslessTrustline: GaslessTrustlineType.CREATE, // Enable gasless trustline creation
        feeBps: 200, // 2% fee
        assetList: [SupportedAssetLists.SOROSWAP]
      }

    console.log('Quote Request:', quoteRequest)
      
    // Get the quote from Soroswap SDK
    const quote = await soroswapSdk.quote(quoteRequest)

    console.log('')
    console.log('Quote Response:', quote)
    

       // Now build the transaction XDR
    console.log('')
    console.log('The user accepts the quote. Now we call the /build endpoint to build the transaction XDR...')
    
    
    const buildRequest = {
      quote: quote,
      sponsor: sponsorAddress, // Sponsor address for gasless trustline
      from: userAddress, // User address
      to: userAddress, // For gasless trustline, to must be same as from
      referralId: referralAddress, 
    }
    
    console.log('Build Request:', JSON.stringify(buildRequest, null, 2))
    
    // Build the transaction XDR
    const buildResponse = await soroswapSdk.build(buildRequest)

    console.log('')
    console.log('Build Response:', buildResponse)
    
    const swapTransaction = TransactionBuilder.fromXDR(buildResponse.xdr, Networks.PUBLIC)
    
    console.log('')
    console.log('The sponsor signs the transaction...')
    swapTransaction.sign(sponsorKeypair)

    console.log('')
    console.log('The user signs the transaction...')
    swapTransaction.sign(userKeypair)
    console.log('')
    console.log('We submit the transaction to the network using the /send endpoint...')
    const sendResponse = await soroswapSdk.send(swapTransaction.toXDR())
    console.log('')
    console.log('Send Response:', sendResponse)

    console.log('')
    console.log('The transaction has been submitted to the network!')

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
