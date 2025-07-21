require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');
const { checkTrustline } = require('./utils/checkTrustline');

// Inputs
const sponsorSecret = process.env.SPONSOR_SECRET_KEY; // Sponsor secret
const userSecret = process.env.USER_SECRET_KEY;    // New user account secret
const referralSecret = process.env.REFERRAL_SECRET_KEY; // Referral account secret for sponsored trustlines

// Fail if not set
if (!sponsorSecret || !userSecret) {
  console.error('SPONSOR_SECRET_KEY and USER_SECRET_KEY must be set');
  process.exit(1);
}

// Check if referral secret is set (optional for account creation)
if (!referralSecret) {
  console.warn('⚠️ REFERRAL_SECRET_KEY not set - account creation with sponsored trustlines will not be available');
  process.exit(1);
}

const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);
const userKeypair = StellarSdk.Keypair.fromSecret(userSecret);
const referralKeypair = StellarSdk.Keypair.fromSecret(referralSecret);

const userPub = userKeypair.publicKey();
const sponsorPub = sponsorKeypair.publicKey();
const referralPub = referralKeypair.publicKey();

const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org'); // Use testnet if needed

const networkPassphrase = StellarSdk.Networks.PUBLIC; // or TESTNET

const USDC = new StellarSdk.Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' // USDC issuer
);

const EURC = new StellarSdk.Asset(
  'EURC',
  'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2' // EURC issuer
);

(async () => {
  // Step 1: Check if user account exists
  let userExists = false;
  let referralExists = false;
  
  try {
    await server.loadAccount(userPub);
    userExists = true;
    console.log(`Account ${userPub} already exists.`);
  } catch (e: any) {
    if (e instanceof StellarSdk.NotFoundError || e.response?.status === 404) {
      console.log(`Account ${userPub} does not exist.`);
    } else {
      console.error("Error checking user account existence:", e);
      return;
    }
  }

  // Step 2: Check if referral account exists
  try {
    await server.loadAccount(referralPub);
    referralExists = true;
    console.log(`Account ${referralPub} already exists.`);
  } catch (e: any) {
    if (e instanceof StellarSdk.NotFoundError || e.response?.status === 404) {
      console.log(`Account ${referralPub} does not exist.`);
    } else {
      console.error("Error checking referral account existence:", e);
      return;
    }
  }

  // If either account exists, exit
  if (userExists || referralExists) {
    console.log("❌ One or both accounts already exist. Cannot proceed with account creation.");
    return;
  }

  console.log("✅ Both accounts do not exist. Proceeding to create user account with sponsored trustlines.");

  const sponsorAccount = await server.loadAccount(sponsorPub);

  // Estimate 1 USDC cost in XLM on SDEX (could be done more accurately via pathfinding API)
  const minUSDC = '1.0000000';
  const maxXLM = '20.0000000'; // Safety upper bound

  const tx = new StellarSdk.TransactionBuilder(sponsorAccount, {
    fee: '300',
    networkPassphrase,
  })
  // REFERRAL ACCOUNT
    .addOperation(StellarSdk.Operation.beginSponsoringFutureReserves({
      sponsoredId: referralPub,
      source: sponsorPub,
    }))
    .addOperation(StellarSdk.Operation.createAccount({
      destination: referralPub,
      startingBalance: '0', // No XLM, all is sponsored
      source: sponsorPub,
    }))
    .addOperation(StellarSdk.Operation.changeTrust({
      asset: USDC,
      source: referralPub,
    }))
    .addOperation(StellarSdk.Operation.changeTrust({
      asset: EURC,
      source: referralPub,
    }))
    .addOperation(StellarSdk.Operation.endSponsoringFutureReserves({
      source: referralPub,
    }))
    
    // USER ACCOUNT
    .addOperation(StellarSdk.Operation.beginSponsoringFutureReserves({
      sponsoredId: userPub,
      source: sponsorPub,
    }))
    .addOperation(StellarSdk.Operation.createAccount({
      destination: userPub,
      startingBalance: '0', // No XLM, all is sponsored
      source: sponsorPub,
    }))
    
    .addOperation(StellarSdk.Operation.changeTrust({
      asset: USDC,
      source: userPub,
    }))
    .addOperation(StellarSdk.Operation.endSponsoringFutureReserves({
      source: userPub,
    }))
    // Step 2: Send 1 USDC to user
    .addOperation(StellarSdk.Operation.pathPaymentStrictReceive({
      sendAsset: StellarSdk.Asset.native(),   // XLM
      sendMax: maxXLM,                        // Maximum XLM to pay
      destination: userPub,
      destAsset: USDC,
      destAmount: minUSDC,                    // User receives exactly 1 USDC
      path: [],                               // No intermediary assets
      source: sponsorPub,
    }))
    .setTimeout(300)
    .build();

  // Sign with user and sponsor
  tx.sign(sponsorKeypair);
  tx.sign(userKeypair); // Required for changeTrust and endSponsoringFutureReserves
  tx.sign(referralKeypair); // Required for changeTrust and endSponsoringFutureReserves

  // Submit
  try {
    const result = await server.submitTransaction(tx);
    console.log("✅ Transaction successful:", result.hash);
  } catch (err) {
    console.error("❌ Transaction failed:", err);
  }
})();
