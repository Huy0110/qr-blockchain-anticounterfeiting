import { expect } from 'chai';
import hre from 'hardhat';
import { hashSid, generateSid } from '@qr-bc/shared';
import { type ProductRegistry } from '../../typechain-types';

/**
 * End-to-end cross-check that Phase 2 review §I-2 asked for.
 *
 * The unit-level test in packages/shared/test/hashing.test.ts compares
 * @qr-bc/shared's hashSid() against ethers.sha256(). This Hardhat-backed
 * test closes the loop by exercising the FULL register → redeem round-trip
 * with 100 random sids:
 *
 *   off-chain:   h = hashSid(sid)            // @qr-bc/shared, @noble/hashes
 *   on-chain:    products[phi][h] = ...      // registerBatch
 *   on-chain:    h' = sha256(sid)            // redeemProduct, EVM precompile 0x02
 *   on-chain:    require(products[phi][h']) // ProductDoesNotExist if h' != h
 *
 * Each successful redemption proves that the off-chain hashSid output and
 * the on-chain SHA-256 precompile output agreed for that specific sid. If
 * @qr-bc/shared's hash function ever drifted from canonical SHA-256
 * (replaced with keccak, used a different padding, etc.), every redeem in
 * this suite would revert with ProductDoesNotExist.
 *
 * Combined with Phase 1's contracts/test/unit/Hashing.t.sol (which uses
 * vm.expectCall(0x02, sid) to prove the contract actually invokes the
 * SHA-256 precompile), we have:
 *
 *   hashSid (off-chain @noble) === precompile 0x02 (on-chain) === canonical SHA-256
 */
describe('hashSid cross-check vs on-chain sha256 (Phase 2 I-2)', () => {
  let registry: ProductRegistry;
  let producer: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number];

  before(async () => {
    const [s0] = await hre.ethers.getSigners();
    if (!s0) throw new Error('Hardhat must provide at least 1 signer');
    producer = s0;
    const Factory = await hre.ethers.getContractFactory('ProductRegistry', producer);
    registry = (await Factory.deploy()) as unknown as ProductRegistry;
    await registry.waitForDeployment();
  });

  it('100 random sids: hashSid(sid) matches the EVM sha256 precompile', async function () {
    // 100 round-trips × ~60ms RPC latency = 6 sec. Bump default 2-sec timeout.
    this.timeout(60_000);

    const phi = hre.ethers.id('hashsid-crosscheck-phi');
    await (await registry.registerProject(phi)).wait();

    // Build 100 distinct (sid, h) pairs off-chain.
    const samples: Array<{ sid: Uint8Array; h: `0x${string}` }> = [];
    for (let i = 0; i < 100; i++) {
      const sidHex = generateSid(16 + (i % 17)); // length 16..32 bytes
      const sidBytes = hre.ethers.getBytes(sidHex);
      const h = hashSid(sidBytes);
      samples.push({ sid: sidBytes, h });
    }

    // Register all 100 hashes in one batch — also exercises registerBatch
    // at near-max real-world batch sizes for this property.
    await (
      await registry.registerBatch(
        phi,
        samples.map((s) => s.h),
      )
    ).wait();

    // Redeem each one. A redemption succeeds iff the on-chain sha256(sid)
    // matches the off-chain hashSid(sid) we registered.
    for (const [i, sample] of samples.entries()) {
      // If hashSid disagreed with the precompile, this would revert with
      // ProductDoesNotExist(phi, sha256(sid)).
      await (await registry.redeemProduct(phi, sample.sid)).wait();

      const [exists, redeemed] = await registry.verifyProduct(phi, sample.h);
      expect(exists, `sample ${i}: exists`).to.equal(true);
      expect(redeemed, `sample ${i}: redeemed`).to.equal(true);
    }

    expect(await registry.totalRedeemed()).to.equal(100n);
  });

  it('hashSid("") returns the canonical empty-input digest (EC-SP-1)', async () => {
    const phi = hre.ethers.id('hashsid-empty-phi');
    await (await registry.registerProject(phi)).wait();

    const empty = new Uint8Array(0);
    const h = hashSid(empty);
    expect(h).to.equal('0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    await (await registry.registerBatch(phi, [h])).wait();
    // Empty sid round-trip: on-chain sha256("") must produce the same h.
    await (await registry.redeemProduct(phi, empty)).wait();

    const [, redeemed] = await registry.verifyProduct(phi, h);
    expect(redeemed).to.equal(true);
  });
});
