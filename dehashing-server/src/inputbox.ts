const GRAPHQL_URL = "http://127.0.0.1:8080/graphql";

async function fetchInputBox(id: string): Promise<[number, string | undefined]> {
    // parse id as Ethereum blockNumber + InputBox index
    if (id.length != 130 || !id.startsWith("0x")) {
      throw(`Invalid id '${id}': must be a hex string with 32 bytes for ethBlockNumber and 32 bytes for the inputIndex`);
    }
    // TODO: use BigNumbers
    const ethBlockNumber = parseInt(id.slice(0,66));
    const inputIndex = parseInt("0x" + id.slice(66,130));

    // fetch specified input
    console.log(`Fetching InputBox input '${inputIndex}' at blockNumber '${ethBlockNumber}'`);
    const query = `{ "query": "{ input(index: ${inputIndex}) { blockNumber msgSender payload } }" }`;
    const fetched = await fetch(GRAPHQL_URL, {
      "method": "POST",
      "headers": { "Content-Type": "application/json" },
      "body": query
    });
    const json:any = await fetched.json();
    console.log(`Fetched data: '${JSON.stringify(json)}'`);

    // return status and payload checking requested scope
    const blockNumber = json?.data?.input?.blockNumber;
    const msgSender = json?.data?.input?.msgSender;
    const payload = json?.data?.input?.payload;
    if (payload === undefined) {
      console.log(`No valid payload found in: ${JSON.stringify(json)}`)
      return [404, undefined];
    } else if (blockNumber != ethBlockNumber) {
      console.log(`Input outside requested scope: requested blockNumber '${ethBlockNumber}', but found '${blockNumber}'`);
      return [404, undefined];
    } else {
      console.log(`Returning payload: '${payload}'`);
      return [200, msgSender + payload.slice(2)];
    }
}

export default fetchInputBox;
