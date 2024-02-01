// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {IInputBox} from "@cartesi/rollups/contracts/inputs/IInputBox.sol";


/// @title EspressoRelay
/// @notice Relays Espresso blocks as inputs to Cartesi DApps
contract EspressoRelay {

    IInputBox internal inputBox;

    /// @notice Constructor
    /// @param _inputBox input box to send inputs to Cartesi DApps
    constructor(IInputBox _inputBox) {
        inputBox = _inputBox;
    }

    /// @notice Relay the current Espresso block height as an input to a DApp's input box
    /// @dev Called by clients to securely relay Espresso info to Cartesi DApps
    /// @param _dapp The address of the DApp
    /// @return The hash of the input as returned by the Cartesi DApp's input box
    function relayBlockHeight(
        address _dapp
    ) external returns (bytes32)
    {
        // TODO: actually read the current Espresso block height from the HotShot contract
        uint256 _blockHeight = 0;

        // relay block hash
        return inputBox.addInput(_dapp, abi.encode(_blockHeight));
    }
}
