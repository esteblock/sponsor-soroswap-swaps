import Server from "@stellar/stellar-sdk";
import { Asset } from "@stellar/stellar-sdk";

/**
 * Get the best strict send quote from Horizon.
 * @param server Horizon server instance
 * @param assetIn Asset to send
 * @param assetOut Asset to receive
 * @param amountIn Amount of assetIn to send (string)
 * @param slippageTolerance Slippage in BPS (number)
 * @returns { expectedOutputAmount, minimumOutputAmount, bestPath }
 */
export async function horizonStrictSendQuote({
  server,
  assetIn,
  assetOut,
  amountIn,
  slippageTolerance
}: {
  server: typeof Server,
  assetIn: Asset,
  assetOut: Asset,
  amountIn: string,
  slippageTolerance: number
}) {
  const pathResponse = await server.strictSendPaths(
    assetIn,
    amountIn,
    [assetOut]
  ).call();
  const records = pathResponse.records;
  if (!records || records.length === 0) {
    throw new Error('No SDEX path found for STRICT_SEND');
  }
  const bestPath = records.reduce((maxObj: any, obj: any) => {
    if (
      parseFloat(obj.destination_amount) > parseFloat(maxObj.destination_amount) &&
      obj.path.length <= 1
    ) {
      return obj;
    }
    return maxObj;
  }, records[0]);
  const expectedOutputAmount = bestPath.destination_amount;
  const minimumOutputAmount = (parseFloat(expectedOutputAmount) * (1 - slippageTolerance / 10000)).toFixed(7);
  return {
    expectedOutputAmount,
    minimumOutputAmount,
    bestPath
  };
} 