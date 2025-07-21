require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const USDC = new StellarSdk.Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' // USDC issuer
);

const EURC = new StellarSdk.Asset(
  'EURC',
  'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' // EURC issuer
);

const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');

export async function checkUserBalances(userAddress: string) {
  try {
    console.log(`🔍 Checking balances for account: ${userAddress}`);
    
    // Load account details
    const account = await server.loadAccount(userAddress);
    
    // Get XLM balance
    const xlmBalance = account.balances.find((balance: any) => balance.asset_type === 'native');
    console.log(`💰 XLM Balance: ${xlmBalance ? xlmBalance.balance : '0'} XLM`);
    
    // Get USDC balance
    const usdcBalance = account.balances.find((balance: any) => 
      balance.asset_type === 'credit_alphanum4' && 
      balance.asset_code === 'USDC' && 
      balance.asset_issuer === USDC.issuer
    );
    console.log(`💵 USDC Balance: ${usdcBalance ? usdcBalance.balance : '0'} USDC`);
    
    // Get EURC balance
    const eurcBalance = account.balances.find((balance: any) => 
      balance.asset_type === 'credit_alphanum4' && 
      balance.asset_code === 'EURC' && 
      balance.asset_issuer === EURC.issuer
    );
    console.log(`💶 EURC Balance: ${eurcBalance ? eurcBalance.balance : '0'} EURC`);
    
    console.log(''); // Empty line for readability
    
    return {
      xlm: xlmBalance ? xlmBalance.balance : '0',
      usdc: usdcBalance ? usdcBalance.balance : '0',
      eurc: eurcBalance ? eurcBalance.balance : '0'
    };
    
  } catch (error: any) {
    if (error instanceof StellarSdk.NotFoundError || error.response?.status === 404) {
      console.log(`❌ Account ${userAddress} does not exist.`);
      return null;
    } else {
      console.error(`❌ Error checking balances for ${userAddress}:`, error.message);
      throw error;
    }
  }
}

// Standalone function to check balances from command line
export async function checkBalances() {
  const userSecret = process.env.USER_SECRET_KEY;
  
  if (!userSecret) {
    console.error('USER_SECRET_KEY must be set');
    process.exit(1);
  }
  
  const userKeypair = StellarSdk.Keypair.fromSecret(userSecret);
  const userAddress = userKeypair.publicKey();
  
  console.log('📊 Checking User Account Balances');
  console.log('================================');
  
  await checkUserBalances(userAddress);
}

// Run if called directly
if (require.main === module) {
  checkBalances().catch(console.error);
} 