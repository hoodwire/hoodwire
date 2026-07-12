import type { VendorAdapter } from "./types.js";
import { uniswap } from "./uniswap.js";
import { pleiades } from "./pleiades.js";
import { chainlink } from "./chainlink.js";
import { morpho } from "./morpho.js";
import { hoodwireCore } from "./core.js";

/** The in-process vendor registry. TODO(onchain): hydrate from VendorRegistry events. */
export const ADAPTERS: VendorAdapter[] = [uniswap, pleiades, chainlink, morpho, hoodwireCore];
