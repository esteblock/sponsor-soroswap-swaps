# Gasless USDC to EURC Swap

This implementation demonstrates how to get quotes and execute swaps between ans USDC to EURC using the Soroswap Aggregator API.

As we suppose that wallets that will use the Gasless Swaps are wallets that already suport USDC, our first script will set up a wallet with 1 USDC with an sponsored truistline. While, the next ones will execute gasless swaps using the API

## Features

- ✅ Gasless trustline creation (no XLM needed for trustline)
- ✅ Uses Soroswap Aggregator API
- ✅ Supports fee sharing
- ✅ Detailed quote information

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Create a `.env` file with your API credentials:
```
cp .env.example .env
```

```bash
# Soroswap API Configuration
SOROSWAP_API_URL=https://soroswap-api-staging-436722401508.us-central1.run.app/
SOROSWAP_API_KEY=your_api_key_here

# Test Account Keys
SPONSOr_SECRET=your_sponsor_account_secret_here # charge it with 10 XLM
USER_SECRET=your_test_account_secret_here  # just create a new one using lab.stellar.org, dont even fund it
REFERRAL_SECRET_KEY=
```

## Usage

1. Setup the user and referral account.
For the referral sponsors the creation and trustline of USDC and EURC
For the user, sponsors the creatation and trustlne of USDC. Also sends it 1 USDC.
```bash 
yarn ts-node src/createSponsoredAccounts.ts  
```

2. Swaps 0.5 USDC into EURC using Soroswap API and gaslessTrustline=true

```bash
yarn ts-node src/gaslessTrustlineExactInUSDC.ts # swap 0.5 USDC for EURC with gaslessTrustline
```

```javascript
const quote = await soroswapSdk.quote({assetIn, ... gaslessTrustlie: create})
const buildResponse = await soroswapSdk.build({quote, sponsor, from, to, referralId})
const swapTransaction = TransactionBuilder.fromXDR(buildResponse.xdr, Networks.PUBLIC)

swapTransaction.sign(sponsorKeypair)
swapTransaction.sign(userKeypair)

const sendResponse = await soroswapSdk.send(swapTransaction.toXDR())
```

3. Swaps ExactIn 0.1 EURC to USDC using Soroswap API, forcing SDEX

```javascript
const quote = await soroswapSdk.quote({assetIn, ... })
const buildResponse = await soroswapSdk.build({quote, sponsor, from, to, referralId})
const swapTransaction = TransactionBuilder.fromXDR(buildResponse.xdr, Networks.PUBLIC)

swapTransaction.sign(sponsorKeypair)
swapTransaction.sign(userKeypair)

const sendResponse = await soroswapSdk.send(swapTransaction.toXDR())
```

```
yarn ts-node src/gaslessSwapSDEXExactInEURC.ts
```

## What it does

1. **Quote Request**: Sends a request to the Soroswap Aggregator API for a gasless exact-in swap
   - Input: 0.5 USDC
   - Output: EURC (amount calculated by the API)
   - Trade Type: EXACT_IN
   - Gasless Trustline: Enabled
   - Platform: SDEX (required for gasless trustline)

2. **Quote Response**: Displays detailed information about the swap:
   - Input and output amounts
   - Price impact
   - Trustline costs
   - Route information

## Asset Details

- **USDC Contract**: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
- **EURC Contract**: `CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV`

## Configuration

The swap is configured with:
- **Slippage**: 0.5% (50 bps)
- **Fee**: 0.85% (85 bps)
- **Protocols**: SDEX only (required for gasless trustline)
- **Asset List**: SOROSWAP curated list

## Next Steps

This implementation only gets the quote. To complete the swap, you would need to:

1. **Build Transaction**: Call `/quote/build` endpoint with the quote
2. **Sign Transaction**: Sign with both user and sponsor keys
3. **Submit Transaction**: Call `/send` endpoint with the signed XDR

## Example Output

```
🚀 Starting gasless USDC to EURC swap...
📊 User wants to swap 0.5 USDC for EURC with gasless trustline

🔍 Requesting gasless quote...
Request: {
  "assetIn": "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  "assetOut": "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV",
  "amount": "5000000",
  "tradeType": "EXACT_IN",
  "protocols": ["sdex"],
  "slippageBps": 50,
  "parts": 1,
  "maxHops": 1,
  "assetList": ["SOROSWAP"],
  "feeBps": 85,
  "gaslessTrustline": "create"
}

✅ Quote received successfully!
Quote Response: {
  "assetIn": "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  "assetOut": "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV",
  "amountIn": "5000000",
  "amountOut": "4567253",
  "otherAmountThreshold": "4517253",
  "tradeType": "EXACT_IN",
  "priceImpactPct": "0.12",
  "platform": "sdex",
  "gaslessTrustline": "create",
  "trustlineInfo": {
    "trustlineCostAssetIn": "0.5000000",
    "trustlineCostAssetOut": "0.4567253"
  }
}

📋 Quote Summary:
💰 Input Amount: 5000000 stroops (0.5 USDC)
💸 Output Amount: 4567253 stroops (0.4567253 EURC)
📉 Price Impact: 0.12%
🔄 Platform: sdex
⚡ Gasless Trustline: create
🔗 Trustline Cost (Asset In): 0.5000000 USDC
🔗 Trustline Cost (Asset Out): 0.4567253 EURC

✅ Quote obtained successfully!
```