import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Hook } from "../target/types/hook";

describe("hook", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Hook as Program<Hook>;

  it("Should load Hook program", async () => {
    // Test that the program loads correctly
    console.log("Hook program ID:", program.programId.toString());
    
    // TODO: Add proper tests for validate_transfer
    console.log("Available methods:", Object.keys(program.methods));
  });
});
