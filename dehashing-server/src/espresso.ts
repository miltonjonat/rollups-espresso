const ESPRESSO_BASE_URL = "https://espresso.tspre.org";

async function fetchEspresso(id: string): Promise<[number, string | undefined]> {
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
