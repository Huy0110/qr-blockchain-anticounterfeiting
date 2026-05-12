import { expect } from 'chai';
import hre from 'hardhat';
import { type ProductRegistry } from '../../typechain-types';

/**
 * E2E spec exercising the full ProductRegistry ABI from ethers.js. Mirrors
 * the Foundry unit + property tests but routes through the Hardhat provider
 * so we know the JS side (which the Coordination Hub uses) round-trips
 * correctly: ABI decoding, event parsing, custom-error decoding, etc.
 */
describe('ProductRegistry — Hardhat E2E', () => {
  let registry: ProductRegistry;
  let producer: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number];
  let consumer: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number];
  let outsider: Awaited<ReturnType<typeof hre.ethers.getSigners>>[number];

  const phi = hre.ethers.id('phi:e2e-default');
  const sid = hre.ethers.toUtf8Bytes('sid:e2e-default-secret-001');

  beforeEach(async () => {
    const signers = await hre.ethers.getSigners();
    const [s0, s1, s2] = signers;
    if (!s0 || !s1 || !s2) throw new Error('Hardhat must provide at least 3 signers');
    producer = s0;
    consumer = s1;
    outsider = s2;
    const Factory = await hre.ethers.getContractFactory('ProductRegistry', producer);
    registry = (await Factory.deploy()) as unknown as ProductRegistry;
    await registry.waitForDeployment();
  });

  it('registers a project, batches a hash, and redeems it round-trip', async () => {
    await expect(registry.connect(producer).registerProject(phi))
      .to.emit(registry, 'ProjectCreated')
      .withArgs(phi, producer.address);

    const h = hre.ethers.sha256(sid);
    await expect(registry.connect(producer).registerBatch(phi, [h]))
      .to.emit(registry, 'ProductsRegistered')
      .withArgs(phi, 1n);

    await expect(registry.connect(consumer).redeemProduct(phi, sid))
      .to.emit(registry, 'ProductRedeemed')
      .withArgs(phi, h, producer.address, (t: bigint) => t > 0n);

    const [exists, redeemed, recordedProducer] = await registry.verifyProduct(phi, h);
    expect(exists).to.equal(true);
    expect(redeemed).to.equal(true);
    expect(recordedProducer).to.equal(producer.address);
    expect(await registry.totalRedeemed()).to.equal(1n);
  });

  it('rejects a non-producer registerBatch with UnauthorizedProducer', async () => {
    await registry.connect(producer).registerProject(phi);
    const h = hre.ethers.sha256(sid);

    await expect(registry.connect(outsider).registerBatch(phi, [h]))
      .to.be.revertedWithCustomError(registry, 'UnauthorizedProducer')
      .withArgs(phi, outsider.address);
  });

  it('rejects a second redeem with ProductAlreadyRedeemed', async () => {
    await registry.connect(producer).registerProject(phi);
    const h = hre.ethers.sha256(sid);
    await registry.connect(producer).registerBatch(phi, [h]);
    await registry.connect(consumer).redeemProduct(phi, sid);

    await expect(registry.connect(consumer).redeemProduct(phi, sid))
      .to.be.revertedWithCustomError(registry, 'ProductAlreadyRedeemed')
      .withArgs(phi, h);
  });

  it('rejects N>500 batches with BatchTooLarge', async () => {
    await registry.connect(producer).registerProject(phi);
    const hashes = Array.from({ length: 501 }, (_, i) => hre.ethers.id(`sid-${i}`));

    await expect(registry.connect(producer).registerBatch(phi, hashes))
      .to.be.revertedWithCustomError(registry, 'BatchTooLarge')
      .withArgs(501n);
  });

  it('rejects redemption with a hash never registered (SR4 — hub cannot lie)', async () => {
    await registry.connect(producer).registerProject(phi);
    const realH = hre.ethers.sha256(sid);
    await registry.connect(producer).registerBatch(phi, [realH]);

    const fakeSid = hre.ethers.toUtf8Bytes('forged-sid');
    const fakeH = hre.ethers.sha256(fakeSid);

    await expect(registry.connect(consumer).redeemProduct(phi, fakeSid))
      .to.be.revertedWithCustomError(registry, 'ProductDoesNotExist')
      .withArgs(phi, fakeH);
  });
});
