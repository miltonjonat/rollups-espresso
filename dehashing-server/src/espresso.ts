const ESPRESSO_BASE_URL = process.env.ESPRESSO_BASE_URL || "https://query.gibraltar.aws.espresso.network/";

async function fetchEspresso(id: string): Promise<[number, string | undefined]> {
    // TODO: block until conditions are met or until out of scope
    // - listen to block finalized events until maxBlockNumber is received
    // - check if espressoBlockHeight is within current epoch's InputRange (or maxBlockNumber depending on how epochs are defined)
    //   - if not, return 403
    // - GET `/status/latest_block_height` to check current block height
    //   - if requested block is lower: request it, filter by VM ID / dapp, and return if there is a payload
    //   - if higher: stream blocks from latest, until either the block arrives or the block's l1_finalized value is beyond maxBlockNumber
    //     - if l1_finalized is beyond, return 404
    const url = `${ESPRESSO_BASE_URL}/availability/block/hash/${id}`;
    console.log(`Fetching '${url}'`);
    const fetched = await fetch(url);
    const data:any = await fetched.json();
    console.log(`Fetched data: '${JSON.stringify(data)}'`);

    // TODO: should filter by VM ID instead of picking up the first one
    // - read dapp deployment file path (dapp.json) from env and extract VM ID from dapp address
    const payload = data?.payload?.transaction_nmt[0]?.payload;
    if (payload) {
      let payloadHex = `0x${Buffer.from(payload).toString("hex")}`
      console.log(`Returning payload: '${payloadHex}'`);
      return [200, payloadHex];
    } else {
      return [404, undefined];
    }
}

export default fetchEspresso;
