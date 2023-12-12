import "./App.css";
import InputEspresso from "./InputEspresso";
import Output from "./Output";
import React, { useState } from "react";
import { Center, Flex, Spacer } from "@chakra-ui/react";

// Simple App to present the Input field and produced Notices
function App() {
    const [accountIndex] = useState(0);

    return (
        <div className="App">
            <header className="App-header">
                <h1>Echo Espresso DApp</h1>
                <br/>
                <Flex>
                    <Center w="400px">
                        <InputEspresso accountIndex={accountIndex} />
                    </Center>
                    <Spacer />
                    <Center w="400px">
                        <Output />
                    </Center>
                </Flex>
            </header>
        </div>
    );
}

export default App;
