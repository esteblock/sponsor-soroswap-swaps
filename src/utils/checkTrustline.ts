import Server, { Asset } from '@stellar/stellar-sdk';

/**
 * Checks if a Stellar account has a trustline for a given asset.
 * @param {string} accountAddress - The Stellar account address to check.
 * @param {string} assetCode - The asset code (e.g., 'USDC').
 * @param {string} assetIssuer - The asset issuer address.
 * @param {Server} server - An instance of StellarSdk.Server.
 * @returns {Promise<boolean>} - True if the trustline exists, false otherwise.
 */
export async function checkTrustline(
  accountAddress: string,
  assetCode: string,
  assetIssuer: string,
  server: InstanceType<typeof Server>
): Promise<boolean> {
  try {
    const account = await server.loadAccount(accountAddress);
    const asset = new Asset(assetCode, assetIssuer);
    return account.balances.some(
      (balance: any) =>
        balance.asset_type !== 'native' &&
        balance.asset_code === asset.getCode() &&
        balance.asset_issuer === asset.getIssuer()
    );
  } catch (error) {
    console.error('Error checking trustline:', error);
    return false;
  }
} 