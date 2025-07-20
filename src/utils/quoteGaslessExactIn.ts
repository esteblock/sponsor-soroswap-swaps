/**
 * Get the best quote and all calculations for a gasless exact in swap (Soroswap API Step 1 & 2)
 * @param params { server, assetIn, assetOut, amountIn, slippageTolerance, trustlineRequiredAmountXLM }
 * @returns { expectedOut, minimumOut, swapPath, repayIn, maxRepayIn, repayPath, repayEquivalentAssetIn, repayEquivalentAssetOut }
 */
import { horizonStrictSendQuote } from "./horizonStrictSendQuote";
import { horizonStrictReceiveQuote } from "./horizonStrictReceiveQuote";
import { Asset } from "@stellar/stellar-sdk";

export async function quoteGaslessExactInFull({
  server,
  assetIn,
  assetOut,
  amountIn,
  slippageTolerance,
  trustlineRequiredAmountXLM
}: {
  server: any,
  assetIn: any,
  assetOut: any,
  amountIn: string,
  slippageTolerance: number,
  trustlineRequiredAmountXLM: string
}) {

  // Console log of the quote
  console.log("\n==============================");
  console.log("📊 QUOTE EXACT IN REQUEST");
  console.log("==============================");
  console.log(`💡 assetIn: ${assetIn.code}`);
  console.log(`💡 assetOut: ${assetOut.code}`);
  console.log(`💡 amountIn: ${amountIn} ${assetIn.code}`);
  console.log(`💡 slippageTolerance: ${slippageTolerance}`);
  console.log(`💡 trustlineRequiredAmountXLM: ${trustlineRequiredAmountXLM}`);
  console.log("==============================");

  const {
    expectedOutputAmount: totalOut,
    minimumOutputAmount: minTotalOut,
    bestPath: swapPath,
  } = await horizonStrictSendQuote({
    server,
    assetIn,
    assetOut,
    amountIn,
    slippageTolerance
  });
    console.log("🚀 ~ minTotalOut:", minTotalOut)
    console.log("🚀 ~ totalOut:", totalOut)

  const {
    expectedInputAmount: repayIn,
    maximumInputAmount: maxRepayIn,
    bestPath: repayPath
  } = await horizonStrictReceiveQuote({
    server,
    assetIn: assetOut,
    assetOut: Asset.native(),
    amountOut: trustlineRequiredAmountXLM,
    slippageTolerance
  });
    console.log("🚀 ~ maxRepayIn:", maxRepayIn)
    console.log("🚀 ~ repayIn:", repayIn)

  const expectedOut = (parseFloat(totalOut) - parseFloat(repayIn))
  console.log("🚀 ~ expectedOut:", expectedOut)
  const minimumOut = (parseFloat(minTotalOut) - parseFloat(maxRepayIn))
  console.log("🚀 ~ minimumOut:", minimumOut)

  // Repay Equivalent in terms of the assetOut
  const repayEquivalentAssetOut = parseFloat(repayIn);
  console.log("🚀 ~ repayEquivalentAssetOut:", repayEquivalentAssetOut)

  // Repay Equivalent in terms of the assetIn
  const assetOutInAssetIn = (parseFloat(amountIn) / parseFloat(totalOut))
  console.log("🚀 ~ assetOutInAssetIn:", assetOutInAssetIn)
  const repayEquivalentAssetIn = (repayEquivalentAssetOut * assetOutInAssetIn)
  console.log("🚀 ~ repayEquivalentAssetIn:", repayEquivalentAssetIn)

  // If minimumOut is less than 0, return an error
  if (minimumOut < 0) {

    // More info as it was in a wallet to the user. You can't repay the trustline with less than 0.
    console.log("\n==============================");
    console.log("🚨 Minimum output amount is less than 0");
    console.log("==============================");
    // What you can get in asset out vs what you need to repay the trustline
    console.log(`💡 You can get ${totalOut} ${assetOut.code} but you need to repay ${repayEquivalentAssetOut} ${assetOut.code}`);
    console.log(`💡 In the worst scenario you will get ${minTotalOut} ${assetOut.code} but you need to repay ${maxRepayIn} ${assetOut.code}`);
    console.log("==============================");
    throw new Error("Minimum output amount is less than 0");
  }

  return {
    totalOut: parseFloat(totalOut).toFixed(7),
    expectedOut: expectedOut.toFixed(7), 
    minimumOut: minimumOut.toFixed(7),
    swapPath, // The first swap path
    repayIn, // The amount of the assetIn to repay the trustline
    maxRepayIn, // The maximum amount of the assetIn to repay the trustline
    repayPath, // The repay path
    repayEquivalentAssetIn: repayEquivalentAssetIn.toFixed(7),
    repayEquivalentAssetOut: repayEquivalentAssetOut.toFixed(7)
  };
} 