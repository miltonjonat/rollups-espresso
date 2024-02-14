import createClient from "openapi-fetch";
import { components, paths } from "./schema";
import { hexToString, numberToHex } from "viem";
import { handleAdvance, handleInspect } from "./dapp";

type AdvanceRequestData = components["schemas"]["Advance"];
type InspectRequestData = components["schemas"]["Inspect"];
type RequestHandlerResult = components["schemas"]["Finish"]["status"];
type RollupsRequest = components["schemas"]["RollupRequest"];
type AdvanceRequestHandler = (
  data: AdvanceRequestData
) => Promise<RequestHandlerResult>;

export const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollupServer);
const dehashingServer = process.env.DEHASHING_SERVER_URL;
console.log("Dehashing server url is " + dehashingServer);

// next Espresso block height to process
//let espressoBlockHeight: number | undefined = undefined;
let espressoBlockHeight: number = 1284960;

/**
 * Fetch data from the InputBox
 * @param blockNumber base layer block number
 * @param inputIndex input index within InputBox
 * @returns tuple containing request status (typically 200, 403 or 404) and input payload
 */
const fetchInputBox = async (blockNumber: number, inputIndex: number): Promise<[number, `0x${string}`]> => {
  const id = numberToHex(blockNumber, { size: 32 }) + numberToHex(inputIndex, { size: 32 }).slice(2);
  const url = `${dehashingServer}/inputbox/${id}`;
  console.log(`Fetching InputBox data for block '${blockNumber}' and index '${inputIndex}'`);
  const fetched = await fetch(url);
  const fetchedData = await fetched.text() as `0x${string}`;
  if (fetched.status == 200) {
    console.log(`Fetched InputBox data: '${fetchedData}'`);
  }
  return [fetched.status, fetchedData];
}

/**
 * Fetch data from Espresso
 * @param blockNumber base layer block number
 * @param espressoBlockHeight block height in the Espresso network
 * @returns tuple containing request status (typically 200, 403 or 404) and corresponding Espresso block data
 */
const fetchEspresso = async (blockNumber: number, espressoBlockHeight: number): Promise<[number, `0x${string}`]> => {
  const id = numberToHex(blockNumber, { size: 32 }) + numberToHex(espressoBlockHeight, { size: 32 }).slice(2);
  const url = `${dehashingServer}/espresso/${id}`;
  console.log(`Fetching Espresso data for block '${blockNumber}' and Espresso block height '${espressoBlockHeight}'`);
  const fetched = await fetch(url);
  const fetchedData = await fetched.text() as `0x${string}`;
  return [fetched.status, fetchedData];
}

/**
 * Process Espresso block data
 * @param data AdvanceRequestData for current input
 * @param espressoData Espresso block data
 */
const processEspresso = async (data: AdvanceRequestData, espressoData: `0x${string}`) => {
  // convert Espresso block data to a JSON object and define Espresso metadata to send to DApp
  const espressoDataObj = JSON.parse(hexToString(espressoData));
  const espressoMetadata = {
    hash: espressoDataObj?.hash,
    header: espressoDataObj?.header
  }
  // call DApp's handleAdvance for each transaction found in block
  for (const transaction of espressoDataObj?.payload?.transaction_nmt) {
    console.log(`Espresso payload to handle: ${transaction.payload}`);
    const payload = `0x${Buffer.from(transaction.payload).toString("hex")}`;
    // TODO: attempt to decode payload signature to extract msg_sender
    await handleAdvance({
      metadata: { ...data.metadata, espresso: espressoMetadata },
      payload
    } as AdvanceRequestData);
  }
} 

const handleAdvanceInternal: AdvanceRequestHandler = async (data) => {
  try {
    // PROCESS DATA
    await handleAdvance(data);

    let blockNumber = data.metadata.block_number;

    // process data for each base layer block until out of scope
    let outOfScope = false;
    while (!outOfScope) {
      // check if next input is in block
      const [status] = await fetchInputBox(blockNumber, data.metadata.input_index + 1);
      if (status == 200 || status == 403) {
        // - 200 means that there is a new input for the current block
        // - 403 means that there is a new input for the current block, but it's out of scope
        // - either way, we should finish the current input's processing and let the next one be processed by the next advance request
        return "accept";
      }

      // process all Espresso data for base layer block
      if (espressoBlockHeight !== undefined) {
        let espressoStatus, espressoData;
        while (true) {
          [espressoStatus, espressoData] = await fetchEspresso(blockNumber, espressoBlockHeight);
          if (espressoStatus != 200) {
            break;
          }
          // PROCESS ESPRESSO BLOCK DATA
          await processEspresso(data, espressoData);
          espressoBlockHeight++;
        }
        outOfScope = (espressoStatus == 403);
      }
      blockNumber++;
    }
    return "accept";

  } catch (error) {
    console.log(`Could not process advance request ${JSON.stringify(data)}`);
    console.log(JSON.stringify(error));
    return "reject";
  }
};

const main = async () => {
  const { POST } = createClient<paths>({ baseUrl: rollupServer });
  let status: RequestHandlerResult = "accept";
  while (true) {
    const { response } = await POST("/finish", {
      body: { status },
      parseAs: "text",
    });

    if (response.status === 200) {
      const data = (await response.json()) as RollupsRequest;
      switch (data.request_type) {
        case "advance_state":
          status = await handleAdvanceInternal(data.data as AdvanceRequestData);
          break;
        case "inspect_state":
          await handleInspect(data.data as InspectRequestData);
          break;
      }
    } else if (response.status === 202) {
      console.log(await response.text());
    }
  }
};

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
