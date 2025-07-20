import Server from "@stellar/stellar-sdk";
import { Asset } from "@stellar/stellar-sdk";

/**
 * Get the best strict receive quote from Horizon.
 * @param server Horizon server instance
 * @param assetIn Asset to send
 * @param assetOut Asset to receive
 * @param amountOut Amount of assetOut to receive (string)
 * @param slippageTolerance Slippage in BPS (number)
 * @returns { expectedInputAmount, maximumInputAmount, bestPath }
 */
export async function horizonStrictReceiveQuote({
  server,
  assetIn,
  assetOut,
  amountOut,
  slippageTolerance
}: {
  server: typeof Server,
  assetIn: Asset,
  assetOut: Asset,
  amountOut: string,
  slippageTolerance: number
}) {
  const pathResponse = await server.strictReceivePaths(
    [assetIn],
    assetOut,
    amountOut
  ).call();
  const records = pathResponse.records;
  if (!records || records.length === 0) {
    throw new Error('No SDEX path found for STRICT_RECEIVE');
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
  const expectedInputAmount = bestPath.source_amount;
  const maximumInputAmount = (parseFloat(expectedInputAmount) * (1 + slippageTolerance / 10000)).toFixed(7);
  return {
    expectedInputAmount,
    maximumInputAmount,
    bestPath
  };
} 