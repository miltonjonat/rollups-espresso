import { createPublicClient, http, parseAbi } from "viem";
import { fetchContext, DAPP_ADDRESS, RPC_URL, fetchInputData } from "./context";

const INPUTBOX_ADDRESS = "0x59b22D57D4f067708AB0c00552767405926dc768"

export async function fetchInputBox(id: string): Promise<[number, string | undefined]> {
    // parse id as maxBlockNumber + InputBox index
    if (id.length != 130 || !id.startsWith("0x")) {
      console.log(`Invalid id '${id}': must be a hex string with 32 bytes for maxBlockNumber and 32 bytes for the inputIndex`);
      return [404, undefined];
    }
    const maxBlockNumber = BigInt(id.slice(0,66));
    const inputIndex = BigInt("0x" + id.slice(66,130));

    const context = await fetchContext(maxBlockNumber);

    // check if out of epoch's scope
    if (context.epoch > context.currentEpoch) {
      console.log(`Requested data beyond current epoch '${context.currentEpoch}' (data estimated to belong to epoch '${context.epoch}')`);
      return [403, undefined];
    }

    // check if input exists at specified block
    const client = createPublicClient({ transport: http(RPC_URL) })
    const numInputs = await client.readContract({
      address: INPUTBOX_ADDRESS,
      abi: parseAbi(["function getNumberOfInputs(address dapp) view returns (uint256)"]),
      functionName: "getNumberOfInputs",
      args: [DAPP_ADDRESS],
      blockNumber: maxBlockNumber 
    })
    if (inputIndex >= numInputs) {
      console.log(`Requested input '${inputIndex}' not present at blockNumber '${maxBlockNumber}')`);
      return [404, undefined];
    }

    // fetch specified input
    // - input is already known to exist: poll GraphQL until we find it there
    console.log(`Fetching InputBox input '${inputIndex}' at blockNumber '${maxBlockNumber}'`);
    return new Promise<[number, string | undefined]>(async resolve => {
      let interval: any;
      const fetchRequest = async () => {
        console.log(`Attempting to fetch input data for index '${inputIndex}'`);
        const { blockNumber, msgSender, payload } = await fetchInputData(inputIndex, ["blockNumber", "msgSender", "payload"]);
        // return status and payload checking requested scope
        if (payload !== undefined) {
          clearInterval(interval);
          if (blockNumber > maxBlockNumber) {
            console.log(`Input beyond requested blockNumber '${maxBlockNumber}', found at '${blockNumber}'`);
            resolve([404, undefined]);
          } else {
            console.log(`Returning payload: '${payload}'`);
            resolve([200, msgSender + payload.slice(2)]);
          }
        }
      }
      interval = setInterval(fetchRequest, 500);
    });
}
