import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";

describe("amm", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Amm as Program<Amm>;

  it("Should load AMM program", async () => {
    // Test that the program loads correctly
    console.log("AMM program ID:", program.programId.toString());
    
    // TODO: Add proper tests for:
    // - initialize_pool (requires proper token mint, vault setup)
    // - add_liquidity  
    // - swap_token_for_sol
    
    // For now, just verify the program is accessible
    console.log("Available methods:", Object.keys(program.methods));
  });
});
