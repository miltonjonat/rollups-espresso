import { createPublicClient, http } from 'viem'

export const NODE_URL = process.env.NODE_URL || "http://127.0.0.1:8080";
export const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
export const EPOCH_DURATION = process.env.EPOCH_DURATION ? BigInt(process.env.EPOCH_DURATION) : 86400n;
export const DAPP_ADDRESS = process.env.DAPP_ADDRESS as `0x${string}` || "0x70ac08179605AF2D9e75782b8DEcDD3c22aA4D0C";

type Context = {
  blockNumber: bigint;
  epoch: bigint;
  currentInput: bigint;
  currentInputBlockNumber: bigint;
  currentEpoch: bigint;
}


export async function getInputData(inputIndex: bigint, fields: string[]): Promise<any> {
  const query = `{ "query": "{ input(index: ${inputIndex}) { ${fields.join(' ')} } }" }`;
  const fetched = await fetch(`${NODE_URL}/graphql`, {
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "body": query
  });
  const json:any = await fetched.json();
  return json?.data?.input || {};
}

async function getCurrentInput(): Promise<bigint> {
  // retrieve total number of inputs
  const query = `{ "query": "{ inputs { totalCount } }" }`;
  const fetched = await fetch(`${NODE_URL}/graphql`, {
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "body": query
  });
  const json:any = await fetched.json();
  const numInputs = json?.data?.inputs?.totalCount;

  // searches through inputs to find the last unprocessed one (current input)
  if (numInputs > 0) {
    for (let inputIndex = BigInt(numInputs-1); inputIndex >= 0; inputIndex--) {
      const { status } = await getInputData(BigInt(inputIndex), ["status"]);
      if (status !== "UNPROCESSED") {
        console.log(`Found currentInput '${inputIndex + 1n}'`);
        return inputIndex + 1n;
      }
    }
  }
  return 0n;
}

async function getInputBlockNumber(inputIndex: bigint): Promise<bigint> {
  return new Promise<bigint>(async resolve => {
    let interval: any;
    const fetchRequest = async () => {
      const { blockNumber } = await getInputData(inputIndex, ["blockNumber"]);
      if (blockNumber) {
        console.log(`Found blockNumber '${blockNumber}' for input ${inputIndex}`);
        clearInterval(interval);
        resolve(blockNumber);
      }
    }
    interval = setInterval(fetchRequest, 500);
  })
}

function computeEpoch(blockNumber: bigint): bigint {
  // TODO: try to mimic current Authority epoch computation
  return BigInt(blockNumber) / EPOCH_DURATION;
}

async function waitForBlock(blockNumber: bigint): Promise<void> {
  console.log(`Waiting for block: '${blockNumber}'`);
  return new Promise(async (resolve) => {
    const client = createPublicClient({ transport: http(RPC_URL) })
    // TODO: blockTag should be changed to "finalized" once that is what the node is doing
    const currentBlock = await client.getBlock({blockTag: "latest"});
    console.log(`Current block: '${currentBlock.number}'`);
    if (blockNumber > currentBlock.number) {
      const unwatch = client.watchBlocks({
        blockTag: "latest",
        onBlock: newBlock => {
          console.log(`Current block: '${newBlock.number}'`);
          if (newBlock.number >= blockNumber) {
            unwatch();
            resolve();
          }
        }
      })
    } else {
      resolve();
    }
  })
}

async function getContext(blockNumber: bigint): Promise<Context> {
  const currentInput = await getCurrentInput();
  const currentInputBlockNumber = await getInputBlockNumber(currentInput);
  const currentEpoch = computeEpoch(currentInputBlockNumber);
  const epoch = computeEpoch(blockNumber);

  const context = {
    blockNumber,
    epoch,
    currentInput,
    currentInputBlockNumber,
    currentEpoch
  };

  if (epoch <= currentEpoch) {
    await waitForBlock(blockNumber);
  }
  return context;
}

export default getContext;
