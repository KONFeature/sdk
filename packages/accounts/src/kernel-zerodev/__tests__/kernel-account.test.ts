import {
  encodeAbiParameters,
  type Hex,
  parseAbiParameters,
  encodeFunctionData,
  type Hash,
} from "viem";
import { polygonMumbai } from "viem/chains";
import { generatePrivateKey } from "viem/accounts";
import { MockSigner } from "./mocks/mock-signer.js";
import { LocalAccountSigner } from "@alchemy/aa-core";
import { TEST_ERC20Abi } from "../abis/Test_ERC20Abi.js";
import { ECDSAProvider } from "../validator-provider/index.js";

export const config = {
  privateKey: (process.env.PRIVATE_KEY as Hex) ?? generatePrivateKey(),
  ownerWallet: process.env.OWNER_WALLET,
  mockWallet: "0x48D4d3536cDe7A257087206870c6B6E76e3D4ff4",
  chain: polygonMumbai,
  rpcProvider: "https://mumbai-bundler.etherspot.io/",
  validatorAddress: "0x180D6465F921C7E0DEA0040107D342c87455fFF5" as Hex,
  accountFactoryAddress: "0x5D006d3880645ec6e254E18C1F879DAC9Dd71A39" as Hex,
  entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Hex,
  // Turn off all policies related to gas sponsorship for this projectId
  // To make all the testcases pass
  projectId: "8db3f9f0-f8d0-4c69-9bc6-5c522ee25844",
  projectIdWithGasSponsorship: "c73037ef-8c0b-48be-a581-1f3d161151d3",
};

// [TODO] - Organize instantiations and tests properly

describe("Kernel Account Tests", () => {
  //any wallet should work

  const owner = LocalAccountSigner.privateKeyToAccountSigner(config.privateKey);
  const mockOwner = new MockSigner();

  it(
    "getAddress returns valid counterfactual address",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });

      //contract already deployed
      expect(await ecdsaProvider.getAddress()).eql(
        "0x97925A25C6B8E8902D2c68A4fcd90421a701d2E8"
      );

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 3n,
          },
        },
      });

      //contract already deployed
      expect(await ecdsaProvider.getAddress()).eql(
        "0xA7b2c01A5AfBCf1FAB17aCf95D8367eCcFeEb845"
      );
    },
    { timeout: 100000 }
  );

  it(
    "getNonce returns valid nonce",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });

      const signer = ecdsaProvider.getAccount();

      //contract deployed but no transaction
      expect(await signer.getNonce()).eql(0n);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 3n,
          },
        },
      });

      const signer2 = ecdsaProvider.getAccount();

      expect(await signer2.getNonce()).eql(2n);
    },
    { timeout: 100000 }
  );

  it("encodeExecute returns valid encoded hash", async () => {
    let ecdsaProvider = await ECDSAProvider.init({
      projectId: config.projectId,
      owner: mockOwner,
    });
    const signer = ecdsaProvider.getAccount();
    expect(
      await signer.encodeExecute(
        "0xA7b2c01A5AfBCf1FAB17aCf95D8367eCcFeEb845",
        1n,
        "0x234"
      )
    ).eql(
      "0x51945447000000000000000000000000a7b2c01a5afbcf1fab17acf95d8367eccfeeb84500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022340000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("encodeExecuteDelegate returns valid encoded hash", async () => {
    let ecdsaProvider = await ECDSAProvider.init({
      projectId: config.projectId,
      owner: mockOwner,
    });
    const signer = ecdsaProvider.getAccount();
    expect(
      await signer.encodeExecuteDelegate(
        "0xA7b2c01A5AfBCf1FAB17aCf95D8367eCcFeEb845",
        1n,
        "0x234"
      )
    ).eql(
      "0x51945447000000000000000000000000a7b2c01a5afbcf1fab17acf95d8367eccfeeb84500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000022340000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it(
    "signWithEip6492 should correctly sign the message",
    async () => {
      const messageToBeSigned: Hex =
        "0xa70d0af2ebb03a44dcd0714a8724f622e3ab876d0aa312f0ee04823285d6fb1b";
      const magicBytes =
        "6492649264926492649264926492649264926492649264926492649264926492";
      const ownerSignedMessage =
        "0x4d61c5c27fb64b207cbf3bcf60d78e725659cff5f93db9a1316162117dff72aa631761619d93d4d97dfb761ba00b61f9274c6a4a76e494df644d968dd84ddcdb1c";
      const factoryCode =
        "0x296601cd000000000000000000000000180d6465f921c7e0dea0040107d342c87455fff50000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001448D4d3536cDe7A257087206870c6B6E76e3D4ff4000000000000000000000000";
      const signature =
        encodeAbiParameters(parseAbiParameters("address, bytes, bytes"), [
          config.accountFactoryAddress,
          factoryCode,
          ownerSignedMessage,
        ]) + magicBytes;

      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });

      expect(
        await ecdsaProvider.request({
          method: "personal_sign",
          params: [messageToBeSigned, await ecdsaProvider.getAddress()],
        })
      ).toBe(ownerSignedMessage);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 10n,
          },
        },
      });

      expect(
        await ecdsaProvider.request({
          method: "personal_sign",
          params: [messageToBeSigned, await ecdsaProvider.getAddress()],
        })
      ).toBe(signature);
    },
    { timeout: 100000 }
  );

  it("signMessage should correctly sign the message", async () => {
    const messageToBeSigned: Hex =
      "0xa70d0af2ebb03a44dcd0714a8724f622e3ab876d0aa312f0ee04823285d6fb1b";

    let ecdsaProvider = await ECDSAProvider.init({
      projectId: config.projectId,
      owner: mockOwner,
    });

    const signer = ecdsaProvider.getAccount();

    expect(await signer.signMessage(messageToBeSigned)).toBe(
      "0x4d61c5c27fb64b207cbf3bcf60d78e725659cff5f93db9a1316162117dff72aa631761619d93d4d97dfb761ba00b61f9274c6a4a76e494df644d968dd84ddcdb1c"
    );

    ecdsaProvider = await ECDSAProvider.init({
      projectId: config.projectId,
      owner: mockOwner,
      opts: {
        accountConfig: {
          index: 1000n,
        },
      },
    });

    const signer2 = ecdsaProvider.getAccount();

    expect(await signer2.signMessage(messageToBeSigned)).toBe(
      "0x4d61c5c27fb64b207cbf3bcf60d78e725659cff5f93db9a1316162117dff72aa631761619d93d4d97dfb761ba00b61f9274c6a4a76e494df644d968dd84ddcdb1c"
    );
  });

  // NOTE - this test case will fail if the gas fee is sponsored
  it(
    "sendUserOperation should fail to execute if gas fee not present",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        usePaymaster: false,
        opts: {
          accountConfig: {
            index: 1001n,
          },
        },
      });

      const result = ecdsaProvider.sendUserOperation({
        target: "0xA02CDdFa44B8C01b4257F54ac1c43F75801E8175",
        data: "0x",
      });

      await expect(result).rejects.toThrowError("AA23 reverted (or OOG)");
    },
    { timeout: 100000 }
  );

  //NOTE - this test case will only work if you
  // have deposited some matic balance for counterfactual address at entrypoint

  it(
    "sendUserOperation should execute properly",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        usePaymaster: false,
        opts: {
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      //to fix bug in old versions
      await ecdsaProvider.getAccount().getInitCode();
      const result = ecdsaProvider.sendUserOperation({
        target: "0xA02CDdFa44B8C01b4257F54ac1c43F75801E8175",
        data: "0x",
        value: 0n,
      });
      await expect(result).resolves.not.toThrowError();
      await ecdsaProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
    },
    { timeout: 100000 }
  );

  it(
    "sponsored sendUserOperation should execute properly",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectIdWithGasSponsorship,
        owner,
        opts: {
          accountConfig: {
            index: 1003n,
          },
          paymasterConfig: {
            policy: "VERIFYING_PAYMASTER",
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      //to fix bug in old versions
      await ecdsaProvider.getAccount().getInitCode();

      const result = ecdsaProvider.sendUserOperation({
        target: "0xA02CDdFa44B8C01b4257F54ac1c43F75801E8175",
        data: "0x",
        value: 0n,
      });
      await expect(result).resolves.not.toThrowError();
      await ecdsaProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
    },
    { timeout: 100000 }
  );

  //NOTE - this test case will only work if you
  // have deposited some Stackup TEST_ERC20 balance for counterfactual address at entrypoint

  it(
    "should pay for single transaction with ERC20 token",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        opts: {
          paymasterConfig: {
            policy: "TOKEN_PAYMASTER",
            gasToken: "TEST_ERC20",
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });
      //to fix bug in old versions
      await ecdsaProvider.getAccount().getInitCode();

      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await ecdsaProvider.getAddress(), 700000000000000000n],
        functionName: "mint",
      });
      const result = ecdsaProvider.sendUserOperation({
        target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
        data: mintData,
        value: 0n,
      });

      await expect(result).resolves.not.toThrowError();

      await ecdsaProvider.waitForUserOperationTransaction(
        (
          await result
        ).hash as Hash
      );
    },
    { timeout: 100000 }
  );

  //NOTE - this test case will only work if you
  // have deposited some Stackup TEST_ERC20 balance for counterfactual address at entrypoint

  it(
    "should pay for batch transaction with ERC20 token",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner,
        opts: {
          paymasterConfig: {
            policy: "TOKEN_PAYMASTER",
            gasToken: "TEST_ERC20",
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });

      //to fix bug in old versions
      await ecdsaProvider.getAccount().getInitCode();

      const mintData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await ecdsaProvider.getAddress(), 133700000000000000n],
        functionName: "mint",
      });
      const transferData = encodeFunctionData({
        abi: TEST_ERC20Abi,
        args: [await owner.getAddress(), 133700000000n],
        functionName: "transfer",
      });
      const result = ecdsaProvider.sendUserOperation([
        {
          target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
          data: mintData,
          value: 0n,
        },
        {
          target: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B",
          data: transferData,
          value: 0n,
        },
      ]);
      await expect(result).resolves.not.toThrowError();
    },
    { timeout: 100000 }
  );

  //non core functions
  it(
    "should correctly identify whether account is deployed",
    async () => {
      let ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
      });
      const signer = ecdsaProvider.getAccount();
      //contract already deployed
      expect(await signer.isAccountDeployed()).eql(true);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 3n,
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });
      const signer2 = ecdsaProvider.getAccount();

      //contract already deployed
      expect(await signer2.isAccountDeployed()).eql(true);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 4n,
          },
          providerConfig: {
            opts: {
              txMaxRetries: 10,
            },
          },
        },
      });
      const signer3 = ecdsaProvider.getAccount();

      //contract not deployed
      expect(await signer3.isAccountDeployed()).eql(false);

      ecdsaProvider = await ECDSAProvider.init({
        projectId: config.projectId,
        owner: mockOwner,
        opts: {
          accountConfig: {
            index: 5n,
          },
        },
      });

      const signer4 = ecdsaProvider.getAccount();
      //contract not deployed
      expect(await signer4.isAccountDeployed()).eql(false);
    },
    { timeout: 100000 }
  );
});
