import React, { useEffect, useState } from "react";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers } from "ethers";
import { InputBox__factory } from "@cartesi/rollups";
import { EspressoRelay__factory } from "rollups-espresso";
import { Button, useToast, Card, CardBody, Stack, StackDivider, Box, Heading, Text, ButtonGroup, Input } from "@chakra-ui/react";

// OBS: change Echo DApp address as appropriate
const DAPP_ADDRESS = "0x70ac08179605AF2D9e75782b8DEcDD3c22aA4D0C";

const ESPRESSO_BASE_URL = "https://espresso.tspre.org";

// Standard configuration for contracts (deterministic deployment)
const INPUTBOX_ADDRESS = "0x59b22D57D4f067708AB0c00552767405926dc768";
const ESPRESSO_RELAY_ADDRESS = "0x1fA2e8678b9EAE6048E546Be1B34a943670CF1ab";

// Standard configuration for local development environment
const HARDHAT_DEFAULT_MNEMONIC =
    "test test test test test test test test test test test junk";
const HARDHAT_LOCALHOST_RPC_URL = "http://localhost:8545";

// This component presents an input field and adds its contents as an input for the Echo DApp
function InputEspresso() {
    const [file, setFile] = useState(undefined);
    const [fileData, setFileData] = useState(undefined);
    const [blockHash, setBlockHash] = useState(undefined);
    const [accountIndex] = useState(0);
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    function handleFileSelect(event) {
        if (event.target.files?.length > 0) {
            setFile(event.target.files[0]);
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);

        // read the input file's data
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            setFileData(new Uint8Array(e.target.result));
        };
        fileReader.readAsArrayBuffer(file);
    }

    useEffect(() => {
        const sendToEspresso = async () => {
            // TODO: query latest Espresso block
            // - curl https://espresso.tspre.org/status/latest_block_height

            // TODO: subscribe to Espresso websocket to listen to incoming blocks
            // - filter by [block > transaction_nmt > vm], and then check the payload

            // submit data to Espresso
            // - VM ID defined as the first 8 bytes of the address (max size accepted by Espresso)
            const vm = Number(DAPP_ADDRESS.slice(0,18));
            const payload = Array.from(fileData);
            const url = `${ESPRESSO_BASE_URL}/submit/submit`;
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vm, payload })
            })
            
            // FIXME: using a fixed block hash for now 
            setBlockHash("BLOCK~xaLAQAJNDHdcBTneFN347Ymr9dabkGhGvahY4HNsVL-a");
        };
        if (fileData) {
            sendToEspresso();
        }
    }, [fileData]);


    useEffect(() => {
        const sendToBaseLayer = async () => {
            // Start a connection
            const provider = new JsonRpcProvider(HARDHAT_LOCALHOST_RPC_URL);
            const signer = ethers.Wallet.fromMnemonic(
                HARDHAT_DEFAULT_MNEMONIC,
                `m/44'/60'/0'/0/${accountIndex}`
            ).connect(provider);

            // Instantiate the contracts
            const inputBox = InputBox__factory.connect(
                INPUTBOX_ADDRESS,
                signer
            );
            const espressoRelay = EspressoRelay__factory.connect(
                ESPRESSO_RELAY_ADDRESS,
                signer
            );

            // Send the transaction
            const tx = await espressoRelay.relayBlock(DAPP_ADDRESS, ethers.utils.toUtf8Bytes(blockHash));
            console.log(`transaction: ${tx.hash}`);
            toast({
                title: "Transaction Sent",
                description: "waiting for confirmation",
                status: "success",
                duration: 9000,
                isClosable: true,
                position: "top-left",
            });

            // Wait for confirmation
            console.log("waiting for confirmation...");
            const receipt = await tx.wait(1);

            // Search for the InputAdded event
            const event = receipt.events?.map((event) => {
                try {
                    return inputBox.interface.parseLog(event);
                } catch (error) {
                    return undefined;
                }
            }).find((parsedEvent) => parsedEvent?.name === "InputAdded");

            setLoading(false);
            toast({
                title: "Transaction Confirmed",
                description: `Input added => index: ${event?.args.inputIndex} `,
                status: "success",
                duration: 9000,
                isClosable: true,
                position: "top-left",
            });
            console.log(`Input added => index: ${event?.args.inputIndex} `);
        };
        if (blockHash) {
            sendToBaseLayer();
        }
    }, [blockHash, accountIndex, toast]);



    function EspressoBlock() {
        if (blockHash) {
            return (
                <Box>
                    <Heading size='xs' textTransform='uppercase'>
                    Espresso Block
                    </Heading>
                    <Text pt='2' fontSize='sm'>
                    { blockHash ? blockHash : "Please submit a file."}
                    </Text>
                </Box>
            );
        }
        else {
            return (
                <Box>
                    <Heading size='xs' textTransform='uppercase'>
                    Please submit a file
                    </Heading>
                </Box>
            );
        }
    }

    let submitProps = {
        isLoading: loading === true,
        isDisabled: file === undefined
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>
                    <p>Input</p>
                </label>
                <ButtonGroup p="2" gap='2'>
                    <Input p="1" onChange={handleFileSelect} type="file"/>
                    <Button {...submitProps} type="submit" colorScheme="yellow">
                        Submit
                    </Button>
                </ButtonGroup>
                <Card bgColor="orange">
                    <CardBody>
                        <Stack divider={<StackDivider />} spacing='4'>
                            <EspressoBlock/>
                        </Stack>                        
                    </CardBody>
                </Card>
            </form>
        </div>
    );
}

export default InputEspresso;
