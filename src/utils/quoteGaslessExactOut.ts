/**
 * Get the best quote and all calculations for a gasless exact in swap (Soroswap API Step 1 & 2)
 * @param params { server, assetIn, assetOut, amountOut, slippageTolerance, trustlineRequiredAmountXLM }
 * 
 * @returns {
 *  // Quote
 *  finalExpectedIn, // The total expected amount to spend in the gasless exact out
 *  finalMaximumIn, // The final maximum amount to spend in the gasless exact out
 * 
 *  // Info to build the transaction:
 *  
 *  // The assetIn to assetOut Swap
 *  expectedSwapIn, // The expected amount to spend in the assetIn to assetOut swap
 *  maximumSwapIn, // The maximum amount to spend in the assetIn to assetOut swap
 *  swapPath, // The path to swap the assetIn to assetOut
 * 
 *  // Trustline Swap: Swap assetOut to 0.5 XLM
 *  expectedTrustlineCostIn, // The expected amount to spend in the gasless exact out
 *  maximumTrustlineCostIn, // The maximum amount to spend in the gasless exact out
 *  trustlineCostPath, // The path to swap the assetOut to 0.5 XLM
 * 
 *  // Extra info: 
 *  trustlineEquivalentAssetOut, // The equivalent amount spend in AssetOut to pay the trustline
 * }
 */
import { horizonStrictReceiveQuote } from "./horizonStrictReceiveQuote";
import { Asset } from "@stellar/stellar-sdk";

export async function quoteGaslessExactOut({
  server,
  assetIn,
  assetOut,
  amountOut,
  slippageTolerance,
  trustlineRequiredAmountXLM
}: {
  server: any,
  assetIn: any,
  assetOut: any,
  amountOut: string,
  slippageTolerance: number,
  trustlineRequiredAmountXLM: string
}) {

  // Console log of the quote
  console.log("\n==============================");
  console.log("📊 QUOTE EXACT OUT REQUEST");
  console.log("==============================");
  console.log(`💡 assetIn: ${assetIn.code}`);
  console.log(`💡 assetOut: ${assetOut.code}`);
  console.log(`💡 amountOut: ${amountOut} ${assetIn.code}`);
  console.log(`💡 slippageTolerance: ${slippageTolerance}`);
  console.log(`💡 trustlineRequiredAmountXLM: ${trustlineRequiredAmountXLM}`);
  console.log("==============================");

  // We get from horizon the best path and quote for a normal exact out
  const {
    expectedInputAmount,
    maximumInputAmount,
    bestPath: swapPath,
  } = await horizonStrictReceiveQuote({
    server,
    assetIn,
    assetOut,
    amountOut,
    slippageTolerance
  });
  console.log("🚀 ~ expectedInputAmount:", expectedInputAmount)
  console.log("🚀 ~ maximumInputAmount:", maximumInputAmount)

  // TRUSTLINE COST: Then the path and quote to get 0.5 XLM
  const {
    expectedInputAmount: expectedTrustlineCostIn,
    maximumInputAmount: maximumTrustlineCostIn,
    bestPath: trustlineCostPath
  } = await horizonStrictReceiveQuote({
    server,
    assetIn: assetOut,
    assetOut: Asset.native(),
    amountOut: trustlineRequiredAmountXLM,
    slippageTolerance
  });
  console.log("🚀 ~ expectedTrustlineCostIn:", expectedTrustlineCostIn)
  console.log("🚀 ~ maximumTrustlineCostIn:", maximumTrustlineCostIn)

  const finalExpectedIn = (parseFloat(expectedInputAmount) + parseFloat(expectedTrustlineCostIn))
  const finalMaximumIn = (parseFloat(maximumInputAmount) + parseFloat(maximumTrustlineCostIn))
  
  console.log("🚀 ~ finalExpectedIn:", finalExpectedIn)
  console.log("🚀 ~ finalMaximumIn:", finalMaximumIn)

  // Trustline Cost in terms of the different assets

  // Trustline cost in terms of assetIn
  const trustlineEquivalentAssetIn = parseFloat(expectedTrustlineCostIn).toFixed(7);

  // Trustline cost in terms of assetOut
  const valueAssetInInAssetOut = (parseFloat(expectedInputAmount) / parseFloat(amountOut))
  const trustlineEquivalentAssetOut = (parseFloat(expectedTrustlineCostIn) * valueAssetInInAssetOut).toFixed(7)

  console.log("🚀 ~ trustlineEquivalentAssetIn:", trustlineEquivalentAssetIn)
  console.log("🚀 ~ trustlineEquivalentAssetOut:", trustlineEquivalentAssetOut)


  return {
    // Quote
    finalExpectedIn, // The final expected amount to spend in the gasless exact out
    finalMaximumIn, // The final maximum amount to spend in the gasless exact out
    
    // The assetIn to assetOut swap
    expectedSwapIn: expectedInputAmount, // The expected amount to spend in the first swap
    maximumSwapIn: maximumInputAmount, // The maximum amount to spend in the first swap
    swapPath, // The path to swap the assetIn to assetOut

    // Trustline Swap: Swap assetOut to 0.5 XLM
    expectedTrustlineCostIn, // The expected amount to spend in the gasless exact out
    maximumTrustlineCostIn, // The maximum amount to spend in the gasless exact out
    trustlineCostPath, // The path to swap the assetOut to 0.5 XLM

    // Extra info: 
    trustlineEquivalentAssetOut, // The amount of assetOut to repay the trustline
  };
} 