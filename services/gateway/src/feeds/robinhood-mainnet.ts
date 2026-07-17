import type { Hex } from "viem";

/**
 * Chainlink price feed proxies for Robinhood Tokenized Equities.
 *
 * Chainlink publishes these on Robinhood Chain **mainnet** only — there are no testnet
 * feeds — so a testnet gateway reads them by pointing CHAINLINK_RPC_URL at mainnet. These
 * are the Standard proxies; the SVR variants are a different, MEV-protected integration and
 * are deliberately not used here.
 *
 * Chainlink maintains this list, so treat their page as the source of truth rather than
 * this file: https://docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood
 *
 * All quote USD with 8 decimals and follow us_equities_24/5 market hours, so prices stop
 * updating over the weekend and the adapter's staleness check will reject them then.
 */
export const ROBINHOOD_MAINNET_FEEDS: Record<string, Hex> = {
  tAAPL: "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0",
  tAMD: "0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72",
  tAMZN: "0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C",
  tASML: "0xB4106147E8cce40b7d46124090d373A71b70f87D",
  tBABA: "0x62Cc8F9b5f56a33c9C8A60c8B92779f523c4E984",
  tCLSK: "0x810c12D3a554Bc47fd39597Fe3b3AAC4941F50eF",
  tCOIN: "0xA3a468A452940B7D6b69991207B508c609a98Ef2",
  tCRCL: "0x6652eDf64bA3731C4F2D3ce821A0Fb1f1f6b482a",
  tCRWV: "0xe1b3aABCAFAd1c94708dc1367dcfF8Aa4407487C",
  tEWY: "0xEFdf54610B62A7753Ec30bDc380847c12D32e1D1",
  tGME: "0x27C71df6A64fB476468EdF256CF72c038baB5B67",
  tGOOGL: "0xF6f373a037c30F0e5010d854385cA89185AE638b",
  tINTC: "0x3f390C5C24628Ac7C489515402235FeAD71D1913",
  tIONQ: "0x22EfeC4919baf55F360E0EDee4AbEB26DE4971eb",
  tMETA: "0x7C38C00C30BEe9378381E7B6135d7283356D71b1",
  tMSFT: "0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E",
  tMSTR: "0x396118bdFB181e6240E74D243F266B061c0edc3D",
  tMU: "0x425EEFdCf05ed6526C3cE61Af99429A228a6d596",
  tNBIS: "0xE1D87B116Ba0fe898998f1D140339D1fA1E09705",
  tNVDA: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15",
  tORCL: "0x0e6a64a2B58A6693a531E6c555f3A5d042eEA844",
  tPLTR: "0x820ABedFF239034956B7A9d2F0a331f9F075eB4c",
  tQQQ: "0x80901d846d5D7B030F26B480776EE3b29374C2ae",
  tRGTI: "0x2A045cF1C49c61c166C036d2f06FA2D2d984f765",
  tRKLB: "0x045477BF65Aef6f4F2386ad0164579e48381CC74",
  tSLV: "0x209b73908e92Ae021826eD79609845451Ecba2ce",
  tSNDK: "0xfb133Fa4B7b385802B693a293606682Df47109A3",
  tSPCX: "0xB265810950ba6c5C0Ff821c9963014a56fD8Bffb",
  tSPY: "0x319724394D3A0e3669269846abE664Cd621f9f6A",
  tTSLA: "0x4A1166a659A55625345e9515b32adECea5547C38",
  tTSM: "0x874cF94aa8eC88Fd9560094dD065f2fB3E41Fc2F",
  tUSO: "0x75a9c76Ef439e2C7c2E5a34Ab105EcFe3766431c",
  USDG: "0x61B7e5650328764B076A108EFF5fa7282a1B9aD2",
};
