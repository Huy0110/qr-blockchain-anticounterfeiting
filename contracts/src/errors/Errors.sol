// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ProductRegistry custom errors
/// @notice Extracted into a dedicated file so tests, scripts, and the off-chain
///         shared package can import error selectors without pulling in the full
///         contract surface. Custom errors save gas vs. require-strings (Solidity
///         0.8.4+ best practice).
/// @dev Selectors are part of the public ABI and MUST NOT be reordered or
///      renamed without bumping the contract version (see ADR-008: immutable
///      contract).

/// @notice Thrown when registerProject is called for a phi that already exists.
/// @param phi Project identifier that collided.
error ProjectAlreadyExists(bytes32 phi);

/// @notice Thrown when an operation references a phi that has never been
///         registered via registerProject.
/// @param phi Missing project identifier.
error ProjectDoesNotExist(bytes32 phi);

/// @notice Thrown when registerBatch is called by an address other than the
///         project's bound producerAddress.
/// @param phi Project the caller attempted to write to.
/// @param caller The unauthorized msg.sender.
error UnauthorizedProducer(bytes32 phi, address caller);

/// @notice Thrown when registerBatch is called with hashes.length > MAX_BATCH_SIZE.
/// @param size Submitted batch size (always > 500).
error BatchTooLarge(uint256 size);

/// @notice Thrown when registerBatch is called with hashes.length == 0.
error EmptyBatch();

/// @notice Thrown when registerBatch contains a hash already recorded under
///         the same phi (either earlier in the same batch or in a prior batch).
/// @param phi Project identifier.
/// @param h The duplicate product hash (sha256(sid)).
error DuplicateProductHash(bytes32 phi, bytes32 h);

/// @notice Thrown when redeemProduct or verifyProduct references a (phi, h)
///         pair that was never registered via registerBatch.
/// @param phi Project identifier.
/// @param h Product hash computed as sha256(sid).
error ProductDoesNotExist(bytes32 phi, bytes32 h);

/// @notice Thrown when redeemProduct is called for a (phi, h) pair that has
///         already been redeemed by a prior transaction. Enforces SR2
///         (non-replayability — every product can be redeemed at most once).
/// @param phi Project identifier.
/// @param h Product hash that was previously redeemed.
error ProductAlreadyRedeemed(bytes32 phi, bytes32 h);
