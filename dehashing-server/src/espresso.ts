import { fetchContext, DAPP_ADDRESS } from "./context";

const ESPRESSO_BASE_URL = process.env.ESPRESSO_BASE_URL || "https://query.gibraltar.aws.espresso.network";

// Espresso VM ID defined as the first 8 bytes of the address (max size currently accepted by Espresso)
const VM_ID = Number(DAPP_ADDRESS.slice(0,18));

async function fetchLatestEspressoBlockHeight(): Promise<bigint> {
  const url = `${ESPRESSO_BASE_URL}/status/latest_block_height`;
  const fetched = await fetch(url);
  const data = await fetched.text();
  console.log(`Fetched latest Espresso block height: '${data}'`);
  return BigInt(data);
}

async function fetchEspressoHeader(espressoBlockHeight: bigint): Promise<any> {
  const url = `${ESPRESSO_BASE_URL}/availability/header/${espressoBlockHeight}`;
  const fetched = await fetch(url);
  const data:any = await fetched.json();
  console.log(`Fetched Espresso block header: '${JSON.stringify(data)}'`);
  return data;
}

async function fetchEspressoBlock(espressoBlockHeight: bigint): Promise<any> {
  const url = `${ESPRESSO_BASE_URL}/availability/block/${espressoBlockHeight}`;
  const fetched = await fetch(url);
  const data:any = await fetched.json();
  console.log(`Fetched Espresso block: '${JSON.stringify(data)}'`);
  return data;
}

function filterBlockByVM(block: any, vm: number): any {
  const transaction_nmt = block?.payload?.transaction_nmt?.filter((entry:any) => entry.vm === vm);
  if (transaction_nmt?.length) {
    return { ...block, payload: { ...block.payload, transaction_nmt } };
  } else {
    // no data left
    return undefined;
  }
}

export async function fetchEspresso(id: string): Promise<[number, string | undefined]> {
    // parse id as maxBlockNumber + Espresso block height
    if (id.length != 130 || !id.startsWith("0x")) {
      console.log(`Invalid id '${id}': must be a hex string with 32 bytes for maxBlockNumber and 32 bytes for espressoBlockHeight`);
      return [404, undefined];
    }
    const maxBlockNumber = BigInt(id.slice(0,66));
    const espressoBlockHeight = BigInt("0x" + id.slice(66,130));

    const context = await fetchContext(maxBlockNumber);

    // check if out of epoch's scope
    if (context.epoch > context.currentEpoch) {
      console.log(`Requested data beyond current epoch '${context.currentEpoch}' (data estimated to belong to epoch '${context.epoch}')`);
      return [403, undefined];
    }

    return new Promise<[number, string | undefined]>(async resolve => {
      const fetchBlock = async () => {
        let latestEspressoBlockHeight = await fetchLatestEspressoBlockHeight();
        if (espressoBlockHeight > latestEspressoBlockHeight) {
          // requested Espresso block not available yet: just check if we are still within L1 blockNumber scope
          const header = await fetchEspressoHeader(latestEspressoBlockHeight);
          const l1_finalized = header?.l1_finalized?.number;
          if (l1_finalized > maxBlockNumber) {
            console.log(`Espresso block '${espressoBlockHeight}' not available at requested L1 blockNumber '${maxBlockNumber}', Espresso block '${latestEspressoBlockHeight}' is already at '${l1_finalized}'`);
            resolve([404, undefined]);
          } else {
            // call fetchBlock again at some later time to see if we reach the block
            setTimeout(fetchBlock, 500);
          } 
        } else {
          // requested Espresso block available: fetch it
          const block = await fetchEspressoBlock(espressoBlockHeight);
      
          // check if within L1 blockNumber scope
          const l1_finalized = block?.header?.l1_finalized?.number;
          if (l1_finalized === undefined) {
            console.log(`Espresso block '${espressoBlockHeight}' with undefined L1 blockNumber`);
            resolve([404, undefined]);
          } else if (l1_finalized > maxBlockNumber) {
            console.log(`Espresso block '${espressoBlockHeight}' beyond requested L1 blockNumber '${maxBlockNumber}', found '${l1_finalized}'`);
            resolve([404, undefined]);
          } else {
            // filter block data considering DApp's VM ID
            const blockFiltered = filterBlockByVM(block, VM_ID);
        
            if (blockFiltered) {
              let blockHex = `0x${Buffer.from(JSON.stringify(blockFiltered)).toString("hex")}`
              console.log(`Returning block data: '${blockHex}'`);
              resolve([200, blockHex]);
            } else {
              console.log(`No data for VM '${VM_ID}' in Espresso block '${espressoBlockHeight}'`);
              resolve([404, undefined]);
            }
          }
        }
      };
      fetchBlock();
    });
}

if (process.env.NODE_ENV === "test") {
  module.exports = { ...module.exports,
    ESPRESSO_BASE_URL,
    VM_ID,
    fetchLatestEspressoBlockHeight,
    fetchEspressoHeader,
    fetchEspressoBlock
  };
}
