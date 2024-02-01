import { deployments, ethers, } from "hardhat";
import { EspressoRelay__factory } from "../src/types";
import { InputBox__factory } from "@cartesi/rollups";
import { expect } from "chai";

describe("EspressoRelay", function () {

  const DAPP_ADDRESS = "0x70ac08179605AF2D9e75782b8DEcDD3c22aA4D0C";
  const BLOCK_HEIGHT = 0;

  it("relayBlockHeight_success", async function () {
    // run deployments fixture and collect relevant deployed contracts info
    await deployments.fixture();
    const { InputBox, EspressoRelay } = await deployments.all();

    // build typed contract objects
    const [signer] = await ethers.getSigners();
    const inputBox = InputBox__factory.connect(InputBox.address, signer);
    const espressoRelay = EspressoRelay__factory.connect(EspressoRelay.address, signer);

    // relay block
    const tx = await espressoRelay.relayBlockHeight(DAPP_ADDRESS);
    const events = (await tx.wait()).events;

    // check if payload of input that was added is indeed the block hash
    const input = events?.map(event => {
      try {
        return inputBox.interface.parseLog(event);
      } catch (error) {}
    }).find(parsedEvent => parsedEvent?.name == "InputAdded")?.args?.[3];
    console.log(JSON.stringify(input));
    expect(input).to.eql(ethers.utils.hexZeroPad(ethers.utils.hexlify(BLOCK_HEIGHT), 32));
  });
});
