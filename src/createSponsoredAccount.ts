require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');
const { checkTrustline } = require('./utils/checkTrustline');

// Inputs
const sponsorSecret = process.env.SPONSOR_SECRET_KEY; // Sponsor secret
const userSecret = process.env.USER_SECRET_KEY;    // New user account secret

// Fail if not set
if (!sponsorSecret || !userSecret) {
  console.error('SPONSOR_SECRET_KEY and USER_SECRET_KEY must be set');
  process.exit(1);
}

const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);
const userKeypair = StellarSdk.Keypair.fromSecret(userSecret);

const userPub = userKeypair.publicKey();
const sponsorPub = sponsorKeypair.publicKey();

const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org'); // Use testnet if needed

const networkPassphrase = StellarSdk.Networks.PUBLIC; // or TESTNET

const USDC = new StellarSdk.Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' // Replace with real USDC issuer on your network
);

(async () => {
  // Step 1: Check if user account exists
  try {
    await server.loadAccount(userPub);
    console.log(`Account ${userPub} already exists.`);
    // Check if user has trustline for USDC
    const hasTrustline = await checkTrustline(
      userPub,
      USDC.code,
      USDC.issuer,
      server
    );
    if (hasTrustline) {
      console.log(`Account ${userPub} already has a trustline for USDC.`);
    } else {
      console.log(`Account ${userPub} does not have a trustline for USDC.`);
    }
    return;
  } catch (e: any) {
    if (e instanceof StellarSdk.NotFoundError || e.response?.status === 404) {
      // Account does not exist, proceed
      console.log(`Account ${userPub} does not exist. Proceeding to create.`);
    } else {
      // Some other error
      console.error("Error checking account existence:", e);
      return;
    }
  }

  const sponsorAccount = await server.loadAccount(sponsorPub);

  // Estimate 1 USDC cost in XLM on SDEX (could be done more accurately via pathfinding API)
  const minUSDC = '1.0000000';
  const maxXLM = '20.0000000'; // Safety upper bound

  const tx = new StellarSdk.TransactionBuilder(sponsorAccount, {
    fee: '300',
    networkPassphrase,
  })
    // Step 1: Sponsor account creation
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
    // Step 3: Swap XLM → USDC and send to user
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

  // Submit
  try {
    const result = await server.submitTransaction(tx);
    console.log("✅ Transaction successful:", result.hash);
  } catch (err) {
    console.error("❌ Transaction failed:", err);
  }
})();
