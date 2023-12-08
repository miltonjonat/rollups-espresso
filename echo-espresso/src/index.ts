import createClient from "openapi-fetch";
import { components, paths } from "./schema";

type AdvanceRequestData = components["schemas"]["Advance"];
type InspectRequestData = components["schemas"]["Inspect"];
type RequestHandlerResult = components["schemas"]["Finish"]["status"];
type RollupsRequest = components["schemas"]["RollupRequest"];
type InspectRequestHandler = (data: InspectRequestData) => Promise<void>;
type AdvanceRequestHandler = (
  data: AdvanceRequestData
) => Promise<RequestHandlerResult>;

const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollupServer);
const dehashingServer = process.env.DEHASHING_SERVER_URL;
console.log("Dehashing server url is " + dehashingServer);

const handleAdvance: AdvanceRequestHandler = async (data) => {
  try {
    // retrieve block hash from input
    const block = Buffer.from(data.payload.slice(2), "hex").toString();
    if (!block.startsWith("BLOCK~")) {
      console.log(`Input '${data.payload}' does not look like an Espresso block hash`);
      return "reject";
    }
    console.log(`Received block hash '${block}'`);

    // fetch block data from dehashing device
    const url = `${dehashingServer}/espresso/${block}`;
    console.log(`Fetching block data from '${url}'`);
    const fetched = await fetch(url);
    const blockData = await fetched.text() as `0x${string}`;
    console.log(`Fetched block data: '${blockData}'`);

    // post notice with block data
    const { POST } = createClient<paths>({ baseUrl: rollupServer });
    const { response } = await POST("/notice", {
      body: { payload: blockData }
    });
    const json = await response.json();
    console.log(`Notice emitted with status ${response.status} and body ${JSON.stringify(json)}`);    
    return "accept";

  } catch (error) {
    console.log(`Could not process advance request ${JSON.stringify(data)}`);
    console.log(JSON.stringify(error));
    return "reject";
  }
};

const handleInspect: InspectRequestHandler = async (data) => {
  console.log("Received inspect request data " + JSON.stringify(data));
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
          status = await handleAdvance(data.data as AdvanceRequestData);
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
