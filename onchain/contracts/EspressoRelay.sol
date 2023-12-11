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

    /// @notice Relay an Espresso block hash as an input to a DApp's input box
    /// @dev Called by clients to securely relay Espresso data to Cartesi DApps
    /// @param _dapp The address of the DApp
    /// @param _blockHash Espresso block hash given as a Tagged Base64 string using a "BLOCK~" prefix tag
    /// @return The hash of the input as returned by the Cartesi DApp's input box
    function relayBlock(
        address _dapp,
        bytes calldata _blockHash
    ) external returns (bytes32)
    {
        // TODO: perform gatekeeping to prevent relaying invalid data
        // - check if block is included in latest Espresso commitments, and revert if it's not

        // relay block hash
        return inputBox.addInput(_dapp, _blockHash);
    }
}
