// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IProductRegistry — external surface of the QR-coded blockchain
///        anti-counterfeiting registry contract.
/// @notice Implements the on-chain primitives described in the paper
///         "QR-coded blockchain anti-counterfeiting for agricultural products"
///         §7.1, Algorithms 1–3.
/// @dev Consumers (Coordination Hub, dApp Portal, experiments) should depend
///      on this interface, not the concrete contract, so re-deploys are
///      transparent. ABI exposed via the qr-bc/shared package per
///      docs/architecture/inter-service-contract.md §1.
interface IProductRegistry {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted by registerProject. Reviewer-friendly: phi and producer
    ///         are both indexed so Polygonscan filters by either.
    /// @param phi Project identifier.
    /// @param producer Wallet address bound as the sole authorized batch writer.
    event ProjectCreated(bytes32 indexed phi, address indexed producer);

    /// @notice Emitted by registerBatch on success.
    /// @param phi Project identifier.
    /// @param count Number of product hashes added in this transaction.
    event ProductsRegistered(bytes32 indexed phi, uint256 count);

    /// @notice Emitted by redeemProduct on success. Enforces SR3
    ///         (non-repudiation): timestamp is block.timestamp of the
    ///         containing block, not a client-supplied value.
    /// @param phi Project identifier.
    /// @param h Product hash (sha256(sid)) that was redeemed.
    /// @param producer The producerAddress recorded for phi.
    /// @param timestamp block.timestamp at execution time.
    event ProductRedeemed(bytes32 indexed phi, bytes32 indexed h, address indexed producer, uint256 timestamp);

    // -------------------------------------------------------------------------
    // Producer-side mutators
    // -------------------------------------------------------------------------

    /// @notice Register a new project. Implements paper Algorithm 1 line 5.
    /// @dev Binds msg.sender as the sole producerAddress for phi. Reverts
    ///      with ProjectAlreadyExists if phi is already registered.
    /// @param phi Unique project identifier (typically a hash of producer
    ///             metadata + nonce; opaque to the contract).
    /// @custom:security Enforces SR1 (unforgeability) by binding the producer
    ///                  wallet immutably. Once set, producerAddress for phi
    ///                  cannot be transferred.
    function registerProject(bytes32 phi) external;

    /// @notice Register a batch of product hashes for an existing project.
    ///         Implements paper Algorithm 1 line 14.
    /// @dev Each hashes[i] must be sha256(sid_i) computed off-chain by the
    ///      producer. The contract stores them as bytes32; it does NOT recompute.
    ///      Reverts on EmptyBatch, BatchTooLarge (>500), ProjectDoesNotExist,
    ///      UnauthorizedProducer (caller != producer), or DuplicateProductHash
    ///      (any hashes[i] already present, including earlier in this batch).
    /// @param phi Project identifier; must already exist via registerProject.
    /// @param hashes Array of product hashes. 1 <= length <= MAX_BATCH_SIZE.
    /// @custom:security Whole-batch atomicity — duplicate detection reverts
    ///                  the entire transaction so partial writes never persist.
    function registerBatch(bytes32 phi, bytes32[] calldata hashes) external;

    // -------------------------------------------------------------------------
    // Consumer-side mutator
    // -------------------------------------------------------------------------

    /// @notice Redeem a product, marking its hash as consumed. Implements
    ///         paper Algorithm 3 phase 2.
    /// @dev The contract recomputes h := sha256(sid) internally. NEVER trust
    ///      a hash supplied by the caller. This is what enforces SR4 (trust
    ///      independence) — a malicious Coordination Hub cannot fabricate
    ///      AUTHENTIC outcomes by passing a doctored hash.
    ///      Per ADR-014 any address may call this; the system wallet pays gas
    ///      so consumers don't need to hold MATIC. Reverts on
    ///      ProjectDoesNotExist, ProductDoesNotExist (sha256(sid) ∉ phi),
    ///      or ProductAlreadyRedeemed (SR2).
    /// @param phi Project identifier.
    /// @param sid Secret identifier the consumer scanned. Hashed in-EVM
    ///             via the SHA-256 precompile (NOT keccak256) per paper §7.1.
    /// @custom:security Single state write + single event. No external calls
    ///                  → reentrancy-free by construction (EC-10).
    function redeemProduct(bytes32 phi, bytes calldata sid) external;

    // -------------------------------------------------------------------------
    // Read-only views
    // -------------------------------------------------------------------------

    /// @notice Returns the recorded state of a (phi, h) pair. Implements
    ///         paper Algorithm 3 phase 1 (cheap pre-check before redeem).
    /// @dev Never reverts. Returns the zero-tuple for absent entries so
    ///      front-ends can cheaply short-circuit invalid scans without a
    ///      try/catch.
    /// @param phi Project identifier.
    /// @param h Product hash (sha256(sid)) to look up.
    /// @return exists True iff h was registered under phi.
    /// @return redeemed True iff a successful redeemProduct has previously
    ///                   consumed this product.
    /// @return producer The producerAddress bound to phi (address(0) if
    ///                   project absent).
    function verifyProduct(bytes32 phi, bytes32 h) external view returns (bool exists, bool redeemed, address producer);

    /// @notice Cheap existence check for a project. Implements paper Algorithm 2.
    /// @dev Never reverts. Used by the public scan page to gate metadata loads.
    /// @param phi Project identifier.
    /// @return True iff phi has been registered via registerProject.
    function projectExists(bytes32 phi) external view returns (bool);

    /// @notice Total number of successful redeemProduct calls across all
    ///         projects. Required by the stateful invariant suite
    ///         (RegistryInvariants.t.sol) to assert monotonicity.
    /// @dev Auto-generated getter for the public storage variable.
    /// @return Cumulative redemption count.
    function totalRedeemed() external view returns (uint256);
}
